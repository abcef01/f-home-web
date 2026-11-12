import React, { useEffect, useMemo, useState } from 'react';
import Quests from '../components/Quests.jsx';
import { ritualsApi, sleepApi, waterApi } from '../api.js';
import { daysSince, fmtToday } from '../lib/days.js';

const ITEMS = [
  { id: 'morning', label: '早安', hint: '醒来跟他说一声' },
  { id: 'night', label: '晚安', hint: '睡前收个尾' },
  { id: 'water', label: '喝水', hint: '今天喝够了吗' },
  { id: 'meal', label: '好好吃饭', hint: '三餐别糊弄' },
  { id: 'move', label: '动一动', hint: '站起来走两圈' }
];

const NAME = { morning: '早安', night: '晚安', water: '喝水', meal: '好好吃饭', move: '动一动' };
const dayKey = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
const hhmm = (ts) => (ts ? new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '');

export default function Rituals({ startDate, onGo }) {
  const [all, setAll] = useState({});
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [sleep, setSleep] = useState([]);
  const [guess, setGuess] = useState(null);
  const [hours, setHours] = useState('');
  const [wakings, setWakings] = useState(0);
  const [saved, setSaved] = useState(false);
  const [water, setWater] = useState({ goal: 2000, today: { total: 0, items: [] }, days: [] });
  const [ml, setMl] = useState('');

  useEffect(() => {
    ritualsApi.list().then((r) => setAll(r.rituals || {})).catch((e) => setErr(e.message));
    sleepApi
      .list()
      .then((r) => {
        setSleep(r.sleep || []);
        setGuess(r.guess || null);
        const today = (r.sleep || []).find((x) => x.date === dayKey());
        setHours(today?.hours ?? r.guess?.hours ?? '');
        setWakings(today?.wakings ?? 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    waterApi.get().then(setWater).catch(() => {});
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

  async function saveSleep() {
    setErr('');
    try {
      const r = await sleepApi.save({
        date: dayKey(),
        hours: hours === '' ? null : Number(hours),
        wakings: Number(wakings) || 0,
        bedAt: guess?.bedAt || null,
        wakeAt: guess?.wakeAt || null
      });
      setSleep(r.sleep || []);
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch (e) {
      setErr(e.message);
    }
  }

  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 60; i++) {
    const k = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
    const has = Object.values(all[k] || {}).some((v) => v === true || v?.done);
    if (has) streak++;
    else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }

  const history = useMemo(() => Object.keys(all).sort().reverse().slice(0, 7), [all]);

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
            {fmtToday()} · 在一起第 {daysSince(startDate)} 天{streak > 1 ? ` · 连续 ${streak} 天` : ''}
          </div>
        </div>
      </div>

      <div className="ritual-grid">
        {ITEMS.map((it) => {
          const v = today[it.id];
          const on = !!(v === true || v?.done);
          const at = v && v !== true ? v.at : null;
          return (
            <button
              key={it.id}
              className={'ritual-card' + (on ? ' on' : '')}
              onClick={() => toggle(it.id)}
              disabled={busy === it.id}
            >
              <div className="ritual-name">{it.label}</div>
              <div className="ritual-hint">
                {on ? `${at ? hhmm(at) : '已打卡'} · 点一下撤销` : it.hint}
              </div>
            </button>
          );
        })}
      </div>

      {/* 喝水 */}
      <div className="group">
        <div className="gl">喝水</div>
        <div className="meter">
          <div
            className="meter-bar"
            style={{ width: Math.min(100, Math.round((water.today.total / water.goal) * 100)) + '%' }}
          />
        </div>
        <div className="meter-foot">
          <span>{water.today.total} ml</span>
          <span>目标 {water.goal} ml</span>
        </div>

        <div className="sleep-row">
          <input
            className="water-input"
            value={ml}
            inputMode="numeric"
            placeholder="多少 ml"
            onChange={(e) => setMl(e.target.value)}
          />
          <button
            className="reader-btn"
            onClick={async () => {
              const n = Number(ml);
              if (!n) return;
              try {
                setWater(await waterApi.add(n));
                setMl('');
              } catch (e) {
                setErr(e.message);
              }
            }}
          >
            记一笔
          </button>
          {[200, 300, 500].map((n) => (
            <button
              key={n}
              className="reader-btn"
              onClick={async () => {
                try {
                  setWater(await waterApi.add(n));
                } catch (e) {
                  setErr(e.message);
                }
              }}
            >
              +{n}
            </button>
          ))}
        </div>

        {water.today.items.length > 0 && (
          <div className="water-today">
            {[...water.today.items].reverse().map((x) => (
              <span key={x.id} className="water-chip">
                {new Date(x.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} · {x.ml} ml
                <button onClick={async () => setWater(await waterApi.remove(x.id))}>×</button>
              </span>
            ))}
          </div>
        )}

        {water.days.length > 1 && (
          <div className="sleep-history">
            {water.days.slice(1, 8).map((d) => (
              <div className="sleep-line" key={d.date}>
                <span>{d.date.slice(5)}</span>
                <span>{d.total} ml</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 睡眠 */}
      <div className="group">
        <div className="gl">睡眠</div>
        <div className="hint-line">
          {guess
            ? `从打卡推的：昨晚 ${hhmm(guess.bedAt)} 睡 → 今天 ${hhmm(guess.wakeAt)} 醒，${guess.hours} 小时`
            : '先打「晚安」和「早安」，这里会自动算出时长；也可以自己填。'}
        </div>
        <div className="sleep-row">
          <label>
            睡了
            <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="小时" inputMode="decimal" />
            小时
          </label>
          <label>
            醒了
            <input value={wakings} onChange={(e) => setWakings(e.target.value)} inputMode="numeric" />
            次
          </label>
          <button className="reader-btn" onClick={saveSleep}>
            {saved ? '存了' : '保存'}
          </button>
        </div>
        {sleep.length > 0 && (
          <div className="sleep-history">
            {sleep.slice(-5).reverse().map((s) => (
              <div className="sleep-line" key={s.date}>
                <span>{s.date}</span>
                <span>{s.hours ?? '?'} 小时</span>
                <span>醒 {s.wakings} 次</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 打卡历史 */}
      <div className="group">
        <div className="gl">最近七天</div>
        <div className="ritual-history">
          {history.length === 0 && <div className="hint-line">还没有记录。</div>}
          {history.map((day) => {
            const items = Object.entries(all[day] || {}).filter(([, v]) => v === true || v?.done);
            return (
              <div className="ritual-day" key={day}>
                <span className="rd-date">{day.slice(5)}</span>
                <span className="rd-items">
                  {items.length
                    ? items.map(([k, v]) => `${NAME[k] || k}${v !== true && v.at ? ' ' + hhmm(v.at) : ''}`).join('　')
                    : '没打卡'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="group">
        <div className="gl">约定与积分</div>
        <Quests />
      </div>

      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      <div style={{ height: 30 }} />
    </>
  );
}
