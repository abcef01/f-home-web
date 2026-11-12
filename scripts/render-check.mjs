/**
 * 渲染自检：把每个页面在 Node 里渲染一遍，抓出"未定义变量"这类
 * build 查不出来、但一打开就白屏的错误。
 *
 * 用法：node scripts/render-check.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const tmp = path.join(root, '.tmp');
fs.mkdirSync(tmp, { recursive: true });

const esbuild = path.join(root, 'node_modules', 'esbuild', 'bin', 'esbuild');
const out = path.join(tmp, 'ssr.cjs');

execFileSync(process.execPath, [esbuild, path.join(here, 'ssr-probe.jsx'), '--bundle', `--outfile=${out}`, '--loader:.jsx=jsx', '--platform=node', '--format=cjs', '--log-level=error'], {
  stdio: 'inherit'
});

/* 打包产物里 import.meta.env 在 node 下不可用 */
fs.writeFileSync(out, fs.readFileSync(out, 'utf8').replaceAll('import_meta.env.VITE_API_BASE', 'undefined'));

const polyfills = `
globalThis.window = globalThis;
globalThis.location = { href: 'http://localhost/', origin: 'http://localhost', hash: '#home', search: '' };
globalThis.localStorage = { _d: {}, getItem(k){return this._d[k] ?? null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];} };
globalThis.document = {
  documentElement: { style: { setProperty(){}, removeProperty(){} }, classList: { add(){}, remove(){} } },
  body: { setAttribute(){}, appendChild(){}, classList: { add(){}, remove(){} } },
  createElement: () => ({ style: {}, getContext: () => null, appendChild(){}, click(){} }),
  getElementById: () => null, addEventListener(){}, querySelector: () => null
};
globalThis.navigator = { userAgent: 'node' };
globalThis.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
globalThis.ResizeObserver = class { observe(){} disconnect(){} };
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
globalThis.AudioContext = class { close(){} };
globalThis.fetch = () => Promise.reject(new Error('probe: no network'));
require(${JSON.stringify(out)});
`;

const runnerPath = path.join(tmp, 'run.cjs');
fs.writeFileSync(runnerPath, polyfills);
execFileSync(process.execPath, [runnerPath], { stdio: 'inherit' });
