/**
 * 真挂载测试：用 jsdom 真的把 App 挂起来，跑 effect。
 * 这能抓到"服务端渲染查不出来"的错误——比如 effect 里引用了没导入的变量。
 *
 * 用法：node scripts/mount-check.mjs
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
const out = path.join(tmp, 'mount.cjs');

execFileSync(
  process.execPath,
  [
    esbuild,
    path.join(here, 'mount-entry.jsx'),
    '--bundle',
    `--outfile=${out}`,
    '--loader:.jsx=jsx',
    '--platform=node',
    '--format=cjs',
    '--external:jsdom',
    '--log-level=error'
  ],
  { stdio: 'inherit' }
);

fs.writeFileSync(out, fs.readFileSync(out, 'utf8').replaceAll('import_meta.env.VITE_API_BASE', 'undefined'));

execFileSync(process.execPath, [out], { stdio: 'inherit' });
