import React, { useEffect, useState } from 'react';
import Quests from '../components/Quests.jsx';
import { ritualsApi } from '../api.js';
import { daysSince, fmtToday } from '../lib/days.js';

const ITEMS = [
  { id: 'morning', label: '早安', hint: '醒来跟他说一声' },
  { id: 'night', label: '晚安', hint: '睡前收个尾' },
  { id: 'water', label: '喝水', hint: '今天喝够了吗' },
  { id: 'meal', label: '好好吃饭', hint: '三餐别糊弄' },
  { id: 'move', label: '动一动', hint: '站起来走两圈' }
];

const dayKey = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });

export default function Rituals({ startDate, onGo }) {
  const [all, setAll] = useState({});
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    ritualsApi
      .list()
      .then((r) => setAll(r.rituals || {}))
      .catch((e) => setErr(e.message));
  }, []);

  const today = all[dayKey()] || {};

  async function toggle(id) {
    if (busy) return;
    setBusy(id);
    setErr('');
    try {
      const r = await ritualsApi.check(id);
      setAll(r.rituals || {});
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  }

  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 60; i++) {
    const k = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
    const has = Object.values(all[k] || {}).some(Boolean);
    if (has) streak++;
    else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }

  return (
    <>
      <div className="page-head">
        <button className="back" onClick={() => onGo('home')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div>
          <div className="set-title">日常</div>
          <div className="set-sub">
            {fmtToday()} · 在一起第 {daysSince(startDate)} 天{streak > 1 ? ` · 连续打卡 ${streak} 天` : ''}
          </div>
        </div>
      </div>

      <div className="ritual-grid">
        {ITEMS.map((it) => {
          const on = !!today[it.id];
          return (
            <button
              key={it.id}
              className={'ritual-card' + (on ? ' on' : '')}
              onClick={() => toggle(it.id)}
              disabled={busy === it.id}
            >
              <div className="ritual-name">{it.label}</div>
              <div className="ritual-hint">{on ? '已打卡 · 点一下撤销' : it.hint}</div>
            </button>
          );
        })}
      </div>

      <div className="hint-line">打卡是给他看的——他知道你今天早起了、喝够水了、说过晚安。</div>

      <div className="group">
        <div className="gl">约定与积分</div>
        <Quests />
      </div>

      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      <div style={{ height: 30 }} />
    </>
  );
}
