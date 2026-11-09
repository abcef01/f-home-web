import React from 'react';

export default function Album({ onGo }) {
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
          <div className="set-sub">328 张 · 其中 96 张来自聊天</div>
        </div>
      </div>

      <div className="chips-row">
        <span className="chip on">全部</span>
        <span className="chip">我放进去的</span>
        <span className="chip">聊天里的</span>
      </div>

      <div className="tiles">
        {['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9'].map((t) => (
          <div className={'tile ' + t} key={t} />
        ))}
      </div>
      <div className="hint-line">第五章接上 Supabase 存储后，这里就是真实的照片墙。</div>
    </>
  );
}
