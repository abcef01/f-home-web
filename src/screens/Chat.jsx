import React, { useEffect, useRef, useState } from 'react';
import { api, stickersApi, watchApi, heartbeatApi } from '../api.js';
import AvatarImg from '../components/AvatarImg.jsx';

const NAME = 'Elliott';

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* 把积温的数值翻译成一句人话 */
function moodLine(s) {
  if (!s) return '在窗边看雨 · 心情 安静';
  const { connection = 0, valence = 0, arousal = 0 } = s;
  const mood = valence > 0.3 ? '心情不错' : valence < -0.3 ? '有点低落' : '心情平常';
  if (connection >= 0.5) return `很想你 · ${mood}`;
  if (connection >= 0.35) return `有点想你 · ${mood}`;
  if (arousal > 0.4) return `静不下来 · ${mood}`;
  return `在窗边看雨 · ${mood}`;
}

/* 单条消息（含可折叠的思考链） */
function Message({ m, showAvatars, avatars = {}, watching = false, denied, onAllowWatch, onDenyWatch }) {
  const [open, setOpen] = useState(false);
  const mine = m.role === 'user';
  const reasoning = m.meta?.reasoning;

  return (
    <>
      <div className={'msg ' + (mine ? 'me' : 'them')}>
        {showAvatars && !mine && <AvatarImg who="ta" url={avatars.ta} size="s26" />}
        <div className="bubble-stack">
          {m.content && m.content !== '[表情]' && <div className="bubble">{m.content}</div>}
          {m.meta?.sticker && <img className="sticker-msg" src={m.meta.sticker} alt="表情" />}
          {m.meta?.surf && (
            <div className="surf-card">
              <div className="surf-quote">{m.meta.surf.title}</div>
              <div className="surf-from">
                {m.meta.surf.source}
                {m.meta.surf.url && (
                  <>
                    {' · '}
                    <a href={m.meta.surf.url} target="_blank" rel="noreferrer">
                      看看
                    </a>
                  </>
                )}
              </div>
            </div>
          )}
          {m.meta?.watchRequest && !watching && !denied?.has(m.id) && (
            <div className="watch-ask">
              <span>他想看看你在做什么</span>
              <div className="watch-ask-actions">
                <button className="watch-yes" onClick={() => onAllowWatch?.()}>让他看</button>
                <button className="watch-no" onClick={() => onDenyWatch?.(m.id)}>先不要</button>
              </div>
            </div>
          )}
          <div className="meta">
            {fmtTime(m.created_at)}
            {mine ? ' · 你' : m.model ? ` · ${m.model}${m.tokens ? ` · ${m.tokens} tokens` : ''}` : ''}
          </div>
        </div>
        {showAvatars && mine && <AvatarImg who="me" url={avatars.me} size="s26" />}
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

export default function Chat({ onGo, showAvatars, avatars = {}, watchAllowed = false, watchEvery = 45 }) {
  const [messages, setMessages] = useState([]);
  const [convId, setConvId] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(null); // 'profile' | 'conversations' | null
  const [loaded, setLoaded] = useState(false);
  const [stickers, setStickers] = useState([]);
  const [stickerSheet, setStickerSheet] = useState(false);
  const [watching, setWatching] = useState(false);
  const [watchErr, setWatchErr] = useState('');
  const [denied, setDenied] = useState(new Set());
  const [mood, setMood] = useState(null);
  const shareRef = useRef(null);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  /* 打开时加载历史 */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const conv = await api.currentConversation();
        if (!alive) return;
        if (conv) {
          setConvId(conv.id);
          const history = await api.messages(conv.id);
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

  /* 心跳：每 90 秒问一次后端「他现在想说话吗」 */
  useEffect(() => {
    let alive = true;
    const beat = async () => {
      try {
        const r = await heartbeatApi.tick();
        if (alive && r.spoke) {
          setMessages((m) => (m.some((x) => x.id === r.spoke.id) ? m : [...m, r.spoke]));
        }
        if (alive && r.surfed) {
          setMessages((m) => (m.some((x) => x.id === r.surfed.id) ? m : [...m, r.surfed]));
        }
      } catch {
        /* 静默失败，不打扰 */
      }
      try {
        const s = await heartbeatApi.state();
        if (alive) setMood(s);
      } catch {
        /* 同上 */
      }
    };
    const t = setTimeout(beat, 4000);
    const iv = setInterval(beat, 90000);
    return () => {
      alive = false;
      clearTimeout(t);
      clearInterval(iv);
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

    const optimistic = { id: 'tmp-' + Date.now(), role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);

    try {
      const res = await api.chat({ conversationId: convId, message: text });
      setConvId(res.conversationId);
      setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), res.userMessage, res.reply]);
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
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  /* ---------- 看屏幕 ---------- */
  const WATCH_EVERY = Math.max(15, Number(watchEvery) || 45) * 1000;

  function captureFrame() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const w = 860;
    const scale = Math.min(1, w / v.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.6);
  }

  async function tick() {
    if (!videoRef.current) return;
    const image = captureFrame();
    if (!image) return;
    try {
      const r = await watchApi.frame(image, convId);
      if (r.spoke && r.message) {
        setMessages((m) => [...m, r.message]);
        if (r.conversationId) setConvId(r.conversationId);
      }
    } catch (e) {
      setWatchErr(e.message);
    }
  }

  async function startWatch() {
    setWatchErr('');
    if (!watchAllowed) {
      setWatchErr('先在设置 →「看屏幕」里允许，才能共享');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 2 }, audio: false });
      shareRef.current = stream;
      const v = videoRef.current;
      v.srcObject = stream;
      await v.play().catch(() => {});
      setWatching(true);
      stream.getVideoTracks()[0].addEventListener('ended', stopWatch);
      setTimeout(tick, 2500);
      timerRef.current = setInterval(tick, WATCH_EVERY);
    } catch (e) {
      setWatchErr(e.name === 'NotAllowedError' ? '你取消了共享' : e.message);
    }
  }

  function stopWatch() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (shareRef.current) {
      shareRef.current.getTracks().forEach((t) => t.stop());
      shareRef.current = null;
    }
    setWatching(false);
  }

  useEffect(() => () => stopWatch(), []);




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
          <AvatarImg who="ta" url={avatars.ta} size="s24" />
          <div className="chat-center">
            <div className="chat-name">{NAME}</div>
            <div className="chat-sub">
              <i className="sdot" />
              {sending ? '正在想…' : moodLine(mood)}
            </div>
          </div>
        </div>
        <div className="chat-actions">
          <button
            className={'icon-btn' + (watching ? ' watching' : '')}
            onClick={() => {
              if (watching) return stopWatch();
              if (!watchAllowed) return onGo('settings');
              return startWatch();
            }}
            title={watching ? '停止共享屏幕' : '让他看我的屏幕'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6Z" />
              <circle cx="12" cy="12" r="2.6" />
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
          <Message
            key={m.id}
            m={m}
            showAvatars={showAvatars}
            avatars={avatars}
            watching={watching}
            denied={denied}
            onAllowWatch={() => startWatch()}
            onDenyWatch={(id) => setDenied((d) => new Set(d).add(id))}
          />
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

      {watching && (
        <div className="watch-bar">
          <span className="watch-dot" />
          <span>正看着你的屏幕 · 每 {Math.round(WATCH_EVERY / 1000)} 秒看一眼</span>
          <button onClick={stopWatch}>停止</button>
        </div>
      )}
      {watchErr && <div className="watch-err">{watchErr}</div>}
      <video ref={videoRef} className="watch-video" muted playsInline />

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
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            placeholder="说点什么…（Shift+Enter 换行）"
            onChange={(e) => {
              setInput(e.target.value);
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = Math.min(140, el.scrollHeight) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
                if (inputRef.current) inputRef.current.style.height = 'auto';
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

      {sheet === 'profile' && (
        <div className="sheet-mask on" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <div className="av-row">
              <AvatarImg who="ta" url={avatars.ta} size="s64" />
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
