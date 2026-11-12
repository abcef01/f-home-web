import React, { useEffect, useState } from 'react';
import { nativeUsage, nativeNotifier } from '../lib/native.js';
import { api, auth, healthApi } from '../api.js';

const fmt = (ms) => {
  const m = Math.round(ms / 60000);
  if (m < 60) return m + ' 分钟';
  return Math.floor(m / 60) + ' 小时 ' + (m % 60) + ' 分';
};

export default function Phone({ onGo }) {
  const [ok, setOk] = useState(null);
  const [apps, setApps] = useState([]);
  const [err, setErr] = useState('');
  const [notify, setNotify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState(null);
  const [healthBusy, setHealthBusy] = useState(false);
  const [healthMsg, setHealthMsg] = useState('');

  const inApp = nativeUsage.available();

  useEffect(() => {
    healthApi.get().then((r) => setHealth(r.health)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!inApp) return;
    nativeUsage
      .status()
      .then((r) => setOk(!!r.granted))
      .catch(() => setOk(false));
    nativeNotifier.status().then((r) => setNotify(!!r.hasToken)).catch(() => {});
  }, [inApp]);

  async function load() {
    setBusy(true);
    setErr('');
    try {
      const r = await nativeUsage.today();
      setOk(!!r.granted);
      const list = (r.apps || []).sort((a, b) => b.ms - a.ms);
      setApps(list);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const total = apps.reduce((a, x) => a + x.ms, 0);

  return (
    <div className="reader-shell">
      <div className="reader-top">
        <button className="back" onClick={() => onGo('aerie')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div className="reader-title">手机</div>
      </div>

      <div className="phone-body">
        {!inApp && (
          <div className="hint-line">
            这一页只有装成 APK 才有数据。网页版读不到你手机里其他 App 的使用情况——那是系统权限，浏览器不给。
          </div>
        )}

        {inApp && (
          <>
            <div className="section-label">今天用了多久</div>

            {ok === false && (
              <div className="hint-line">
                还没开「使用情况访问」权限。
                <br />
                点下面的按钮 → 在系统列表里找到 Home → 打开。
              </div>
            )}

            <div className="phone-actions">
              <button className="reader-btn" onClick={() => nativeUsage.openSettings()}>
                去开权限
              </button>
              <button className="reader-btn" onClick={load} disabled={busy}>
                {busy ? '读取中…' : '读一次'}
              </button>
            </div>

            {total > 0 && <div className="phone-total">合计 {fmt(total)}</div>}

            {apps.map((a) => (
              <div className="phone-row" key={a.pkg}>
                <span className="phone-name">{a.label}</span>
                <span className="phone-ms">{fmt(a.ms)}</span>
                <div className="phone-bar">
                  <i style={{ width: Math.round((a.ms / (apps[0]?.ms || 1)) * 100) + '%' }} />
                </div>
              </div>
            ))}

            <div className="section-label" style={{ marginTop: 26 }}>手环</div>
        <div className="hint-line">
          手环的数据在华为运动健康里，App 读不到。办法是：打开华为运动健康 → 截屏 → 在这里选那张图。
        </div>

        {health && (
          <div className="phone-health">
            <div>
              <b>{health.steps ?? '—'}</b>
              <span>步</span>
            </div>
            <div>
              <b>{health.sleepHours ?? '—'}</b>
              <span>小时睡眠</span>
            </div>
            <div>
              <b>{health.restingHr ?? '—'}</b>
              <span>静息心率</span>
            </div>
            {health.at && (
              <div className="phone-health-time">
                {new Date(health.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 识别
              </div>
            )}
          </div>
        )}

        <div className="phone-actions">
          <label className="reader-btn">
            {healthBusy ? '读取中…' : '选一张截图'}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                setHealthBusy(true);
                setHealthMsg('');
                try {
                  const dataUrl = await new Promise((res, rej) => {
                    const r = new FileReader();
                    r.onload = () => res(String(r.result));
                    r.onerror = () => rej(new Error('读图失败'));
                    r.readAsDataURL(f);
                  });
                  const r = await healthApi.scan(dataUrl);
                  if (r.none) setHealthMsg('这张图里没认出健康数据');
                  else if (r.health) setHealth(r.health);
                  else if (r.error) setHealthMsg(r.error);
                } catch (err) {
                  setHealthMsg(err.message);
                } finally {
                  setHealthBusy(false);
                }
              }}
            />
          </label>
        </div>
        {healthMsg && <div className="hint-line">{healthMsg}</div>}

        <div className="section-label" style={{ marginTop: 26 }}>
              后台通知
            </div>
            <div className="hint-line">
              {notify ? '已开启：他有消息会在通知栏弹出（不用开软件）。' : '未开启。'}
            </div>
            <div className="phone-actions">
              <button
                className="reader-btn"
                onClick={async () => {
                  try {
                    await nativeNotifier.start(api.base, auth.token);
                    setNotify(true);
                  } catch (e) {
                    setErr(e.message);
                  }
                }}
              >
                开启
              </button>
              <button
                className="reader-btn"
                onClick={async () => {
                  await nativeNotifier.stop();
                  setNotify(false);
                }}
              >
                关闭
              </button>
            </div>
          </>
        )}

        {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      </div>
    </div>
  );
}
