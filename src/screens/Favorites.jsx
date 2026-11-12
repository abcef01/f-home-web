import React, { useEffect, useState } from 'react';
import { favoritesApi } from '../api.js';

export default function Favorites({ onGo }) {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('all');
  const [err, setErr] = useState('');

  useEffect(() => {
    favoritesApi.list().then((r) => setList(r.favorites || [])).catch((e) => setErr(e.message));
  }, []);

  const shown = list.filter((f) => (filter === 'all' ? true : f.type === filter));

  function fmt(t) {
    return new Date(t).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="reader-shell">
      <div className="reader-top">
        <button className="back" onClick={() => onGo('aerie')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div className="reader-title">收藏</div>
      </div>

      <div className="favorites-body">
        <div className="chips-row">
          {[['all', '全部'], ['image', '图片'], ['text', '文字']].map(([id, label]) => (
            <span key={id} className={'chip' + (filter === id ? ' on' : '')} onClick={() => setFilter(id)}>
              {label}
            </span>
          ))}
        </div>

        {shown.length === 0 && <div className="hint-line">还没有收藏。聊天里长按一条消息，或者点图片上的心。</div>}

        {shown.map((f) => (
          <div className="fav-card" key={f.id}>
            <div className="fav-head">
              <span>{f.who === 'me' ? '我收的' : '他收的'}</span>
              <span>{fmt(f.at)}</span>
              <button onClick={() => favoritesApi.remove(f.id).then(() => setList((l) => l.filter((x) => x.id !== f.id)))}>×</button>
            </div>
            {f.type === 'image' && f.imageUrl && <img src={f.imageUrl} alt="" className="fav-img" />}
            {f.text && <div className="fav-text">{f.text}</div>}
            {f.from && <div className="fav-from">来自 {f.from}</div>}
          </div>
        ))}

        {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      </div>
    </div>
  );
}
