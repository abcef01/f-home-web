import React, { useEffect, useRef, useState } from 'react';
import { studyApi } from '../api.js';

const fmt = (sec) => {
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  return h ? `${h} 小时 ${m % 60} 分` : `${m} 分钟`;
};

const clock = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
};

export default function Study({ onGo }) {
  const [name, setName] = useState('');
  const [session, setSession] = useState(null);
  const [sec, setSec] = useState(0);
  const [line, setLine] = useState('');
  const [data, setData] = useState({ sessions: [], stats: null });
  const [err, setErr] = useState('');
  const startedAt = useRef(0);
  const tickRef = useRef(null);
  const cheerRef = useRef(null);

  useEffect(() => {
    studyApi.get().then(setData).catch((e) => setErr(e.message));
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (cheerRef.current) clearInterval(cheerRef.current);
    };
  }, []);

  async function start() {
    if (!name.trim()) return setErr('先写一下在学什么');
    setErr('');
    try {
      const r = await studyApi.start(name.trim());
      setSession(r.session);
      startedAt.current = Date.now();
      setSec(0);
      setLine('');

      tickRef.current = setInterval(() => setSec(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);

      /* 每 8 分钟他说一句 */
      cheerRef.current = setInterval(async () => {
        const mins = Math.round((Date.now() - startedAt.current) / 60000);
        const res = await studyApi.encourage(name.trim(), mins).catch(() => null);
        if (res?.line) setLine(res.line);
      }, 8 * 60 * 1000);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function stop() {
    if (!session) return;
    if (tickRef.current) clearInterval(tickRef.current);
    if (cheerRef.current) clearInterval(cheerRef.current);

    const seconds = Math.floor((Date.now() - startedAt.current) / 1000);
    try {
      const r = await studyApi.end(session.id, seconds);
      setData((d) => ({ ...d, stats: r.stats }));
      const fresh = await studyApi.get();
      setData(fresh);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSession(null);
      setSec(0);
      setLine('');
    }
  }

  if (session) {
    return (
      <div className="reader-shell study-running">
        <div className="study-center">
          <div className="study-name">{session.name}</div>
          <div className="study-clock">{clock(sec)}</div>
          {line && <div className="study-line">“{line}”</div>}
          <button className="study-btn" onClick={stop}>
            结束
          </button>
        </div>
      </div>
    );
  }

  const st = data.stats;

  return (
    <div className="reader-shell">
      <div className="reader-top">
        <button className="back" onClick={() => onGo('home')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div className="reader-title">陪我学</div>
      </div>

      <div className="study-body">
        <input
          className="reading-q"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="在学什么？（比如：英语听力、算法题）"
        />
        <button className="study-btn" onClick={start}>
          开始
        </button>

        {st && (
          <div className="study-stats">
            <div className="study-stat">
              <b>{Math.round(st.today / 60)}</b>
              <span>今天 · 分钟</span>
            </div>
            <div className="study-stat">
              <b>{Math.round(st.week / 60)}</b>
              <span>这周</span>
            </div>
            <div className="study-stat">
              <b>{Math.round(st.month / 60)}</b>
              <span>这个月</span>
            </div>
            <div className="study-stat">
              <b>{Math.round(st.year / 60)}</b>
              <span>今年</span>
            </div>
          </div>
        )}

        {st?.recent?.length > 0 && (
          <div className="study-history">
            <div className="gl">最近</div>
            {st.recent.slice(0, 10).map((s) => (
              <div className="study-row" key={s.id}>
                <span>{new Date(s.start).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
                <b>{s.name}</b>
                <span>{fmt(s.seconds)}</span>
              </div>
            ))}
          </div>
        )}

        {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      </div>
    </div>
  );
}
