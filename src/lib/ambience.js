/**
 * 听你那儿多吵
 * ------------------------------------------------------------
 * 浏览器拿不到真正的声压级（那要标定过的麦克风），
 * 只能算 dBFS（相对数字满刻度），再按常见手机麦克风灵敏度粗映射成"大概多少分贝"。
 *
 * 所以给的是量级判断：安静 / 正常 / 有点吵 / 很吵，以及跟「你平时」比。
 */

/* dBFS → 粗略 dB SPL。手机麦克风没有标定，这个偏移是经验值 */
const DB_OFFSET = 100;

function rmsToDbfs(rms) {
  return rms > 0 ? 20 * Math.log10(rms) : -100;
}

/**
 * 测一段时间的环境声
 * @param {AudioContext} ctx
 * @param {MediaStream} stream
 * @param {number} ms 采样时长
 */
export async function measureAmbience(ctx, stream, ms = 6000) {
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);

  const buf = new Float32Array(analyser.fftSize);
  const levels = [];
  const centroids = [];
  const started = Date.now();

  return new Promise((resolve) => {
    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      levels.push(rms);

      /* 频谱质心：判断低频轰鸣还是人声 */
      const freq = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(freq);
      let num = 0;
      let den = 0;
      const nyquist = ctx.sampleRate / 2;
      for (let i = 1; i < freq.length; i++) {
        const mag = Math.pow(10, freq[i] / 20);
        num += (i / freq.length) * nyquist * mag;
        den += mag;
      }
      if (den > 0) centroids.push(num / den);

      if (Date.now() - started >= ms) {
        clearInterval(timer);
        try {
          src.disconnect();
        } catch {
          /* ignore */
        }
        resolve(summarize(levels, centroids));
      }
    }, 100);
  });
}

function summarize(levels, centroids) {
  if (!levels.length) return null;

  const sorted = [...levels].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const floor = sorted[Math.floor(sorted.length * 0.1)];

  const db = Math.round(rmsToDbfs(p50) + DB_OFFSET);
  const peakDb = Math.round(rmsToDbfs(p95) + DB_OFFSET);
  const floorDb = Math.round(rmsToDbfs(floor) + DB_OFFSET);
  const centroid = centroids.length ? centroids.reduce((a, b) => a + b, 0) / centroids.length : 0;

  let label = '正常';
  if (db < 40) label = '很安静';
  else if (db < 52) label = '安静';
  else if (db < 62) label = '有点吵';
  else if (db < 72) label = '挺吵的';
  else label = '非常吵';

  let texture = '混在一起的声音';
  if (centroid && centroid < 700) texture = '低频的嗡嗡声';
  else if (centroid > 2600) texture = '偏高频的尖声';
  else if (centroid >= 700 && centroid <= 2600) texture = '人声或日常背景声';

  return {
    db,
    peakDb,
    floorDb,
    label,
    texture,
    centroid: Math.round(centroid),
    seconds: Number((levels.length * 0.1).toFixed(1))
  };
}

/* 一次性测：自己开麦克风，测完就关 */
export async function listenAmbience(ms = 6000) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const result = await measureAmbience(ctx, stream, ms);
    return result;
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    await ctx.close().catch(() => {});
  }
}
