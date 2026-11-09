import React, { useEffect, useRef, useState } from 'react';
import { api, chatStream, conversations as convApi } from '../api.js';

const NAME = 'Elliott';

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function Chat({ onGo }) {
  const [messages, setMessages] = useState([]);
  const [convId, setConvId] = useState(null);
  const [convList, setConvList] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [thinking, setThinking] = useState('');
  const [error, setError] = useState('');
  const [traceOpen, setTraceOpen] = useState(false);
  const [sheet, setSheet] = useState(null); // 'profile' | 'conversations' | null
  const [loaded, setLoaded] = useState(false);
  const listRef = useRef(null);
  const abortRef = useRef(null);

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
  }, [messages, streamText, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setError('');
    setSending(true);
    setStreamText('');
    setThinking('');

    const optimistic = { id: 'tmp-' + Date.now(), role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);

    let acc = '';
    let reason = '';
    let finalReply = null;

    try {
      await chatStream({
        conversationId: convId,
        message: text,
        onMeta: (ev) => {
          setConvId(ev.conversationId);
          setMessages((m) => m.map((x) => (x.id === optimistic.id ? ev.userMessage : x)));
        },
        onReasoning: (t) => {
          reason += t;
          setThinking(reason);
        },
        onDelta: (t) => {
          acc += t;
          setStreamText(acc);
        },
        onDone: (ev) => {
          finalReply = { ...ev.reply, meta: { ...(ev.reply?.meta || {}), reasoning: reason || null } };
        }
      });

      if (finalReply) {
        setMessages((m) => [...m, finalReply]);
        convApi.list().then(setConvList).catch(() => {});
      }
    } catch (e) {
      setError(e.message);
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally {
      setSending(false);
      setStreamText('');
      setThinking('');
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
    setSending(false);
    if (streamText) {
      setMessages((m) => [
        ...m,
        { id: 'stopped-' + Date.now(), role: 'assistant', content: streamText + '（已打断）', created_at: new Date().toISOString() }
      ]);
    }
    setStreamText('');
    setThinking('');
  }

  async function newConversation() {
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

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const thinkingLive = sending && thinking && !streamText;

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
              {sending ? (thinkingLive ? '正在想…' : '正在说…') : '在窗边看雨 · 心情 安静'}
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
          <div className={'msg ' + (m.role === 'user' ? 'me' : 'them')} key={m.id}>
            <div className="bubble-stack">
              <div className="bubble">{m.content}</div>
              <div className="meta">
                {fmtTime(m.created_at)}
                {m.role === 'user' ? ' · 你' : m.model ? ` · ${m.model}${m.tokens ? ` · ${m.tokens} tokens` : ''}` : ''}
              </div>
            </div>
          </div>
        ))}

        {/* 流式输出中 */}
        {sending && (
          <div className="msg them">
            <div className="bubble-stack">
              {streamText ? (
                <div className="bubble streaming">{streamText}</div>
              ) : (
                <div className="bubble">
                  <span className="dots">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              )}
              {thinking && !streamText && (
                <div className="meta thinking-hint">在想：{thinking.slice(-40)}</div>
              )}
            </div>
          </div>
        )}

        {/* 上一轮的思考链 */}
        {!sending && lastAssistant?.meta?.reasoning && (
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
        {sending ? (
          <button className="send-btn stop" onClick={stop} title="停">
            <svg viewBox="0 0 24 24">
              <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
        ) : (
          <button className="send-btn" onClick={send} disabled={!input.trim()}>
            <svg viewBox="0 0 24 24">
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
          </button>
        )}
      </div>

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
