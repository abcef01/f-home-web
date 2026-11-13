import React from 'react';
import { daysSince, fmtSince } from '../lib/days.js';
import { moodColor } from '../lib/mood.js';
import { dailyApi, statusApi } from '../api.js';

const QUICK = [
  { id: 'study', label: '陪我学', go: 'study' },
  { id: 'listen', label: '一起听', go: 'chat', signal: 'bunny-open-song' },
  { id: 'read', label: '书架', go: 'read' },
  { id: 'mail', label: '信箱', go: 'mail' },
  { id: 'album', label: '相册', go: 'album' },
  { id: 'moments', label: '朋友圈', go: 'moments' },
  { id: 'reading', label: '解读', go: 'reading' },
  { id: 'games', label: '一起玩', go: 'games' },
  { id: 'rituals', label: '日常', go: 'rituals' },
  { id: 'memory', label: '记忆', go: 'aerie' }
];

export default function Home({ me, homeTitle, startDate = '2025-02-01', onGo, unread = {}, taName = 'Elliott' }) {
  const [daily, setDaily] = React.useState(null);
  const [status, setStatus] = React.useState({ me: null, ta: null });
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  React.useEffect(() => {
    dailyApi.get(me).then(setDaily).catch(() => {});
  }, [me]);

  React.useEffect(() => {
    statusApi.get().then(setStatus).catch(() => {});
  }, []);

  async function saveStatus() {
    const t = draft.trim();
    if (!t) return setEditing(false);
    const r = await statusApi.set(t).catch(() => null);
    if (r) setStatus((s) => ({ ...s, me: r.me }));
    setEditing(false);
    setDraft('');
  }
  const days = daysSince(startDate);
  const dotMap = {
    read: !!unread?.books,
    moments: !!unread?.moments,
    rituals: !!unread?.quests
  };
  return (
    <>
      <div className="home-head">
        <div className="eyebrow">Private Space</div>
        <div className="home-title" onClick={() => onGo('settings')} title="点一下可以改">
          {homeTitle}
        </div>
        <div className="home-greet">{(daily && daily.greeting) || '今天也在这里。'}</div>
      </div>

      <div className="days-block">
        <div className="days-num">{days}</div>
        <div className="days-unit">days together</div>
        <div className="since">Since {fmtSince(startDate)}</div>
      </div>

      <div className="quote-card">
        <div className="mark">“</div>
        <div className="quote-text">{(daily && daily.quote) || '别急，我们还有很多个这样的晚上。'}</div>
        <div className="quote-from">每日一句 · Elliott</div>
      </div>

      <div className="section-label">此刻</div>
      <div className="status-row">
        <div className="status-card" onClick={() => { setEditing(true); setDraft(status.me?.text || ''); }}>
          <div>
            <div className="who">{me}</div>
            <div className="what">{status.me?.text || '点一下设置状态'}</div>
          </div>
        </div>
        <div className="status-card" style={{ borderColor: moodColor(status.ta) }}>
          <div>
            <div className="who">
              <i className="sdot" style={{ background: moodColor(status.ta) }} />
              {taName || 'Elliott'}
            </div>
            <div className="what">{status.ta?.mood || ''}</div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="fact-add" style={{ marginTop: 8 }}>
          <input
            value={draft}
            autoFocus
            placeholder="在干什么？（比如：刚洗完澡）"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveStatus()}
          />
          <button onClick={saveStatus}>保存</button>
        </div>
      )}
      
      <div className="section-label">入口</div>
      <div className="quick-grid">
        {QUICK.map((q) => (
          <button className="quick-cell" key={q.id} onClick={() => onGo(q.go)}>
            <CellIcon id={q.id} />
            <span>{q.label}</span>
            {dotMap[q.id] && <i className="dot" />}
          </button>
        ))}
      </div>

      <div style={{ height: 18 }} />
    </>
  );
}

function CellIcon({ id }) {
  if (id === 'read') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1">
        <path d="M4 5.5h6.5a1.5 1.5 0 011.5 1.5v12a2 2 0 00-2-2H4z" />
        <path d="M20 5.5h-6.5A1.5 1.5 0 0012 7v12a2 2 0 012-2h6z" />
      </svg>
    );
  }
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
