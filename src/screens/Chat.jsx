import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const NAME = 'Elliott';

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function Chat({ glass, me, patMe, patTa, onGo }) {
  const [messages, setMessages] = useState([]);
  const [convId, setConvId] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [traceOpen, setTraceOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const listRef = useRef(null);

  /* 打开时加载最近一个会话的历史 */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const conversations = await api.conversations();
        if (!alive) return;
        if (conversations.length > 0) {
          const latest = conversations[0];
          setConvId(latest.id);
          const history = await api.messages(latest.id);
          if (alive) setMessages(history);
        }
      } catch (e) {
        if (alive) setError('连不上后端：' + e.message);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
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

    /* 先把用户这条乐观地放到界面上 */
    const optimistic = { id: 'tmp-' + Date.now(), role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);

    try {
      const res = await api.chat({ conversationId: convId, message: text });
      setConvId(res.conversationId);
      setMessages((m) => [
        ...m.filter((x) => x.id !== optimistic.id),
        res.userMessage,
        res.reply
      ]);
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

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
        <div className="chat-who" onClick={() => setSheet(true)}>
          <div className="avatar a-elliott s24">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4C5C66" strokeWidth="1.1">
              <path d="M16.5 15.4A7.2 7.2 0 0 1 8.6 5.2a7.4 7.4 0 1 0 9.2 9.3c-.5.1-1 .2-1.3.9Z" />
            </svg>
          </div>
          <div className="chat-center">
            <div className="chat-name">{NAME}</div>
            <div className="chat-sub">
              <i className="sdot" />
              在窗边看雨 · 心情 安静
            </div>
          </div>
        </div>
        <div className="chat-actions">
          <svg viewBox="0 0 24 24">
            <path d="M6.5 3.5h3l1.4 3.6-2 1.4a11 11 0 0 0 5.6 5.6l1.4-2 3.6 1.4v3c0 1-.8 1.8-1.8 1.7C10.6 17.6 6.4 13.4 5.8 5.3c-.1-1 .7-1.8 1.7-1.8Z" />
          </svg>
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="12" cy="18" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </div>
      </header>

      <div className="messages" ref={listRef}>
        {loaded && messages.length === 0 && (
          <div className="chat-empty">
            这是你们的第一句话。
            <br />
            下面随便说点什么吧。
          </div>
        )}

        {messages.map((m) => (
          <div className={'msg ' + (m.role === 'user' ? 'me' : 'them')} key={m.id}>
            <div className="bubble-stack">
              <div className="bubble">{m.content}</div>
              <div className="meta">
                {fmtTime(m.created_at)}
                {m.role === 'user'
                  ? ' · 你'
                  : m.model
                    ? ` · ${m.model}${m.tokens ? ` · ${m.tokens} tokens` : ''}`
                    : ''}
              </div>
            </div>
          </div>
        ))}

        {lastAssistant?.meta?.reasoning && (
          <div className={'trace' + (traceOpen ? ' open' : '')}>
            <button className="trace-head" onClick={() => setTraceOpen((v) => !v)}>
              <svg className="chev" viewBox="0 0 24 24">
                <path d="M9 6l6 6-6 6" />
              </svg>
              <span>看看它刚才在想什么</span>
            </button>
            <div className="trace-body">
              <div className="trace-line muted">{lastAssistant.meta.reasoning}</div>
            </div>
          </div>
        )}

        {sending && (
          <div className="msg them">
            <div className="bubble-stack">
              <div className="typing">
                <i />
                <i />
                <i />
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

      {sheet && (
        <div className="sheet-mask on" onClick={() => setSheet(false)}>
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
      {glass || me || patMe || patTa ? null : null}
    </>
  );
}
