/**
 * 粗检查：前端文件里有没有「用了但没导入」的符号
 * 跑法：node scripts/check-imports.mjs
 *
 * 起因：Chat.jsx 曾经引用了 pillApi 却没 import，
 * 打包不报错、打开就白屏。这个脚本专门抓这类问题。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');

const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(jsx?|mjs)$/.test(p)) files.push(p);
  }
})(root);

/* 我们自己模块导出的名字 */
const libSymbols = [
  'speak', 'stopSpeak', 'listen', 'listenStream', 'listenSupported', 'speechSupported',
  'chineseVoices', 'onVoicesReady', 'analyzeSong', 'createToneMeter', 'listenAmbience',
  'refreshLocation', 'startLocationSync', 'canUseLocation', 'takeSharedImage',
  'startDeviceReporting', 'reportDevice', 'readNativeStatus', 'nativeAvailable',
  'api', 'auth', 'authApi', 'uiSettings', 'chatSettings', 'conversations', 'chatStream',
  'stickersApi', 'avatarsApi', 'watchApi', 'heartbeatApi', 'deviceApi', 'factsApi',
  'memoryApi', 'pillApi', 'placeApi', 'callApi', 'drivesApi'
];

let problems = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const imported = new Set();
  for (const m of src.matchAll(/import\s+\{([^}]+)\}\s+from/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name) imported.add(name);
    }
  }
  for (const m of src.matchAll(/import\s+(\w+)\s+from/g)) imported.add(m[1]);

  const defined = new Set();
  for (const m of src.matchAll(/(?:function|const|let|class)\s+(\w+)/g)) defined.add(m[1]);

  /* 去掉 import 行和注释，避免误报 */
  const body = src
    .split('\n')
    .filter((l) => !/^\s*import\s/.test(l))
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');

  for (const sym of libSymbols) {
    if (!new RegExp('(^|[^.\\w])' + sym + '\\s*[({.]', 'm').test(body)) continue;
    if (imported.has(sym) || defined.has(sym)) continue;
    console.log(`⚠️  ${path.relative(root, file)} 用了 ${sym}，但没导入`);
    problems++;
  }
}

console.log(problems ? `\n共 ${problems} 处可疑` : '\n✅ 没有发现未导入的符号');
process.exit(problems ? 1 : 0);
