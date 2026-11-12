/**
 * 后端接口封装
 * ------------------------------------------------------------
 * 默认连线上后端；本地开发时在 .env.local 里写
 * VITE_API_BASE=http://localhost:3000 覆盖即可。
 *
 * 所有请求都会带上口令令牌（登录后存在 localStorage）。
 */
const RAW = (import.meta.env.VITE_API_BASE || 'https://f-home-api.onrender.com').trim();
const BASE = RAW.replace(/\/+$/, '');

const TOKEN_KEY = 'bh_token';

export const auth = {
  get token() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  },
  set token(v) {
    try {
      if (v) localStorage.setItem(TOKEN_KEY, v);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* 隐私模式下不可用 */
    }
  },
  clear() {
    this.token = '';
  }
};

function headers(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  if (auth.token) h.Authorization = 'Bearer ' + auth.token;
  return h;
}

function authError() {
  const e = new Error('需要口令');
  e.code = 'AUTH';
  return e;
}

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: headers(options.headers || {})
  });
  /* 登录接口的 401 是「口令不对」，要原样抛出；其他 401 才代表需要重新解锁 */
  if (res.status === 401 && !path.startsWith('/api/auth/login')) throw authError();

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* 非 JSON 响应 */
  }
  if (!res.ok) {
    const msg = json?.error || json?.message || text.slice(0, 160) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export const api = {
  base: BASE,

  health: () => request('/health'),

  channels: () => request('/api/channels').then((r) => r.channels),
  models: (channel) => request('/api/models?channel=' + encodeURIComponent(channel)).then((r) => r.models),

  currentModel: () => request('/api/settings/model'),
  setModel: (channel, model) =>
    request('/api/settings/model', {
      method: 'POST',
      body: JSON.stringify({ channel, model })
    }),

  conversations: () => request('/api/conversations').then((r) => r.conversations),
  currentConversation: () => request('/api/conversation').then((r) => r.conversation),
  slotsTags: () => request('/api/slots/tags?all=1'),
  backupImport: (payload, mode) => request('/api/backup/import', { method: 'POST', body: JSON.stringify({ payload, mode }) }),
  device: (status) => deviceApi.report(status),
  messages: (conversationId) =>
    request('/api/conversations/' + conversationId + '/messages').then((r) => r.messages),

  chat: ({ conversationId, message, channel, model, sticker, image, storeOnly, music, ambience }) =>
    request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ conversationId, message, channel, model, sticker, image, storeOnly, music, ambience })
    }),

  respond: (conversationId) =>
    request('/api/respond', { method: 'POST', body: JSON.stringify({ conversationId }) })
};

export const authApi = {
  check: () => request('/api/auth/check'),
  login: (passphrase) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ passphrase }) })
};

/* ============================================================
   流式对话（SSE）
   ------------------------------------------------------------
   onMeta / onDelta / onReasoning / onDone / onError 都是回调，
   边收边更新界面。
   ============================================================ */
