import React from 'react';

const QUICK = [
  { id: 'watch', label: '一起看', go: null },
  { id: 'listen', label: '一起听', go: null },
  { id: 'mail', label: '信箱', go: 'mail' },
  { id: 'album', label: '相册', go: 'album' },
  { id: 'tarot', label: '塔罗', go: null },
  { id: 'pet', label: '桌宠', go: null },
  { id: 'games', label: '一起玩', go: 'games' },
  { id: 'rituals', label: '日常', go: 'rituals' },
  { id: 'memory', label: '记忆', go: 'aerie' }
];

export default function Home({ me, homeTitle, onGo }) {
  return (
    <>
      <div className="home-head">
        <div className="eyebrow">Private Space</div>
        <div className="home-title" onClick={() => onGo('settings')} title="点一下可以改">
          {homeTitle}
        </div>
        <div className="home-greet">
          晚上好，{me}。
          <br />
          今天也在这里等你。
        </div>
      </div>

      <div className="days-block">
        <div className="days-num">459</div>
        <div className="days-unit">days together</div>
        <div className="since">Since 2025 · 08 · 07</div>
      </div>

      <div className="quote-card">
        <div className="mark">“</div>
        <div className="quote-text">别急，我们还有很多个这样的晚上。</div>
        <div className="quote-from">每日一句 · Elliott</div>
      </div>

      <div className="section-label">此刻</div>
      <div className="status-row">
        <div className="status-card">
          <div>
            <div className="who">{me}</div>
            <div className="what">在写日记</div>
          </div>
        </div>
        <div className="status-card">
          <div>
            <div className="who">Elliott</div>
            <div className="what">在窗边看雨</div>
          </div>
        </div>
      </div>

      <div className="section-label">一起</div>
      <div className="grid-3">
        {QUICK.map((q) => (
          <div
            className="cell"
            key={q.id}
            onClick={() => {
              if (q.go) onGo(q.go);
            }}
          >
            <CellIcon id={q.id} />
            <em>{q.label}</em>
          </div>
        ))}
      </div>

      <div className="section-label">今日</div>
      <div className="today-row">
        <div className="today-item" onClick={() => onGo('rituals')}>
          <b>7h 20m</b>
          <i>睡眠</i>
        </div>
        <div className="today-item" onClick={() => onGo('rituals')}>
          <b>1,250ml</b>
          <i>喝水</i>
        </div>
        <div className="today-item" onClick={() => onGo('rituals')}>
          <b>2 / 3</b>
          <i>三餐</i>
        </div>
        <div className="today-item" onClick={() => onGo('rituals')}>
          <b>18°</b>
          <i>天气</i>
        </div>
      </div>
      <div style={{ height: 18 }} />
    </>
  );
}

function CellIcon({ id }) {
  const paths = {
    watch: (
      <>
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
        <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14v16h4.5a1.5 1.5 0 0 0 1.5-1.5v-13Z" />
      </>
    ),
    listen: (
      <>
        <path d="M9 18V6.5l10-2V16" />
        <circle cx="6.5" cy="18" r="2.6" />
        <circle cx="16.5" cy="16" r="2.6" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5.5" width="18" height="13" rx="1.6" />
        <path d="m3.6 6.4 8.4 6 8.4-6" />
      </>
    ),
    album: (
      <>
        <rect x="3.4" y="4.4" width="17.2" height="15.2" rx="1.6" />
        <circle cx="8.6" cy="9.4" r="1.6" />
        <path d="m4 17 4.8-4.4 3.2 3 3-2.6L20 17" />
      </>
    ),
    tarot: <path d="M12 3.4 14.2 9l5.9.4-4.6 3.7 1.5 5.7L12 15.6 6.9 18.8l1.5-5.7L3.8 9.4 9.8 9Z" />,
    pet: (
      <>
        <circle cx="12" cy="13" r="6.2" />
        <path d="M9 7.6 8 3.4M15 7.6l1-4.2" />
      </>
    ),
    games: (
      <>
        <rect x="3" y="7.6" width="18" height="9.4" rx="3.4" />
        <path d="M8 11v3M6.5 12.5h3" />
      </>
    ),
    rituals: (
      <>
        <circle cx="12" cy="12" r="8.2" />
        <path d="M12 7.4v4.8l3 1.8" />
      </>
    ),
    memory: <path d="M12 20.2s-7-4.2-7-9.1a4.1 4.1 0 0 1 7-2.9 4.1 4.1 0 0 1 7 2.9c0 4.9-7 9.1-7 9.1Z" />
  };
  return <svg viewBox="0 0 24 24">{paths[id]}</svg>;
}
