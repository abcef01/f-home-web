import React, { useEffect, useRef, useState } from 'react';
import { api, stickersApi, watchApi, heartbeatApi, pillApi, favoritesApi } from '../api.js';
import { speak, stopSpeak, listenSupported, speechSupported } from '../lib/speech.js';
import { analyzeSong } from '../lib/audio-notes.js';
import { analyzeSing } from '../lib/sing.js';
import { listenStream } from '../lib/speech.js';
import { refreshLocation } from '../lib/place.js';
import { listenAmbience } from '../lib/ambience.js';
import AvatarImg from '../components/AvatarImg.jsx';

const NAME = 'Elliott';
const CACHE_KEY = 'bh_chat_cache';

function saveCache(convId, messages) {
  try {
    /* 只存渲染需要的字段，别把整个对象塞进 localStorage */
    const slim = messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      created_at: m.created_at,
      meta: m.meta || undefined
    }));
    localStorage.setItem(CACHE_KEY, JSON.stringify({ convId, messages: slim, at: Date.now() }));
  } catch {
    /* 存不下就算了 */
  }
}

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
export function Message({ m, showAvatars, avatars = {}, watching = false, denied, onAllowWatch, onDenyWatch, voice = {}, handlers = {} }) {
  const [open, setOpen] = useState(false);
  const [favDone, setFavDone] = useState(false);

  /* 双击 / 长按收藏这句话 */
  async function saveFav() {
    const text = (m.content || "").trim();
    if (!text || favDone) return;
    try {
      await favoritesApi.add({ type: "text", text, from: mine ? "我" : "Elliott" });
      setFavDone(true);
      setTimeout(() => setFavDone(false), 1500);
    } catch {
      /* 忽略 */
    }
  }
  const mine = m.role === 'user';
  const reasoning = m.meta?.reasoning;

  return (
    <>
      <div className={'msg ' + (mine ? 'me' : 'them')}>
        {showAvatars && !mine && <AvatarImg who="ta" url={avatars.ta} size="s26" />}
        <div className="bubble-stack">
          {m.content && m.content !== '[表情]' && (
            <div
              className="bubble"
              onDoubleClick={saveFav}
              onContextMenu={(e) => {
                e.preventDefault();
                saveFav();
              }}
              title="双击 / 长按收藏"
            >
              {m.content}
              {favDone && <span className="fav-hint">已收藏</span>}
            </div>
          )}
          {m.meta?.sticker && <img className="sticker-msg" src={m.meta.sticker} alt="表情" />}
          {m.meta?.image && (
            <div className="chat-image-wrap">
              <img className="chat-image" src={m.meta.image} alt="图片" />
              <button
                className="chat-image-fav"
                onClick={async () => {
                  try {
                    const res = await fetch(m.meta.image);
                    const blob = await res.blob();
                    const dataUrl = await new Promise((r2) => {
                      const fr = new FileReader();
                      fr.onload = () => r2(String(fr.result));
                      fr.readAsDataURL(blob);
                    });
                    await favoritesApi.add({ type: 'image', dataUrl, from: mine ? '我' : 'Elliott' });
                    setFavDone(true);
                    setTimeout(() => setFavDone(false), 1500);
                  } catch {
                    /* 图片可能已过期 */
                  }
                }}
              >
                {favDone ? '♥' : '♡'}
              </button>
            </div>
          )}
          {m.meta?.music && (
            <div className="song-card">
              <span className="song-name">🎵 {m.meta.music.fileName || '一首歌'}</span>
              <span className="song-meta">
                {m.meta.music.bpm ? `${m.meta.music.bpm} BPM` : ''}
                {m.meta.music.key ? ` · ${m.meta.music.key}` : ''}
              </span>
            </div>
          )}
          {m.meta?.ask && <AskCard type={m.meta.ask} onWatch={handlers.onWatch} onCall={handlers.onCall} onWhere={handlers.onWhere} onListen={handlers.onListen} onPhoto={handlers.onPhoto} />}
          {m.meta?.callRequest && (
            <div className="call-card">
              <span>想给你打个电话</span>
              <button onClick={() => handlers.onCall && handlers.onCall()}>接听</button>
            </div>
          )}
          {m.meta?.thought && <ThoughtBlock text={m.meta.thought} />}
          {speechSupported() && msgPlayable(m.content) && <SpeakButton text={m.content} voice={voice} />}
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
            {mine
                ? ' · 你'
                : m.model
                ? ` · ${m.model}${m.tokens ? ` · ${m.tokens} tok` : ''}${
                    m.meta?.cacheHit != null ? ` · 缓存 ${Math.round(m.meta.cacheHit * 100)}%` : ''
                  }`
                : ''}
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

export default function Chat({ voice = {}, onVoiceChange, onCall, onGo, showAvatars, avatars = {}, watchAllowed = false, watchEvery = 45 }) {
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
  const [healthScanning, setHealthScanning] = useState(false);
  const [healthNote, setHealthNote] = useState('');
  const [pill, setPill] = useState(null);
  const [pillOpen, setPillOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [ambienting, setAmbienting] = useState(false);
  const recRef = useRef(null);
  const [denied, setDenied] = useState(new Set());
  const photoRef = useRef(null);
  const replyTimer = useRef(null);
  const musicRef = useRef(null);
  const [mood, setMood] = useState(null);
  const shareRef = useRef(null);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  /* 打开时先渲染本地缓存，再悄悄拉最新（不会先白一下） */
  useEffect(() => {
    let alive = true;

    /* 1. 缓存先上屏 */
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Array.isArray(cached.messages) && cached.messages.length) {
          setMessages(cached.messages.map((m) => ({ ...m, _cached: true })));
          if (cached.convId) setConvId(cached.convId);
          setLoaded(true);
        }
      }
    } catch {
      /* 缓存坏了就算了 */
    }

    /* 2. 后台拉真数据，到了再替换 */
    (async () => {
      try {
        const conv = await api.currentConversation();
        if (!alive) return;
        if (conv) {
          setConvId(conv.id);
          const history = await api.messages(conv.id);
          if (alive) {
            setMessages(history);
            saveCache(conv.id, history);
          }
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

  /* 消息一变就写缓存，下次打开直接有 */
  useEffect(() => {
    if (!convId || !messages.length) return;
    saveCache(convId, messages.slice(-40));
  }, [messages, convId]);

  useEffect(() => {
    stickersApi.list().then(setStickers).catch(() => {});
  }, []);

  /* 系统分享进来的图，直接发出去 */
  useEffect(() => {
    const handler = () => {
      const f = window.__bunnySharedFile;
      if (f) {
        window.__bunnySharedFile = null;
        sendImage(f);
      }
    };
    window.addEventListener('bunny-shared-image', handler);
    if (window.__bunnySharedFile) handler();
    return () => window.removeEventListener('bunny-shared-image', handler);
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

  /* 连发：先只存，等你停手了再回 */
  async function send(raw) {
    const text = String(raw != null ? raw : input).trim();
    if (!text || sending) return;
    setInput('');
    setError('');

    const optimistic = { id: 'tmp-' + Date.now(), role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);

    try {
      const res = await api.chat({ conversationId: convId, message: text, storeOnly: true });
      setConvId(res.conversationId);
      setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), res.userMessage]);
      scheduleReply(res.conversationId);
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setError(e.message);
    }
  }

  /* 一条回复拆成几个气泡，间隔一点时间冒出来 */
  function appendReplies(list) {
    const items = (list || []).filter(Boolean);
    items.forEach((msg, i) => {
      setTimeout(() => {
        setMessages((m) => [...m, msg]);
        if (voice?.auto && speechSupported()) {
          speak(msg.content, { rate: voice.rate || 1, voiceName: voice.name || '' });
        }
      }, i * 750);
    });
    return items.length * 750;
  }

  /* 停顿 7 秒后才回；期间又发消息就重新计时 */
  function scheduleReply(id) {
    if (replyTimer.current) clearTimeout(replyTimer.current);
    replyTimer.current = setTimeout(async () => {
      setSending(true);
      try {
        const r = await api.respond(id);
        const list = r.replies && r.replies.length ? r.replies : r.reply ? [r.reply] : [];
        const wait = appendReplies(list);
        setTimeout(() => setSending(false), wait);
      } catch (e) {
        setError(e.message);
        setSending(false);
      } finally {
        replyTimer.current = null;
      }
    }, 7000);
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
      setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), res.userMessage]);
      appendReplies(res.replies && res.replies.length ? res.replies : [res.reply]);
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

  async function sendImage(file) {
    if (!file || sending) return;
    setError('');
    setSending(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const max = 1024;
            const scale = Math.min(1, max / Math.max(img.width, img.height));
            const cv = document.createElement('canvas');
            cv.width = Math.round(img.width * scale);
            cv.height = Math.round(img.height * scale);
            cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
            resolve(cv.toDataURL('image/jpeg', 0.82));
          };
          img.onerror = () => reject(new Error('这张图读不出来'));
          img.src = reader.result;
        };
        reader.onerror = () => reject(new Error('读取失败'));
        reader.readAsDataURL(file);
      });

      const res = await api.chat({ conversationId: convId, message: '（发了一张图片）', image: dataUrl });
      setConvId(res.conversationId);
      setMessages((m) => [...m, res.userMessage]);
      appendReplies(res.replies && res.replies.length ? res.replies : [res.reply]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }
  /* 听一下他那儿多吵 */
  /* 语音输入：说一句就发出去 */
  const stopListenRef = useRef(null);

  function startListening() {
    if (listening) return;
    setListening(true);
    stopListenRef.current = listenStream({
      onFinal: (text) => {
        setListening(false);
        stopListenRef.current = null;
        if (text && text.trim()) send(text.trim());
      },
      onEnd: () => {
        setListening(false);
        stopListenRef.current = null;
      },
      onError: () => {
        setListening(false);
        stopListenRef.current = null;
      }
    });
  }

  function stopListening() {
    stopListenRef.current?.();
    stopListenRef.current = null;
    setListening(false);
  }

  async function hearAmbience() {
    if (ambienting || sending) return;
    setAmbienting(true);
    setError('');
    try {
      const amb = await listenAmbience(6000);
      if (!amb) throw new Error('没测到声音');
      const res = await api.chat({ conversationId: convId, message: '（安静了六秒，让你听听）', ambience: amb });
      setConvId(res.conversationId);
      setMessages((m) => [...m, res.userMessage]);
      appendReplies(res.replies && res.replies.length ? res.replies : [res.reply]);
    } catch (e) {
      setError(e.name === 'NotAllowedError' ? '你拒绝了麦克风' : e.message);
    } finally {
      setAmbienting(false);
    }
  }
  /* 唱一段：录 20 秒，量音高，再发给他 */
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const singRecRef = useRef(null);
  const singChunksRef = useRef([]);
  const singTimerRef = useRef(null);

  async function toggleSing() {
    if (recording) {
      singRecRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      singRecRef.current = rec;
      singChunksRef.current = [];

      rec.ondataavailable = (e) => e.data.size && singChunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (singTimerRef.current) clearInterval(singTimerRef.current);
        setRecording(false);
        setRecSecs(0);

        const blob = new Blob(singChunksRef.current, { type: 'audio/webm' });
        try {
          const buf = await blob.arrayBuffer();
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const audio = await ctx.decodeAudioData(buf);
          await ctx.close().catch(() => {});
          const meta = analyzeSing(audio.getChannelData(0), audio.sampleRate, { maxSeconds: 30 });
          const res = await api.chat({ conversationId: convId, message: '（唱了一段）', sing: meta });
          setConvId(res.conversationId);
          setMessages((m) => [...m, res.userMessage]);
          appendReplies(res.replies && res.replies.length ? res.replies : [res.reply]);
        } catch (e) {
          setError('这段没录好：' + (e.message || ''));
        }
      };

      rec.start();
      setRecording(true);
      setRecSecs(0);
      singTimerRef.current = setInterval(() => setRecSecs((n) => n + 1), 1000);
      setTimeout(() => {
        if (singRecRef.current?.state === 'recording') singRecRef.current.stop();
      }, 20000);
    } catch (e) {
      alert('打不开麦克风：' + (e.message || ''));
    }
  }

  /* 首页「一起听」进来时，直接打开选歌（跟聊天里点 ♪ 一样） */
  useEffect(() => {
    const open = () => musicRef.current?.click();
    window.addEventListener('bunny-open-song', open);
    return () => window.removeEventListener('bunny-open-song', open);
  }, []);

  /* 发一首歌：本地分析结构，再把结果发给它 */
  async function sendSong(file) {
    if (!file || sending) return;
    setError('');
    setSending(true);
    try {
      const buf = await file.arrayBuffer();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const audio = await ctx.decodeAudioData(buf);
      await ctx.close().catch(() => {});

      const ch = audio.getChannelData(0);
      const music = analyzeSong(ch, audio.sampleRate, { maxSeconds: 180 });
      if (music.error) throw new Error(music.error);
      music.fileName = file.name.replace(/\.[^.]+$/, '').slice(0, 40);

      const res = await api.chat({ conversationId: convId, message: '（发来一首歌）', music });
      setConvId(res.conversationId);
      setMessages((m) => [...m, res.userMessage]);
      appendReplies(res.replies && res.replies.length ? res.replies : [res.reply]);
    } catch (e) {
      setError(e.message.includes('decode') ? '这个格式解不开，试试 mp3 或 m4a' : e.message);
    } finally {
      setSending(false);
    }
  }
  /* 药盒 */
  useEffect(() => {
    pillApi.get().then(setPill).catch(() => {});
  }, []);

  async function takePill(text) {
    try {
      const p = await pillApi.set(text);
      setPill(p);
      setPillOpen(false);
    } catch (e) {
      setError(e.message);
    }
  }

  async function dropPill() {
    await pillApi.clear().catch(() => {});
    setPill(null);
  }
  /* 读手环：共享屏幕 → 你切到华为运动健康 → 它自己截几张找数据 */
  async function startHealthScan() {
    setWatchErr('');
    setHealthNote('');
    if (watching) stopWatch();
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 2 }, audio: false });
    } catch (e) {
      setWatchErr(e.name === 'NotAllowedError' ? '你取消了共享' : e.message);
      return;
    }

    const v = videoRef.current;
    v.srcObject = stream;
    await v.play().catch(() => {});
    setHealthScanning(true);
    shareRef.current = stream;
    stream.getVideoTracks()[0].addEventListener('ended', () => setHealthScanning(false));

    let done = false;
    for (let i = 0; i < 5 && !done; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      const image = captureFrame();
      if (!image) continue;
      try {
        const r = await watchApi.frame(image, convId, 'health');
        if (r.health) {
          done = true;
          const h = r.health;
          const bits = [];
          if (h.steps) bits.push(h.steps + ' 步');
          if (h.sleepHours) bits.push('睡 ' + h.sleepHours + ' 小时');
          if (h.restingHr) bits.push('心率 ' + h.restingHr);
          setHealthNote('记下了：' + (bits.join(' · ') || '读到了数据'));
        }
      } catch {
        /* 这一张没读到，继续下一张 */
      }
    }

    setHealthScanning(false);
    if (shareRef.current) {
      shareRef.current.getTracks().forEach((t) => t.stop());
      shareRef.current = null;
    }
    if (!done) setHealthNote('没读到数据。下次先滚到睡眠卡片再点。');
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
          <button className="icon-btn" onClick={() => onCall && onCall()} title="打个电话">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M6.5 4.5h3l1.5 4-2 1.5a10 10 0 005 5l1.5-2 4 1.5v3a1.5 1.5 0 01-1.6 1.5A15.5 15.5 0 014.9 6.1 1.5 1.5 0 016.5 4.5z" />
            </svg>
          </button>
          <button
            className={'icon-btn' + (healthScanning ? ' watching' : '')}
            onClick={startHealthScan}
            title="读手环（会共享屏幕）"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M3 12h3l2-5 3 10 2.5-7 2 4H21" />
            </svg>
          </button>
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
            voice={voice}
            handlers={{
              onWatch: () => startWatch(),
              onCall,
              onWhere: () => refreshLocation({ force: true }),
              onListen: hearAmbience,
              onPhoto: () => photoRef.current?.click()
            }}
          />
        ))}


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
      {healthScanning && (
        <div className="watch-bar">
          <span className="watch-dot" />
          <span>切到华为运动健康，滚到睡眠卡片，别退出共享</span>
          <button onClick={() => setHealthScanning(false)}>停</button>
        </div>
      )}
      {healthNote && <div className="watch-bar"><span>{healthNote}</span></div>}
      {pill && (
        <div className="pill-chip">
          <span>💊 {pill.text}</span>
          <button onClick={dropPill}>取消</button>
        </div>
      )}
      {pillOpen && (
        <div className="pill-sheet">
          <div className="pill-hint">挑一颗，只对下一次回复生效，用完就没</div>
          {[
            ['别哄我', '这次别安慰我，别哄，直接说真话'],
            ['说短点', '这次回复尽量短，最多两句话'],
            ['别问我', '这次别向我提问，只说你自己想说的'],
            ['你来讲', '这次你来起个话头，讲点你自己的事'],
            ['骂醒我', '这次别顺着我，直接指出我在逃避什么'],
            ['当陌生人', '这次用刚认识、还不太熟的语气跟我说话']
          ].map(([label, text]) => (
            <button key={label} className="pill-item" onClick={() => takePill(text)}>
              <b>{label}</b>
              <span>{text}</span>
            </button>
          ))}
          <button className="pill-item" onClick={() => setPillOpen(false)}>
            <b>算了</b>
          </button>
        </div>
      )}
      {watchErr && <div className="watch-err">{watchErr}</div>}
      <video ref={videoRef} className="watch-video" muted playsInline />

      <div className="composer">
        <button
          className={"sticker-btn tools-toggle" + (toolsOpen ? " on" : "")}
          onClick={() => setToolsOpen((v) => !v)}
          title="更多"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        {toolsOpen && (
          <div className="composer-tools">
          <button className="sticker-btn" onClick={() => photoRef.current?.click()} title="发图片">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
              <circle cx="9" cy="11" r="1.6" />
              <path d="M4.5 17l4.5-4 3.5 3 3-2.5 4 3.5" />
            </svg>
          </button>
          <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) sendImage(f); }} />
          {listenSupported() && (
            <button
              className={'sticker-btn' + (listening ? ' on' : '')}
              onClick={listening ? stopListening : startListening}
              title={listening ? '松开结束' : '按住说话'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="9" y="3.5" width="6" height="11" rx="3" />
                <path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v2.5" />
              </svg>
            </button>
          )}
          <button className={'sticker-btn' + (ambienting ? ' on' : '')} onClick={hearAmbience} title={ambienting ? '正在听…' : '听一下你那儿多吵'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M4 12h2.5l1.8-4.5 2.4 9 2-6.5 1.7 3.5H20" />
            </svg>
          </button>
          <button className="sticker-btn" onClick={() => musicRef.current?.click()} title="发一首歌">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M9 17.5V6.2l9-1.7v10.8" />
              <circle cx="7" cy="17.5" r="2.2" />
              <circle cx="16" cy="15.3" r="2.2" />
            </svg>
          </button>
          <input ref={musicRef} type="file" accept="audio/*" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) sendSong(f); }} />
          <button className={'sticker-btn' + (pill ? ' on' : '')} onClick={() => setPillOpen((v) => !v)} title="药盒">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="4" y="9" width="16" height="9" rx="4.5" transform="rotate(-40 12 13.5)" />
              <path d="M9.5 8.5l5 5" />
            </svg>
          </button>
          <button className="sticker-btn" onClick={() => setStickerSheet(true)} title="表情包">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <circle cx="12" cy="12" r="8" />
              <circle cx="9.2" cy="10" r="0.9" fill="currentColor" stroke="none" />
              <circle cx="14.8" cy="10" r="0.9" fill="currentColor" stroke="none" />
              <path d="M8.6 14.2a4.2 4.2 0 0 0 6.8 0" />
            </svg>
          </button>
          </div>
        )}

        <div className="field">
          <svg viewBox="0 0 24 24">
            <path d="M12 5.5v13M5.5 12h13" />
          </svg>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            placeholder="说点什么…"
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

