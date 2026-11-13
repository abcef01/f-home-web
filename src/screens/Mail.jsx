import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const fmt = (t) =>
  new Date(t).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

export default function Mail({ taName = 'DeepSeek', onGo }) {
  const [letters, setLetters] = useState(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api
      .letters()
      .then((r) => setLetters(r.letters || []))
      .catch((e) => {
        setErr(e.message);
        setLetters([]);
      });
  }, []);

  return (
    <div className="reader-shell">
      <div className="reader-top">
        <button className="back" onClick={() => onGo('home')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div className="reader-title">信箱</div>
      </div>

      <div className="letters">
        {letters === null && <div className="hint-line">正在翻信箱…</div>}

        {letters !== null && letters.length === 0 && (
          <div className="hint-line">
            信箱是空的。
            <br />
            他还没写过。等他哪天想写了，会自己写。
          </div>
        )}

        {(letters || []).map((l) => (
          <div className="letter" key={l.id} onClick={() => setOpen(open === l.id ? null : l.id)}>
            <div className="l-top">
              <span className="l-who">{taName || 'DeepSeek'}</span>
              <span className="l-time">{fmt(l.at)}</span>
            </div>
            <div className="l-subj">{l.subject}</div>
            {open === l.id ? (
              <div className="l-body" style={{ whiteSpace: 'pre-wrap' }}>
                {l.body}
              </div>
            ) : (
              <div className="l-body">{String(l.body || '').slice(0, 80)}…</div>
            )}
            <div className="l-foot">{l.body ? l.body.replace(/\s/g, '').length + ' 字' : ''}</div>
          </div>
        ))}

        <div className="hint-line" style={{ marginTop: 18 }}>
          他会在想写的时候自己写一封，不会等你说。写完会出现在这里，也会通知你。
        </div>
        {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      </div>
    </div>
  );
}
