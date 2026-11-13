import { JSDOM } from 'jsdom';
import fs from 'node:fs';

/* 先造一个浏览器环境，再 import 组件（api.js 会在模块加载时读 localStorage） */
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
globalThis.location = dom.window.location;
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.IntersectionObserver = class { observe() {} disconnect() {} };
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
globalThis.alert = () => {};

/* 语音、媒体这些 jsdom 没有，先给空实现 */
/* jsdom 没有 canvas，给个假的 2D 上下文 */
const fakeCtx = {
  setTransform() {}, clearRect() {}, fillRect() {}, strokeRect() {},
  beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {}, fill() {},
  arc() {}, rect() {}, save() {}, restore() {}, translate() {}, scale() {}, rotate() {},
  drawImage() {}, fillText() {}, measureText: () => ({ width: 0 }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
  createPattern: () => ({}),
  getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  putImageData() {}, createImageData: () => ({ data: new Uint8ClampedArray(4) })
};
dom.window.HTMLCanvasElement.prototype.getContext = () => fakeCtx;
dom.window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';

dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
dom.window.HTMLMediaElement.prototype.pause = () => {};
dom.window.AudioContext = class {
  constructor() {}
  close() { return Promise.resolve(); }
  decodeAudioData() { return Promise.resolve({ getChannelData: () => new Float32Array(1024), sampleRate: 44100 }); }
};

/* 把网络请求都挡掉，返回假的成功响应 */
const ok = (obj) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(obj)) });
globalThis.fetch = (url) => {
  const u = String(url);
  if (u.includes('/api/auth/check')) return ok({ ok: true });
  if (u.includes('/api/unread')) return ok({ diary: 0, notes: 0, moments: 0, books: 0, quests: 0, favorites: 0 });
  if (u.includes('/api/daily')) return ok({ quote: '测试', greeting: '测试问候' });
  if (u.includes('/api/status')) return ok({ me: null, ta: null });
  if (u.includes('/api/conversations')) return ok({ conversations: [] });
  if (u.includes('/api/conversation')) return ok({ conversation: null });
  if (u.includes('/api/settings/ui')) return ok({ value: {} });
  if (u.includes('/api/avatars')) return ok({ avatars: {} });
  if (u.includes('/api/drives')) return ok({ scores: {}, summary: '' });
  if (u.includes('/api/books')) return ok({ books: [] });
  if (u.includes('/api/quests')) return ok({ points: 0, streak: { count: 0 }, open: [], rewards: [] });
  if (u.includes('/api/diary')) return ok({ byDay: {}, entries: [], notes: [] });
  if (u.includes('/api/water')) return ok({ goal: 2000, today: { total: 0, items: [] }, days: [] });
  if (u.includes('/api/meals')) return ok({ today: {}, days: [], slots: [] });
  if (u.includes('/api/moments')) return ok({ moments: [] });
  if (u.includes('/api/favorites')) return ok({ favorites: [] });
  if (u.includes('/api/readings')) return ok({ readings: [] });
  if (u.includes('/api/study')) return ok({ sessions: [], stats: null });
  if (u.includes('/api/health')) return ok({ health: null });
  if (u.includes('/api/messages')) return ok({ messages: [] });
  return ok({});
};

const { createRoot } = require('react-dom/client');
const React = require('react');
const App = require('../src/App.jsx').default;

const errors = [];
const oldError = console.error;
console.error = (...args) => {
  errors.push(args.map((a) => (a && a.message) || String(a)).join(' '));
  oldError(...args);
};

process.on('uncaughtException', (e) => {
  errors.push('uncaught: ' + e.message);
});

const rootEl = document.getElementById('root');
const root = createRoot(rootEl);
try {
  root.render(React.createElement(App));
} catch (e) {
  errors.push('render: ' + e.message);
}

/* 等 effect 跑完（不用 await，避免 cjs 打包问题） */
setTimeout(() => {
  const html = rootEl.innerHTML || '';
  const crashed = /页面出错了|CRASH/.test(html);
  const real = errors.filter((e) => /is not defined|is not a function|Cannot read/.test(e));

  console.log('\n--- 结果 ---');
  console.log('渲染出的 DOM 长度:', html.length);
  console.log('页面崩溃:', crashed ? '是' : '否');
  if (real.length) {
    console.log('错误:');
    real.slice(0, 6).forEach((e) => console.log('  ❌', e.slice(0, 200)));
    process.exitCode = 1;
  } else if (crashed) {
    console.log('页面显示了错误页，但没抓到具体异常');
    process.exitCode = 1;
  } else {
    console.log('✅ 挂载通过');
  }
  /* 有 timer 在跑，手动退出 */
  process.exit(process.exitCode || 0);
}, 2500);
