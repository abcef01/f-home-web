/**
 * 后端接口封装
 * ------------------------------------------------------------
 * 默认连线上后端；本地开发时在 .env.local 里写
 * VITE_API_BASE=http://localhost:3000 覆盖即可。
 */
const RAW = (import.meta.env.VITE_API_BASE || 'https://f-home-api.onrender.com').trim();
const BASE = RAW.replace(/\/+$/, '');

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
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
  messages: (conversationId) =>
    request('/api/conversations/' + conversationId + '/messages').then((r) => r.messages),

  chat: ({ conversationId, message, channel, model }) =>
    request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ conversationId, message, channel, model })
    })
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, message, channel, model }),
    signal
  });

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
