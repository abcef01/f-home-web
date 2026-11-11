import React, { useEffect, useMemo, useState } from 'react';
import { diaryApi } from '../api.js';
import AvatarImg from '../components/AvatarImg.jsx';

const WEEK_WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const dayKey = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
const monthKey = (d = new Date()) => dayKey(d).slice(0, 7);

function shiftMonth(m, delta) {
  const [y, mm] = m.split('-').map(Number);
  const d = new Date(Date.UTC(y, mm - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function Diary({ me, avatars = {}, showAvatars = true, onGo }) {
  const [view, setView] = useState('month');
  const [month, setMonth] = useState(monthKey());
  const [data, setData] = useState({ byDay: {}, entries: [] });
  const [selected, setSelected] = useState(dayKey());
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [reply, setReply] = useState('');
  const [replyFor, setReplyFor] = useState(null);
  const [noteText, setNoteText] = useState('');

  const today = dayKey();

  useEffect(() => {
    diaryApi
      .month(month)
      .then((r) => setData(r))
      .catch((e) => setErr(e.message));
  }, [month]);

  const [y, m] = month.split('-').map(Number);
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const dayEntries = data.byDay?.[selected] || [];

  const monthName = useMemo(
    () => new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    [y, m]
  );

  async function write() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await diaryApi.write({ text: t, date: selected });
      setData(r);
      setText('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function comment(id) {
    const t = reply.trim();
    if (!t || busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await diaryApi.comment(id, t);
      setData(r);
      setReply('');
      setReplyFor(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function postNote() {
    const t = noteText.trim();
    if (!t || busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await diaryApi.note(t);
      setData(r);
      setNoteText('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function like(id) {
    try {
      const r = await diaryApi.like(id);
      setData((d) => ({
        ...d,
        entries: d.entries.map((x) => (x.id === r.entry.id ? r.entry : x)),
        byDay: Object.fromEntries(
          Object.entries(d.byDay).map(([k, list]) => [k, list.map((x) => (x.id === r.entry.id ? r.entry : x))])
        )
      }));
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <>
      <div className="diary-head">
        <div className="diary-title">Diary</div>
        <div className="diary-month">{monthName}</div>
      </div>

      <div className="chips-row">
        {[
          ['month', '月'],
          ['notes', '纸条'],
          ['all', '全部']
        ].map(([id, label]) => (
          <span key={id} className={'chip' + (view === id ? ' on' : '')} onClick={() => setView(id)}>
            {label}
          </span>
        ))}
        <span className="chip" style={{ marginLeft: 'auto' }} onClick={() => setMonth(shiftMonth(month, -1))}>
          ‹
        </span>
        <span className="chip" onClick={() => setMonth(monthKey())}>
          今
        </span>
        <span className="chip" onClick={() => setMonth(shiftMonth(month, 1))}>
          ›
        </span>
      </div>

      {view === 'month' && (
        <div className="cal-month on">
          {WEEK_WD.map((w) => (
            <div className="cal-wd" key={w}>
              {w}
            </div>
          ))}
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={'b' + i} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const key = `${month}-${String(d).padStart(2, '0')}`;
            const has = (data.byDay?.[key] || []).length > 0;
            const cls = 'cal-cell' + (has ? ' has' : '') + (key === today ? ' today' : '') + (key === selected ? ' sel' : '');
            return (
              <div key={key} className={cls} onClick={() => setSelected(key)}>
                {d}
              </div>
            );
          })}
        </div>
      )}

      {view === 'notes' && (
        <div className="notes-wall">
          {(data.notes || []).length === 0 && <div className="hint-line">墙上还是空的。写一条吧。</div>}
          {[...(data.notes || [])].reverse().map((n) => (
            <div className={"note-card " + (n.who === 'me' ? 'me' : 'ta')} key={n.id}>
              <div className="note-text">{n.text}</div>
              <div className="note-meta">
                {n.who === 'me' ? me : 'Elliott'} · {new Date(n.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'all' && (
        <div className="fish-out" style={{ maxHeight: 320 }}>
          {data.entries?.length
            ? [...data.entries].reverse().map((e) => (
                <div key={e.id} style={{ marginBottom: 8 }}>
                  {e.date}　{e.who === 'me' ? '你' : '他'}：{e.text}
                </div>
              ))
            : '这个月还是空白的。'}
        </div>
      )}

      {view === 'notes' && (
        <div className="fact-add" style={{ marginTop: 12 }}>
          <input
            value={noteText}
            placeholder="碎碎念，一两句就好"
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && postNote()}
          />
          <button onClick={postNote} disabled={busy || !noteText.trim()}>
            {busy ? '…' : '贴上去'}
          </button>
        </div>
      )}
      {view !== 'notes' && (
      <>

      <div className="diary-day">
        <div className="diary-day-head">{selected === today ? '今天' : selected}</div>

        {dayEntries.length === 0 && <div className="hint-line">这一页还没写字。</div>}

        {dayEntries.map((e) => (
          <div className={'duo-card' + (e.who === 'me' ? '' : ' ta')} key={e.id}>
            <div className="top">
              {showAvatars && (
                <AvatarImg who={e.who === 'me' ? 'me' : 'ta'} url={e.who === 'me' ? avatars.me : avatars.ta} size="s20" />
              )}
              <div className="nm">{e.who === 'me' ? me : 'Elliott'}</div>
            </div>
            <div className="story">{e.text}</div>
            <div className="foot">
              <span>{new Date(e.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
              <span onClick={() => like(e.id)} style={{ cursor: 'pointer' }}>
                {e.likes?.includes('me') ? '♥' : '♡'} {e.likes?.length || 0}
              </span>
            {(e.comments || []).length > 0 && (
              <div className="diary-comments">
                {e.comments.map((c, i) => (
                  <div key={i} className="diary-comment">
                    <b>{c.who === 'me' ? me : 'Elliott'}</b>
                    <span>{c.text}</span>
                  </div>
                ))}
              </div>
            )}
            {replyFor === e.id ? (
              <div className="fact-add" style={{ marginTop: 6 }}>
                <input
                  value={reply}
                  placeholder="留一句"
                  onChange={(ev) => setReply(ev.target.value)}
                  onKeyDown={(ev) => ev.key === 'Enter' && comment(e.id)}
                />
                <button onClick={() => comment(e.id)} disabled={busy || !reply.trim()}>
                  保存
                </button>
              </div>
            ) : (
              <div className="diary-comment-add" onClick={() => { setReplyFor(e.id); setReply(''); }}>
                留言
              </div>
            )}
            </div>
          </div>
        ))}

        <div className="fact-add" style={{ marginTop: 8 }}>
          <input
            value={text}
            placeholder={`在 ${selected} 这一页写点什么`}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && write()}
          />
          <button onClick={write} disabled={busy || !text.trim()}>
            {busy ? '…' : '保存'}
          </button>
        </div>
        {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      </div>
      </>
      )}

      <div style={{ height: 24 }} />
    </>
  );
}