/* 它刚才在心里想什么（默认收起） */
function ThoughtBlock({ text }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="thought">
      <button className="thought-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? '收起' : '它在想什么'}
      </button>
      {open && <div className="thought-body">{text}</div>}
    </div>
  );
}
/* 这句话能不能念（表情包/图片/空的不念） */
function msgPlayable(content) {
  const t = String(content || '').replace(/\[\[[^\]]*\]\]/g, '').trim();
  return t.length > 0 && !/^（.*）$/.test(t);
}

function SpeakButton({ text, voice }) {
  const [on, setOn] = React.useState(false);
  return (
    <button
      className={'speak-btn' + (on ? ' on' : '')}
      onClick={() => {
        if (on) {
          stopSpeak();
          setOn(false);
        } else {
          setOn(true);
          speak(text, { rate: voice?.rate || 1, voiceName: voice?.name || '' });
          /* 大概估个时长自动复位 */
          setTimeout(() => setOn(false), Math.min(30000, String(text).length * 220));
        }
      }}
      title={on ? '停' : '念给我听'}
    >
      {on ? '■' : '▶'}
    </button>
  );
}

/* 它想要点什么 */
const ASK_LABEL = {
  watch: { text: '想看看你在做什么', btn: '让他看' },
  call: { text: '想给你打个电话', btn: '接听' },
  where: { text: '想知道你在哪', btn: '告诉他' },
  listen: { text: '想听听你那儿的声音', btn: '让他听' },
  pic: { text: '想让你发张照片', btn: '发照片' }
};

function AskCard({ type, onWatch, onCall, onWhere, onListen, onPhoto }) {
  const info = ASK_LABEL[type];
  if (!info) return null;
  const action = { watch: onWatch, call: onCall, where: onWhere, listen: onListen, pic: onPhoto }[type];
  return (
    <div className="ask-card">
      <span>{info.text}</span>
      <button onClick={() => action && action()}>{info.btn}</button>
    </div>
  );
}
