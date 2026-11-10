import React, { useEffect, useRef, useState } from 'react';
import { api, conversations as convApi, stickersApi } from '../api.js';

const NAME = 'Elliott';

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function Avatar({ kind }) {
  const mine = kind === 'me';
  return (
    <div className={'avatar s26 ' + (mine ? 'a-bunny' : 'a-elliott')}>
      {mine ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="#7A6448" strokeWidth="1.1">
          <path d="M12 19.2c-3.6-2.6-6.2-5-6.2-7.8A3.6 3.6 0 0 1 12 8.9a3.6 3.6 0 0 1 6.2 2.5c0 2.8-2.6 5.2-6.2 7.8Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="#4C5C66" strokeWidth="1.1">
          <path d="M16.5 15.4A7.2 7.2 0 0 1 8.6 5.2a7.4 7.4 0 1 0 9.2 9.3c-.5.1-1 .2-1.3.9Z" />
        </svg>
      )}
    </div>
  );
}
/* 单条消息（含可折叠的思考链） */
function Message({ m, showAvatars }) {
  const [open, setOpen] = useState(false);
  const mine = m.role === 'user';
  const reasoning = m.meta?.reasoning;

  return (
    <>
      <div className={'msg ' + (mine ? 'me' : 'them')}>
        {showAvatars && !mine && <Avatar kind="them" />}
        <div className="bubble-stack">
          {m.meta?.sticker ? (
            <img className="sticker-msg" src={m.meta.sticker} alt="表情" />
          ) : (
            <div className="bubble">{m.content}</div>
          )}
          <div className="meta">
            {fmtTime(m.created_at)}
            {mine ? ' · 你' : m.model ? ` · ${m.model}${m.tokens ? ` · ${m.tokens} tokens` : ''}` : ''}
          </div>
        </div>
        {showAvatars && mine && <Avatar kind="me" />}
      </div>

      {reasoning && (
        <div className={'trace' + (open ? ' open' : '')}>
          <button className="trace-head" onClick={() => setOpen((v) => !v)}>
            <svg className="chev" viewBox="0 0 24 24">
              <path d="M9 6l6 6-6 6" />
            </svg>
            <span>{open ? '收起它的思考' : '看看它刚才在想什么'}</span>
          </button>
          <div className="trace-body">
            <div className="trace-line muted">{reasoning}</div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Chat({ onGo, showAvatars }) {
  const [messages, setMessages] = useState([]);
  const [convId, setConvId] = useState(null);
  const [convList, setConvList] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(null); // 'profile' | 'conversations' | null
  const [loaded, setLoaded] = useState(false);
  const [stickers, setStickers] = useState([]);
  const [stickerSheet, setStickerSheet] = useState(false);
  const listRef = useRef(null);

  /* 打开时加载历史 */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await convApi.list();
        if (!alive) return;
        setConvList(list);
        const latest = list.find((c) => c.title !== '第一个对话') || list[0];
        if (latest) {
          setConvId(latest.id);
          const history = await api.messages(latest.id);
          if (alive) setMessages(history);
        }
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    stickersApi.list().then(setStickers).catch(() => {});
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setError('');
    setSending(true);

    const optimistic = { id: 'tmp-' + Date.now(), role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);

    try {
      const res = await api.chat({ conversationId: convId, message: text });
      setConvId(res.conversationId);
      setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), res.userMessage, res.reply]);
      convApi.list().then(setConvList).catch(() => {});
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  async function sendSticker(url) {
    if (sending) return;
    setStickerSheet(false);
    setError('');
    setSending(true);
    const optimistic = { id: 'tmp-s-' + Date.now(), role: 'user', content: '[表情]', meta: { sticker: url }, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    try {
      const res = await api.chat({ conversationId: convId, message: '[表情]', sticker: url });
      setConvId(res.conversationId);
      setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), res.userMessage, res.reply]);
      convApi.list().then(setConvList).catch(() => {});
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  function newConversation() {
    setSheet(null);
    setConvId(null);
    setMessages([]);
    setError('');
  }

  async function openConversation(id) {
    setSheet(null);
    setError('');
    try {
      setConvId(id);
      setMessages(await api.messages(id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeConversation(id, e) {
    e.stopPropagation();
    try {
      await convApi.remove(id);
      setConvList((l) => l.filter((c) => c.id !== id));
      if (id === convId) {
        setConvId(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="chat-bg">
        <div className="bg-photo" />
        <div className="bg-dim" />
        <div className="bg-grain" />
      </div>

      <header className="chat-head">
        <button className="back" onClick={() => onGo('home')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div className="chat-who" onClick={() => setSheet('profile')}>
          <div className="avatar a-elliott s24">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4C5C66" strokeWidth="1.1">
              <path d="M16.5 15.4A7.2 7.2 0 0 1 8.6 5.2a7.4 7.4 0 1 0 9.2 9.3c-.5.1-1 .2-1.3.9Z" />
            </svg>
          </div>
          <div className="chat-center">
            <div className="chat-name">{NAME}</div>
            <div className="chat-sub">
              <i className="sdot" />
              {sending ? '正在想…' : '在窗边看雨 · 心情 安静'}
            </div>
          </div>
        </div>
        <div className="chat-actions">
          <button className="icon-btn" onClick={() => setSheet('conversations')} title="所有对话">
            <svg viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </button>
          <button className="icon-btn" onClick={newConversation} title="新对话">
            <svg viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </header>

      <div className="messages" ref={listRef}>
        {loaded && messages.length === 0 && !sending && (
          <div className="chat-empty">
            这是你们的第一句话。
            <br />
            下面随便说点什么吧。
          </div>
        )}

        {messages.map((m) => (
          <Message key={m.id} m={m} showAvatars={showAvatars} />
        ))}

        {sending && (
          <div className="msg them">
            <div className="bubble-stack">
              <div className="bubble">
                <span className="dots">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="sysline" style={{ color: '#b4553f' }}>
            {error}
          </div>
        )}
      </div>

      <div className="composer">
        <button className="sticker-btn" onClick={() => setStickerSheet(true)} title="表情包">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <circle cx="12" cy="12" r="8" />
            <circle cx="9.2" cy="10" r="0.9" fill="currentColor" stroke="none" />
            <circle cx="14.8" cy="10" r="0.9" fill="currentColor" stroke="none" />
            <path d="M8.6 14.2a4.2 4.2 0 0 0 6.8 0" />
          </svg>
        </button>
        <div className="field">
          <svg viewBox="0 0 24 24">
            <path d="M12 5.5v13M5.5 12h13" />
          </svg>
          <input
            value={input}
            placeholder="说点什么…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
        </div>
        <button className="send-btn" onClick={send} disabled={sending || !input.trim()}>
          <svg viewBox="0 0 24 24">
            <path d="M12 19V5M6 11l6-6 6 6" />
          </svg>
        </button>
      </div>

      {stickerSheet && (
        <div className="sheet-mask on" onClick={() => setStickerSheet(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <div className="sheet-title">表情包</div>
            {stickers.length === 0 ? (
              <div className="hint-line">还没有表情。去 设置 → 表情包 里导入几张吧。</div>
            ) : (
              <div className="sticker-picker">
                {stickers.map((s) => (
                  <button key={s.id} className="sticker-pick" onClick={() => sendSticker(s.url)}>
                    <img src={s.url} alt={s.name} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {sheet === 'conversations' && (
        <div className="sheet-mask on" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <div className="sheet-title">所有对话</div>
            <div className="conv-list">
              {convList.length === 0 && <div className="hint-line">还没有对话</div>}
              {convList.map((c) => (
                <div
                  key={c.id}
                  className={'conv-row' + (c.id === convId ? ' on' : '')}
                  onClick={() => openConversation(c.id)}
                >
                  <span className="conv-title">{c.title || '未命名'}</span>
                  <span className="conv-time">{fmtTime(c.updated_at)}</span>
                  <button className="conv-del" onClick={(e) => removeConversation(c.id, e)} title="删除">
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {sheet === 'profile' && (
        <div className="sheet-mask on" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <div className="av-row">
              <div className="avatar a-elliott s64">
                <svg viewBox="0 0 24 24" fill="none" stroke="#4C5C66" strokeWidth="1.1">
                  <path d="M16.5 15.4A7.2 7.2 0 0 1 8.6 5.2a7.4 7.4 0 1 0 9.2 9.3c-.5.1-1 .2-1.3.9Z" />
                </svg>
              </div>
              <div>
                <div className="nm">{NAME}</div>
                <div className="sb">在窗边看雨 · 心情 安静</div>
              </div>
            </div>
            <div className="list" style={{ padding: '6px 0 0' }}>
              <div className="list-item" onClick={() => onGo('settings')}>
                <span className="t">换模型</span>
                <span className="arrow">›</span>
              </div>
              {['查看资料', '更换头像', '查找聊天记录'].map((t) => (
                <div className="list-item" key={t}>
                  <span className="t">{t}</span>
                  <span className="arrow">›</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
