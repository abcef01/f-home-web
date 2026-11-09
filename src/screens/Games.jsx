import React from 'react';

const GAMES = [
  ['◯', '五子棋', '7 局 4 胜'],
  ['✌', '石头剪刀布', '12 局 5 胜'],
  ['＃', '井字棋', '3 局 2 胜'],
  ['✎', '你画我猜', '还没玩过'],
  ['♡', '真心话大冒险', '今晚要不要来一局'],
  ['＋', '更多', '后面再加']
];

export default function Games({ onGo }) {
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
          <div className="set-sub">5 个小游戏 · 赢了有积分</div>
        </div>
      </div>

      <div className="game-grid">
        {GAMES.map(([icon, name, meta], i) => (
          <div className={'game-card' + (i === GAMES.length - 1 ? ' ghost' : '')} key={name}>
            <span className="g-ico">{icon}</span>
            <b>{name}</b>
            <i>{meta}</i>
          </div>
        ))}
      </div>

      <div className="section-label">4399</div>
      <div className="portal">
        <div className="p-title">4399 小游戏</div>
        <p className="p-desc">
          4399 的游戏是网页游戏，站点禁止被别的网站内嵌，所以不能直接放进来。可行的做法有两种：
        </p>
        <div className="p-item">① 在「一起玩」里做外链卡片，点了跳到 4399</div>
        <div className="p-item">② 挑几个经典小游戏自己复刻（用 Canvas 写）</div>
      </div>
      <div className="portal-foot">点下面的按钮会在新标签打开 4399 首页。</div>
      <div className="write-row" style={{ marginTop: 14 }}>
        <button
          className="write-btn"
          onClick={() => window.open('https://www.4399.com', '_blank', 'noopener')}
        >
          打开 4399
        </button>
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}
