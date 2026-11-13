import React, { useEffect, useRef, useState } from 'react';
import { momentsApi, unreadApi } from '../api.js';

export default function Moments({ onGo, me = 'Bunny', taName = 'Elliott' }) {
  const [list, setList] = useState([]);
  const [text, setText] = useState('');
  const [img, setImg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [commentFor, setCommentFor] = useState(null);
  const [commentText, setCommentText] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    momentsApi.list().then((r) => setList(r.moments || [])).catch((e) => setErr(e.message));
    unreadApi.markRead('moments').catch(() => {});
  }, []);

  function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return alert('图太大，8MB 内');
    const r = new FileReader();
    r.onload = () => setImg(String(r.result));
    r.readAsDataURL(f);
  }

  async function publish() {
    if (busy || (!text.trim() && !img)) return;
    setBusy(true);
    setErr('');
    try {
      const r = await momentsApi.post({ text, dataUrl: img || '' });
      setList((l) => [r.post, ...l]);
      setText('');
      setImg(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function like(id) {
    const r = await momentsApi.like(id).catch(() => null);
    if (r) setList((l) => l.map((x) => (x.id === id ? { ...x, likes: r.post.likes } : x)));
  }

  async function sendComment(id) {
    const t = commentText.trim();
    if (!t) return;
    const r = await momentsApi.comment(id, t).catch((e) => {
      setErr(e.message);
      return null;
    });
    if (r) {
      setList((l) => l.map((x) => (x.id === id ? { ...x, comments: r.post.comments } : x)));
      setCommentText('');
      setCommentFor(null);
    }
  }

  const fmt = (t) =>
    new Date(t).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }, { hour12: false });

  return (
    <div className="reader-shell">
      <div className="reader-top">
        <button className="back" onClick={() => onGo('home')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div className="reader-title">朋友圈</div>
      </div>

      <div className="moments-body">
        <div className="moment-compose">
          <textarea
            value={text}
            placeholder="说点什么…"
            onChange={(e) => setText(e.target.value)}
            className="moment-input"
          />
          {img && (
            <div className="moment-preview">
              <img src={img} alt="" />
              <button onClick={() => setImg(null)}>×</button>
            </div>
          )}
          <div className="moment-actions">
            <button className="reader-btn" onClick={() => fileRef.current?.click()}>
              图
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
            <button className="reader-btn" disabled={busy || (!text.trim() && !img)} onClick={publish}>
              {busy ? '…' : '发布'}
            </button>
          </div>
        </div>

        {list.length === 0 && <div className="hint-line">还没有人发过。你先来一条。</div>}

        {list.map((m) => (
          <div className="moment-card" key={m.id}>
            <div className="moment-head">
              <b>{m.who === 'me' ? me : (taName || 'Elliott')}</b>
              <span>{fmt(m.at)}</span>
            </div>
            {m.text && <div className="moment-text">{m.text}</div>}
            {m.imageUrl && <img className="moment-img" src={m.imageUrl} alt="" />}

            <div className="moment-foot">
              <button onClick={() => like(m.id)}>
                {m.likes?.includes('me') ? '♥' : '♡'} {m.likes?.length || 0}
              </button>
              <button onClick={() => { setCommentFor(commentFor === m.id ? null : m.id); setCommentText(''); }}>
                留言 {m.comments?.length || 0}
              </button>
              <button
                style={{ marginLeft: 'auto', opacity: 0.5 }}
                onClick={() => momentsApi.remove(m.id).then(() => setList((l) => l.filter((x) => x.id !== m.id)))}
              >
                删
              </button>
            </div>

            {(m.comments || []).map((c) => (
              <div className="moment-comment" key={c.id}>
                <b>{c.who === 'me' ? me : (taName || 'Elliott')}</b>
                <span>{c.text}</span>
              </div>
            ))}

            {commentFor === m.id && (
              <div className="fact-add" style={{ marginTop: 8 }}>
                <input
                  value={commentText}
                  placeholder="留一句"
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendComment(m.id)}
                />
                <button onClick={() => sendComment(m.id)} disabled={!commentText.trim()}>
                  保存
                </button>
              </div>
            )}
          </div>
        ))}

        {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      </div>
    </div>
  );
}
