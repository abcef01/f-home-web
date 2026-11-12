import React, { useEffect, useRef, useState } from 'react';
import { readingsApi } from '../api.js';

/* 解读：一次性的长文，不是对话框 */
export default function Reading({ onGo }) {
  const [kind, setKind] = useState('tarot');
  const [input, setInput] = useState('');
  const [question, setQuestion] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [history, setHistory] = useState([]);
  const boxRef = useRef(null);

  useEffect(() => {
    readingsApi.list().then((r) => setHistory(r.readings || [])).catch(() => {});
  }, []);

  async function run() {
    if (busy) return;
    if (input.trim().length < 4) return setErr('把牌或者梦写进来');
    setBusy(true);
    setErr('');
    setText('');
    try {
      const r = await readingsApi.make(kind, input, question);
      setText(r.reading.text);
      setHistory(r.readings || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setInput('');
    setQuestion('');
    setText('');
    setErr('');
  }

  return (
    <div className="reader-shell">
      <div className="reader-top">
        <button className="back" onClick={() => onGo('home')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div className="reader-title">解读</div>
      </div>

      <div className="reading-body">
        {!text && (
          <>
            <div className="chips-row" style={{ justifyContent: 'center' }}>
              {[
                ['tarot', '塔罗'],
                ['dream', '梦']
              ].map(([id, label]) => (
                <span key={id} className={'chip' + (kind === id ? ' on' : '')} onClick={() => setKind(id)}>
                  {label}
                </span>
              ))}
            </div>

            <textarea
              className="reading-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                kind === 'tarot'
                  ? '把你抽到的牌写进来（例如：过去—逆位星币五，现在—宝剑侍从，未来—圣杯二），顺手写点牌阵也行。'
                  : '把梦写进来。想到哪写到哪，细节比顺序重要。'
              }
            />

            <input
              className="reading-q"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="想问什么？（可以不填）"
            />

            <button className="reading-btn" onClick={run} disabled={busy}>
              {busy ? '他在读…' : '解读'}
            </button>

            {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}

            {history.length > 0 && (
              <div className="reading-history">
                <div className="gl">以前解的</div>
                {history.slice(0, 6).map((h) => (
                  <div className="reading-row" key={h.id} onClick={() => setText(h.text)}>
                    <span>{h.kind === 'dream' ? '梦' : '塔罗'}</span>
                    <b>{h.question || h.input.slice(0, 18)}</b>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {text && (
          <div className="reading-result">
            <div className="reading-text" ref={boxRef}>
              {text}
            </div>
            <div className="reading-actions">
              <button className="reader-btn" onClick={() => setText('')}>
                再解一个
              </button>
              <button className="reader-btn" onClick={reset}>
                清空
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