export async function chatStream({
  conversationId,
  message,
  channel,
  model,
  signal,
  onMeta,
  onDelta,
  onReasoning,
  onDone,
  onError
}) {
  const res = await fetch(BASE + '/api/chat/stream', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ conversationId, message, channel, model }),
    signal
  });

  if (res.status === 401) throw authError();

  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => '');
    throw new Error(t.slice(0, 200) || `HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    const blocks = buf.split('\n\n');
    buf = blocks.pop() || '';

    for (const block of blocks) {
      const line = block.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;

      let ev;
      try {
        ev = JSON.parse(payload);
      } catch {
        continue;
      }

      if (ev.type === 'meta') onMeta?.(ev);
      else if (ev.type === 'delta') onDelta?.(ev.text);
      else if (ev.type === 'reasoning') onReasoning?.(ev.text);
      else if (ev.type === 'done') onDone?.(ev);
      else if (ev.type === 'error') {
        onError?.(ev.error);
        throw new Error(ev.error);
      }
    }
  }
}

export const conversations = {
  list: () => request('/api/conversations').then((r) => r.conversations),
  create: (title) =>
    request('/api/conversations', { method: 'POST', body: JSON.stringify({ title }) }).then((r) => r.conversation),
  rename: (id, title) =>
    request('/api/conversations/' + id, { method: 'PATCH', body: JSON.stringify({ title }) }),
  remove: (id) => request('/api/conversations/' + id, { method: 'DELETE' })
};

export const deviceApi = {
  report: (status) => request('/api/device', { method: 'POST', body: JSON.stringify(status) }),
  get: () => request('/api/device').then((r) => r.status)
};

export const factsApi = {
  list: () => request('/api/facts').then((r) => r.facts || []),
  add: (text) => request('/api/facts', { method: 'POST', body: JSON.stringify({ text }) }).then((r) => r.facts || []),
  remove: (id) => request('/api/facts/' + id, { method: 'DELETE' }).then((r) => r.facts || [])
};

export const ritualsApi = {
  list: () => request('/api/rituals'),
  check: (id) => request('/api/rituals/check', { method: 'POST', body: JSON.stringify({ id }) })
};

export const unreadApi = {
  get: () => request('/api/unread'),
  markRead: (section) => request('/api/reads/' + section, { method: 'POST', body: '{}' })
};

export const readingsApi = {
  list: () => request('/api/readings'),
  make: (kind, input, question) => request('/api/readings', { method: 'POST', body: JSON.stringify({ kind, input, question }) }),
  remove: (id) => request('/api/readings/' + id, { method: 'DELETE' })
};

export const favoritesApi = {
  list: () => request('/api/favorites'),
  add: (payload) => request('/api/favorites', { method: 'POST', body: JSON.stringify(payload) }),
  remove: (id) => request('/api/favorites/' + id, { method: 'DELETE' })
};

export const statusApi = {
  get: () => request('/api/status'),
  set: (text, mood) => request('/api/status', { method: 'POST', body: JSON.stringify({ text, mood }) })
};

export const momentsApi = {
  list: () => request('/api/moments'),
  post: (payload) => request('/api/moments', { method: 'POST', body: JSON.stringify(payload) }),
  like: (id) => request('/api/moments/' + id + '/like', { method: 'POST', body: '{}' }),
  comment: (id, text) => request('/api/moments/' + id + '/comment', { method: 'POST', body: JSON.stringify({ text }) }),
  remove: (id) => request('/api/moments/' + id, { method: 'DELETE' })
};

export const mealsApi = {
  get: () => request('/api/meals'),
  mark: (slot, text, eaten) => request('/api/meals', { method: 'POST', body: JSON.stringify({ slot, text, eaten }) })
};

export const drawApi = {
  guess: (image) => request('/api/vision/guess', { method: 'POST', body: JSON.stringify({ image }) })
};

export const dailyApi = {
  get: (me) => request('/api/daily' + (me ? '?me=' + encodeURIComponent(me) : ''))
};

export const albumApi = {
  list: () => request('/api/album')
};

export const callFrameApi = {
  send: (image) => request('/api/call/frame', { method: 'POST', body: JSON.stringify({ image }) })
};

export const waterApi = {
  get: () => request('/api/water'),
  add: (ml, note) => request('/api/water', { method: 'POST', body: JSON.stringify({ ml, note }) }),
  remove: (id) => request('/api/water/' + id, { method: 'DELETE' })
};

export const walletApi = {
  get: () => request('/api/wallet'),
  transfer: (amount, note) => request('/api/wallet/transfer', { method: 'POST', body: JSON.stringify({ amount, note }) }),
  wish: (payload) => request('/api/wallet/wish', { method: 'POST', body: JSON.stringify(payload) }),
  ideate: () => request('/api/wallet/ideate', { method: 'POST', body: '{}' }),
  shop: () => request('/api/wallet/shop'),
  buy: (id) => request('/api/wallet/buy', { method: 'POST', body: JSON.stringify({ id }) }),
  pay: (id, price) => request('/api/wallet/pay', { method: 'POST', body: JSON.stringify({ id, price }) }),
  reject: (id) => request('/api/wallet/reject', { method: 'POST', body: JSON.stringify({ id }) })
};

export const sleepApi = {
  list: () => request('/api/sleep'),
  save: (payload) => request('/api/sleep', { method: 'POST', body: JSON.stringify(payload) })
};

export const backupApi = {
  exportUrl: () => '/api/backup/export',
  import: (payload, mode) => request('/api/backup/import', { method: 'POST', body: JSON.stringify({ payload, mode }) })
};

export const slotsApi = {
  tags: () => request('/api/slots/tags?all=1')
};

export const booksApi = {
  list: () => request('/api/books'),
  upload: (filename, base64) => request('/api/books/upload', { method: 'POST', body: JSON.stringify({ filename, base64 }) }),
  book: (id) => request('/api/books/' + id),
  chapter: (id, i) => request('/api/books/' + id + '/chapter/' + i),
  progress: (id, chapter, page, percent) =>
    request('/api/books/' + id + '/progress', { method: 'POST', body: JSON.stringify({ chapter, page, percent }) }),
  marks: (id) => request('/api/books/' + id + '/marks'),
  annotate: (id, payload) => request('/api/books/' + id + '/annotation', { method: 'POST', body: JSON.stringify(payload) }),
  unannotate: (id, aid) => request('/api/books/' + id + '/annotation/' + aid, { method: 'DELETE' }),
  bookmark: (id, payload) => request('/api/books/' + id + '/bookmark', { method: 'POST', body: JSON.stringify(payload) }),
  unbookmark: (id, bid) => request('/api/books/' + id + '/bookmark/' + bid, { method: 'DELETE' }),
  remove: (id) => request('/api/books/' + id, { method: 'DELETE' })
};

export const diaryApi = {
  month: (month) => request('/api/diary' + (month ? '?month=' + month : '')),
  write: (payload) => request('/api/diary/entry', { method: 'POST', body: JSON.stringify(payload) }),
  like: (id) => request('/api/diary/like', { method: 'POST', body: JSON.stringify({ id }) }),
  comment: (id, text) => request('/api/diary/comment', { method: 'POST', body: JSON.stringify({ id, text }) }),
  note: (text) => request('/api/diary/note', { method: 'POST', body: JSON.stringify({ text }) }),
  importText: (title, text) => request('/api/books/import-text', { method: 'POST', body: JSON.stringify({ title, text }) }),
  autowrite: () => request('/api/diary/autowrite', { method: 'POST', body: '{}' })
};

export const questsApi = {
  list: () => request('/api/quests'),
  ideateQ: () => request('/api/quests/ideate', { method: 'POST', body: '{}' }),
  create: (title, points) => request('/api/quests/create', { method: 'POST', body: JSON.stringify({ title, points }) }),
  submit: (id, proof) => request('/api/quests/submit', { method: 'POST', body: JSON.stringify({ id, proof }) }),
  review: (id) => request('/api/quests/review', { method: 'POST', body: JSON.stringify({ id }) }),
  redeem: (id) => request('/api/quests/redeem', { method: 'POST', body: JSON.stringify({ id }) })
};

export const pondApi = {
  state: () => request('/api/pond'),
  cmd: (line) => request('/api/pond/cmd', { method: 'POST', body: JSON.stringify({ line }) })
};

export const burgerApi = {
  state: () => request('/api/burger'),
  cmd: (line) => request('/api/burger/cmd', { method: 'POST', body: JSON.stringify({ line }) })
};

export const farmApi = {
  state: () => request('/api/farm'),
  cmd: (line) => request('/api/farm/cmd', { method: 'POST', body: JSON.stringify({ line }) })
};

export const monoApi = {
  state: () => request('/api/mono'),
  start: (level, redLines, safeword) =>
    request('/api/mono/new', { method: 'POST', body: JSON.stringify({ level, redLines, safeword }) }),
  cmd: (line) => request('/api/mono/cmd', { method: 'POST', body: JSON.stringify({ line }) })
};

export const fishingApi = {
  state: () => request('/api/fishing'),
  cmd: (line) => request('/api/fishing/cmd', { method: 'POST', body: JSON.stringify({ line }) }),
  reset: (seed) => request('/api/fishing/new', { method: 'POST', body: JSON.stringify({ seed }) })
};

export const placeApi = {
  get: () => request('/api/location'),
  set: (payload) => request('/api/location', { method: 'POST', body: JSON.stringify(payload) }),
  weather: () => request('/api/weather').then((r) => r.weather)
};

export const callApi = {
  start: (payload) => request('/api/call/start', { method: 'POST', body: JSON.stringify(payload || {}) }),
  turn: (text, farewell, tone) =>
    request('/api/call/turn', { method: 'POST', body: JSON.stringify({ text, farewell: !!farewell, tone }) }),
  end: () => request('/api/call/end', { method: 'POST', body: '{}' }),
  current: () => request('/api/call').then((r) => r.call),
  invite: () => request('/api/call/invite', { method: 'POST', body: '{}' })
};

export const drivesApi = {
  get: () => request('/api/drives')
};

export const pillApi = {
  get: () => request('/api/pill').then((r) => r.pill),
  set: (text) => request('/api/pill', { method: 'POST', body: JSON.stringify({ text }) }).then((r) => r.pill),
  clear: () => request('/api/pill', { method: 'DELETE' })
};

export const memoryApi = {
  get: () => request('/api/memory'),
  decideCandidate: (id, accept) =>
    request('/api/memory/candidate/' + id, { method: 'POST', body: JSON.stringify({ accept }) }),
  removeCore: (id) => request('/api/memory/core/' + id, { method: 'DELETE' })
};

export const heartbeatApi = {
  tick: () => request('/api/heartbeat'),
  state: () => request('/api/state')
};

export const watchApi = {
  frame: (image, conversationId, mode) =>
    request('/api/watch', { method: 'POST', body: JSON.stringify({ image, conversationId, mode }) })
};

export const avatarsApi = {
  get: () => request('/api/avatars').then((r) => r.avatars || {}),
  upload: (who, dataUrl) =>
    request('/api/avatars', { method: 'POST', body: JSON.stringify({ who, dataUrl }) }),
  remove: (who) => request('/api/avatars/' + who, { method: 'DELETE' })
};

export const stickersApi = {
  list: () => request('/api/stickers').then((r) => r.stickers),
  add: (name, dataUrl) =>
    request('/api/stickers', { method: 'POST', body: JSON.stringify({ name, dataUrl }) }),
  remove: (id) => request('/api/stickers/' + id, { method: 'DELETE' })
};

export const uiSettings = {
  get: () => request('/api/settings/ui').then((r) => r.value),
  save: (value) => request('/api/settings/ui', { method: 'PUT', body: JSON.stringify(value) })
};

export const chatSettings = {
  get: () => request('/api/settings/chat'),
  save: (params) => request('/api/settings/chat', { method: 'PUT', body: JSON.stringify(params) })
};
