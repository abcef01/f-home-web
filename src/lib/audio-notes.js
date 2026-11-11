/**
 * 听一首歌
 * ------------------------------------------------------------
 * 借鉴 migratorywhale/whale-listen：把音频拆成「音符级」的结构——
 * 音高、时序、力度、密度、和弦、静默段——再交给语言模型去听。
 *
 * 纯算法，不调用任何模型，不需要 GPU。
 * 输入是 PCM 采样（Float32），所以浏览器和 Node 都能跑。
 */

/* ---------- FFT（radix-2） ---------- */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/* 大调/小调的调式轮廓（Krumhansl 简化版） */
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function correlate(a, b) {
  const n = a.length;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db || 1);
}

function rotate(profile, shift) {
  const out = new Array(12);
  for (let i = 0; i < 12; i++) out[i] = profile[(i - shift + 12) % 12];
  return out;
}

/**
 * 主分析入口
 * @param {Float32Array} samples 单声道 PCM
 * @param {number} sampleRate
 * @param {object} opts
 */
export function analyzeSong(samples, sampleRate, opts = {}) {
  const fftSize = 2048;
  const hop = 512;
  const maxSeconds = opts.maxSeconds || 180; // 只看前 3 分钟，够判断了

  const total = Math.min(samples.length, Math.floor(maxSeconds * sampleRate));

  /* 重采样到大约 22050，省点算力 */
  const step = Math.max(1, Math.round(sampleRate / 22050));
  const sr = sampleRate / step;
  const mono = new Float32Array(Math.floor(total / step));
  for (let i = 0; i < mono.length; i++) mono[i] = samples[i * step];

  const frames = Math.floor((mono.length - fftSize) / hop);
  if (frames < 8) return { error: '太短了，听不出什么' };

  const window = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1));

  /* 每帧：能量、chroma、频谱质心、主频 */
  const rms = [];
  const chroma = [];
  const centroid = [];
  const flux = [];
  const bassChroma = [];
  let prevSpec = null;

  for (let f = 0; f < frames; f++) {
    const off = f * hop;
    const re = new Float32Array(fftSize);
    const im = new Float32Array(fftSize);
    let e = 0;
    for (let i = 0; i < fftSize; i++) {
      const s = mono[off + i] * window[i];
      re[i] = s;
      e += s * s;
    }
    rms.push(Math.sqrt(e / fftSize));

    fft(re, im);

    const bins = fftSize / 2;
    const spec = new Float32Array(bins);
    let cNum = 0;
    let cDen = 0;
    const ch = new Float32Array(12);
    const low = new Float32Array(12);

    for (let k = 1; k < bins; k++) {
      const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      spec[k] = mag;
      const freq = (k * sr) / fftSize;
      if (freq < 60 || freq > 5000) continue;

      cNum += freq * mag;
      cDen += mag;

      /* 映射到 12 个音级 */
      const midi = 69 + 12 * Math.log2(freq / 440);
      const pc = ((Math.round(midi) % 12) + 12) % 12;
      ch[pc] += mag;
      if (freq < 260) low[pc] += mag;
    }

    /* 归一化 chroma */
    let m = 0;
    for (let i = 0; i < 12; i++) m = Math.max(m, ch[i]);
    for (let i = 0; i < 12; i++) ch[i] = m > 0 ? ch[i] / m : 0;

    chroma.push(ch);
    bassChroma.push(low);
    centroid.push(cDen > 0 ? cNum / cDen : 0);

    /* 频谱通量（用来找起音） */
    if (prevSpec) {
      let s = 0;
      for (let k = 1; k < bins; k++) {
        const d = spec[k] - prevSpec[k];
        if (d > 0) s += d;
      }
      flux.push(s);
    } else {
      flux.push(0);
    }
    prevSpec = spec;
  }

  const frameRate = sr / hop;

  /* ---------- 起音 / 速度 ---------- */
  const fluxMean = flux.reduce((a, b) => a + b, 0) / flux.length;
  const onsets = [];
  for (let i = 1; i < flux.length - 1; i++) {
    if (flux[i] > fluxMean * 1.6 && flux[i] > flux[i - 1] && flux[i] >= flux[i + 1]) {
      if (!onsets.length || (i - onsets[onsets.length - 1]) / frameRate > 0.08) onsets.push(i);
    }
  }

  /* 用起音间隔自相关估 BPM */
  let bpm = 0;
  if (onsets.length > 8) {
    const iois = [];
    for (let i = 1; i < onsets.length; i++) iois.push((onsets[i] - onsets[i - 1]) / frameRate);
    const hist = new Map();
    for (const io of iois) {
      if (io < 0.2 || io > 2.5) continue;
      const key = Math.round(io * 20) / 20;
      hist.set(key, (hist.get(key) || 0) + 1);
    }
    let best = 0;
    let bestCount = 0;
    for (const [k, v] of hist) {
      if (v > bestCount) {
        bestCount = v;
        best = k;
      }
    }
    if (best > 0) {
      let candidate = 60 / best;
      while (candidate < 70) candidate *= 2;
      while (candidate > 180) candidate /= 2;
      bpm = Math.round(candidate);
    }
  }

  /* ---------- 调性 ---------- */
  const avgChroma = new Array(12).fill(0);
  for (const ch of chroma) for (let i = 0; i < 12; i++) avgChroma[i] += ch[i] / chroma.length;

  let bestKey = { name: 'C', mode: 'major', score: -2 };
  for (let shift = 0; shift < 12; shift++) {
    const maj = correlate(avgChroma, rotate(MAJOR_PROFILE, shift));
    const min = correlate(avgChroma, rotate(MINOR_PROFILE, shift));
    if (maj > bestKey.score) bestKey = { name: NOTE_NAMES[shift], mode: 'major', score: maj };
    if (min > bestKey.score) bestKey = { name: NOTE_NAMES[shift], mode: 'minor', score: min };
  }

  /* ---------- 和弦（按 2 秒一段，取出现最多的） ---------- */
  const TRIADS = [];
  for (let root = 0; root < 12; root++) {
    TRIADS.push({ name: NOTE_NAMES[root], pcs: [root, (root + 4) % 12, (root + 7) % 12] });
    TRIADS.push({ name: NOTE_NAMES[root] + 'm', pcs: [root, (root + 3) % 12, (root + 7) % 12] });
  }

  const segLen = Math.round(frameRate * 2);
  const chords = [];
  for (let start = 0; start + segLen <= chroma.length; start += segLen) {
    const seg = new Array(12).fill(0);
    for (let i = start; i < start + segLen; i++) for (let p = 0; p < 12; p++) seg[p] += chroma[i][p];
    let best = null;
    let bestScore = -1;
    for (const t of TRIADS) {
      const score = t.pcs.reduce((a, p) => a + seg[p], 0) / 3 - (seg.reduce((a, b) => a + b, 0) - t.pcs.reduce((a, p) => a + seg[p], 0)) / 9;
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }
    if (best) chords.push({ at: Math.round(start / frameRate), name: best.name });
  }
  /* 压掉连续重复 */
  const progression = [];
  for (const c of chords) {
    if (!progression.length || progression[progression.length - 1].name !== c.name) progression.push(c);
  }

  /* ---------- 力度 / 静默 / 亮度 ---------- */
  const sorted = [...rms].sort((a, b) => a - b);
  const p10 = sorted[Math.floor(sorted.length * 0.1)] || 0;
  const p90 = sorted[Math.floor(sorted.length * 0.9)] || 0;
  const maxRms = sorted[sorted.length - 1] || 0;
  const silentThreshold = maxRms * 0.06;

  let firstSound = 0;
  while (firstSound < rms.length && rms[firstSound] < silentThreshold) firstSound++;
  let lastSound = rms.length - 1;
  while (lastSound > 0 && rms[lastSound] < silentThreshold) lastSound--;

  const avgCentroid = centroid.reduce((a, b) => a + b, 0) / centroid.length;
  const brightness = avgCentroid < 900 ? '暗' : avgCentroid < 2000 ? '中等' : '亮';

  return {
    duration: Math.round(mono.length / sr),
    bpm,
    key: `${bestKey.name} ${bestKey.mode === 'major' ? '大调' : '小调'}`,
    keyConfidence: Number(bestKey.score.toFixed(2)),
    onsets: onsets.length,
    density: Number((onsets.length / (mono.length / sr)).toFixed(2)),
    dynamics: {
      soft: Number((p10 / (maxRms || 1)).toFixed(2)),
      loud: Number((p90 / (maxRms || 1)).toFixed(2)),
      range: Number(((p90 - p10) / (maxRms || 1)).toFixed(2))
    },
    silence: {
      intro: Number((firstSound / frameRate).toFixed(1)),
      outro: Number(((rms.length - 1 - lastSound) / frameRate).toFixed(1))
    },
    brightness,
    progression: progression.slice(0, 12),
    noteCount: onsets.length
  };
}
