import React, { useEffect, useRef, useState } from 'react';
import { fishingApi, api } from '../api.js';

const GAMES = [
  ['◯', '五子棋', '7 局 4 胜'],
  ['✌', '石头剪刀布', '12 局 5 胜'],
  ['＃', '井字棋', '3 局 2 胜'],
  ['✎', '你画我猜', '还没玩过'],
  ['♡', '真心话大冒险', '今晚要不要来一局']
];

/* 钓鱼：引擎在后端，这里是看得见的水面 */
function FishingPanel({ onTell }) {
  const [status, setStatus] = useState('');
  const [output, setOutput] = useState('');
  const [line, setLine] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const boxRef = useRef(null);

  useEffect(() => {
    fishingApi
      .state()
      .then((r) => setStatus(r.status))
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [output]);

  async function run(cmd) {
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await fishingApi.cmd(cmd);
      setOutput(r.output);
      setStatus(r.status);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fish-panel">
      <div className="fish-status">{status.split('\n')[0]}</div>

      <div className="fish-out" ref={boxRef}>
        {output || '水面很安静。抛一竿试试。'}
      </div>

      <div className="fish-actions">
        <button onClick={() => run('cast')} disabled={busy}>抛一竿</button>
        <button onClick={() => run('cast 10')} disabled={busy}>连钓十竿</button>
        <button onClick={() => run('inventory')} disabled={busy}>渔篓</button>
        <button onClick={() => run('enc')} disabled={busy}>图鉴</button>
        <button onClick={() => run('shop')} disabled={busy}>商店</button>
        <button onClick={() => run('sell all')} disabled={busy}>卖光</button>
      </div>

      <div className="fish-input">
        <input
          value={line}
          placeholder="也可以打指令：goto reed_river / buy glow_bait 3 / look 银梭鱼"
          onChange={(e) => setLine(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && line.trim()) {
              run(line.trim());
              setLine('');
            }
          }}
        />
        <button
          onClick={() => {
            if (line.trim()) {
              run(line.trim());
              setLine('');
            }
          }}
          disabled={busy || !line.trim()}
        >
          执行
        </button>
      </div>

      {output && (
        <button className="fish-tell" onClick={() => onTell && onTell(output)} disabled={busy}>
          让它说一句
        </button>
      )}
      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
    </div>
  );
}

export default function Games({ onGo }) {
  const [fishOpen, setFishOpen] = useState(false);

  /* 把渔获丢进聊天，让它接一句 */
  async function tell(out) {
    const brief = out.split('\n').slice(0, 4).join('\n').slice(0, 200);
    await api.chat({ message: `（我刚钓完鱼，结果是这样：\n${brief}\n）` }).catch(() => {});
  }

  return (
    <>
      <div className="page-head">
        <button className="back" onClick={() => onGo('home')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div>
          <div className="set-title">一起玩</div>
          <div className="set-sub">5 个小游戏 · 还有一池鱼</div>
        </div>
      </div>

      <div className="game-grid">
        <div className={'game-card' + (fishOpen ? ' open' : '')} onClick={() => setFishOpen((v) => !v)}>
          <span className="g-ico">🎣</span>
          <div>
            <div className="g-name">钓鱼</div>
            <div className="g-meta">{fishOpen ? '收起' : '81 种鱼 · 11 个钓点'}</div>
          </div>
        </div>

        {GAMES.map(([icon, name, meta]) => (
          <div className="game-card" key={name}>
            <span className="g-ico">{icon}</span>
            <div>
              <div className="g-name">{name}</div>
              <div className="g-meta">{meta}</div>
            </div>
          </div>
        ))}
      </div>

      {fishOpen && <FishingPanel onTell={tell} />}

      <div className="section-label">4399</div>
      <div className="portal">
        <div className="p-title">4399 小游戏</div>
        <p className="p-desc">4399 禁止被别的网站内嵌，所以只能外链过去，不能直接放进来。</p>
      </div>
      <div className="write-row" style={{ marginTop: 14 }}>
        <button className="write-btn" onClick={() => window.open('https://www.4399.com', '_blank', 'noopener')}>
          打开 4399
        </button>
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}
