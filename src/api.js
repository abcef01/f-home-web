/**
 * 后端接口封装
 * ------------------------------------------------------------
 * 地址来自 Vercel 的环境变量 VITE_API_BASE；
 * 本地开发时写在 .env.local 里（Vite 会自动读）。
 * 没配的话默认连本地 3000。
 */
const RAW = (import.meta.env.VITE_API_BASE || 'http://localhost:3000').trim();
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
