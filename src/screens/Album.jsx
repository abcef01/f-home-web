import React, { useEffect, useState } from 'react';
import { albumApi } from '../api.js';

export default function Album({ onGo }) {
  const [data, setData] = useState({ total: 0, days: [] });
  const [filter, setFilter] = useState('all');
  const [err, setErr] = useState('');
  const [big, setBig] = useState(null);

  useEffect(() => {
    albumApi.list().then(setData).catch((e) => setErr(e.message));
  }, []);

  const days = data.days
    .map((d) => ({
      ...d,
      photos: d.photos.filter((p) => (filter === 'all' ? true : filter === 'me' ? p.from === 'me' : p.from === 'ta'))
    }))
    .filter((d) => d.photos.length);

  return (
    <>
      <div className="page-head">
        <button className="back" onClick={() => onGo('home')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div>
          <div className="set-title">相册</div>
          <div className="set-sub">{data.total} 张 · 都来自聊天</div>
        </div>
      </div>

      <div className="chips-row">
        {[
          ['all', '全部'],
          ['me', '我发的'],
          ['ta', '他发的']
        ].map(([id, label]) => (
          <span key={id} className={'chip' + (filter === id ? ' on' : '')} onClick={() => setFilter(id)}>
            {label}
          </span>
        ))}
      </div>

      {days.length === 0 && <div className="hint-line">还没有照片。聊天里发过的图会出现在这里。</div>}

      {days.map((d) => (
        <div key={d.date} className="album-day">
          <div className="section-label">{d.date}</div>
          <div className="album-grid">
            {d.photos.map((p) => (
              <div key={p.id} className={'album-tile' + (p.isSticker ? ' sticker' : '')} onClick={() => setBig(p.url)}>
                <img src={p.url} alt="" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {big && (
        <div className="album-big" onClick={() => setBig(null)}>
          <img src={big} alt="" />
        </div>
      )}

      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      <div style={{ height: 24 }} />
    </>
  );
}
