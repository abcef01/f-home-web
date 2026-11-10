/**
 * 它的声音
 * ------------------------------------------------------------
 * 用系统自带的语音合成，不额外调 API、不花钱、离线也能用。
 * 音色取决于你的手机/电脑里装了什么，所以给你自己挑。
 */

let voicesCache = [];

export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function loadVoices() {
  if (!speechSupported()) return [];
  voicesCache = window.speechSynthesis.getVoices() || [];
  return voicesCache;
}

export function chineseVoices() {
  const all = loadVoices();
  const zh = all.filter((v) => /zh|cmn|Chinese/i.test(v.lang) || /中文|普通话|Chinese/i.test(v.name));
  return (zh.length ? zh : all).slice(0, 20);
}

/* 等系统把音色列表加载出来（有些浏览器是异步的） */
export function onVoicesReady(cb) {
  if (!speechSupported()) return () => {};
  const handler = () => cb(loadVoices());
  window.speechSynthesis.addEventListener('voiceschanged', handler);
  const t = setTimeout(() => cb(loadVoices()), 300);
  return () => {
    clearTimeout(t);
    window.speechSynthesis.removeEventListener('voiceschanged', handler);
  };
}

export function speak(text, { rate = 1, pitch = 1, voiceName = '' } = {}) {
  if (!speechSupported() || !text) return;
  stopSpeak();

  /* 长文本切成句子，逐句念，听起来更自然，也能更快开始 */
  const chunks = String(text)
    .replace(/\[\[[^\]]*\]\]/g, '')
    .split(/(?<=[。！？!?…~～\n])/)
    .map((s) => s.trim())
    .filter(Boolean);

  const voice = chineseVoices().find((v) => v.name === voiceName);

  for (const chunk of chunks) {
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = voice?.lang || 'zh-CN';
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;
    window.speechSynthesis.speak(u);
  }
}

export function stopSpeak() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

/* ---------- 语音输入 ---------- */
export function listenSupported() {
  return typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function listen({ onResult, onEnd, onError, lang = 'zh-CN' } = {}) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = false;
  rec.interimResults = true;

  rec.onresult = (e) => {
    let text = '';
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
    onResult?.(text);
  };
  rec.onerror = (e) => onError?.(e.error);
  rec.onend = () => onEnd?.();

  rec.start();
  return rec;
}
