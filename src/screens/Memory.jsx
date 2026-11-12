import React, { useEffect, useState } from 'react';
import { memoryApi } from '../api.js';

/* 他的记忆：核心 / 事件 / 碎片 */
export default function Memory({ onGo }) {
  const [data, setData] = useState({ core: [], events: [], fragments: [], candidates: [] });
  const [tab, setTab] = useState('core');
  const [err, setErr] = useState('');

  useEffect(() => {
    memoryApi
      .get()
      .then((r) => setData({ core: r.core || [], events: r.events || [], fragments: r.fragments || [], candidates: r.candidates || [] }))
      .catch((e) => setErr(e.message));
  }, []);

  const list =
    tab === 'core' ? data.core : tab === 'events' ? data.events : tab === 'fragments' ? data.fragments : data.candidates;

  async function removeCore(id) {
    await memoryApi.removeCore(id).catch(() => {});
    setData((d) => ({ ...d, core: d.core.filter((x) => x.id !== id) }));
  }

  async function accept(id, ok) {
    await memoryApi.candidate(id, ok).catch(() => {});
    setData((d) => ({ ...d, candidates: d.candidates.filter((x) => x.id !== id) }));
  }

  return (
    <div className="reader-shell">
      <div className="reader-top">
        <button className="back" onClick={() => onGo('aerie')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div className="reader-title">他记得的事</div>
      </div>

      <div className="memory-body">
        <div className="chips-row">
          {[
            ['core', `核心 ${data.core.length}`],
            ['events', `事件 ${data.events.length}`],
            ['fragments', `碎片 ${data.fragments.length}`],
            ['candidates', `待定 ${data.candidates.length}`]
          ].map(([id, label]) => (
            <span key={id} className={'chip' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}>
              {label}
            </span>
          ))}
        </div>

        {list.length === 0 && (
          <div className="hint-line">
            {tab === 'core' ? '还没有核心记忆。他记得的东西会慢慢攒出来。' : '这一类现在是空的。'}
          </div>
        )}

        {list.map((m) => (
          <div className="mem-row" key={m.id}>
            <div className="mem-text">{m.text || m.summary || m.title}</div>
            <div className="mem-meta">
              <span>{new Date(m.at || m.from || Date.now()).toLocaleDateString('zh-CN')}</span>
              {tab === 'core' && <button onClick={() => removeCore(m.id)}>删</button>}
              {tab === 'candidates' && (
                <>
                  <button onClick={() => accept(m.id, true)}>收下</button>
                  <button onClick={() => accept(m.id, false)}>不要</button>
                </>
              )}
            </div>
          </div>
        ))}

        {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      </div>
    </div>
  );
}
