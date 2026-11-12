/**
 * 唱一段：分析人声
 * ------------------------------------------------------------
 * 不做语音识别（那要另一套模型），只量"唱"这件事本身：
 *   · 音高走向（你是不是越唱越高）
 *   · 音域（最低到最高几个半音）
 *   · 稳定性（抖不抖、颤音）
 *   · 大致节奏密度
 *   · 有没有明显跑调（相对自己的主音）
 *
 * 结论给成描述，不给数字——跟发歌那一套保持一致。
 */

const A4 = 440;

function hzToSemis(hz, base) {
  return 12 * Math.log2(hz / base);
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/* 自相关找基频 */
function pitchAt(buf, sampleRate, start, size) {
  let rms = 0;
  for (let i = 0; i < size; i++) {
    const v = buf[start + i] || 0;
    rms += v * v;
  }
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) return { hz: 0, rms };

  const minLag = Math.floor(sampleRate / 1000);
  const maxLag = Math.floor(sampleRate / 70);

  let bestLag = -1;
  let bestCorr = 0;

  for (let lag = minLag; lag < maxLag; lag++) {
    let corr = 0;
    let norm = 0;
    for (let i = 0; i < size - lag; i++) {
      const a = buf[start + i];
      const b = buf[start + i + lag];
      corr += a * b;
      norm += a * a + b * b;
    }
    const c = norm > 0 ? (2 * corr) / norm : 0;
    if (c > bestCorr) {
      bestCorr = c;
      bestLag = lag;
    }
  }

  if (bestLag < 0 || bestCorr < 0.5) return { hz: 0, rms };
  return { hz: sampleRate / bestLag, rms, clarity: bestCorr };
}

export function analyzeSing(samples, sampleRate, { maxSeconds = 30 } = {}) {
  const total = Math.min(samples.length, Math.floor(sampleRate * maxSeconds));
  const frame = 2048;
  const hop = 1024;

  const pitches = [];
  let loudSum = 0;
  let loudCount = 0;
  let onsets = 0;
  let prevRms = 0;

  for (let start = 0; start + frame < total; start += hop) {
    const { hz, rms, clarity } = pitchAt(samples, sampleRate, start, frame);
    loudSum += rms;
    loudCount++;
    if (rms > prevRms * 1.6 && rms > 0.02) onsets++;
    prevRms = rms;

    if (hz > 60 && hz < 1100 && clarity > 0.55) pitches.push(hz);
  }

  const duration = Math.round((total / sampleRate) * 10) / 10;
  if (!pitches.length) {
    return {
      duration,
      voiced: false,
      note: '基本没听到稳定的人声——可能是哼得太轻、离麦太远，或者全程没在音高上。'
    };
  }

  /* 主音：取中位数附近 */
  const sorted = [...pitches].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const base = median;
  let semis = pitches.map((h) => hzToSemis(h, base));

  /* 自相关偶尔会把音判到上下八度，先把离群的点去掉 */
  semis = semis.filter((x) => Math.abs(x) <= 14);
  if (semis.length < 4) semis = pitches.map((h) => hzToSemis(h, base));

  const sortedS = [...semis].sort((a, b) => a - b);
  const pct = (q) => sortedS[Math.min(sortedS.length - 1, Math.floor(q * sortedS.length))];
  const min = pct(0.05);
  const max = pct(0.95);
  const range = Math.round((max - min) * 10) / 10;

  /* 抖动：相邻半音差的平均绝对值 */
  let jitter = 0;
  for (let i = 1; i < semis.length; i++) jitter += Math.abs(semis[i] - semis[i - 1]);
  jitter = semis.length > 1 ? jitter / (semis.length - 1) : 0;

  /* 走向：前半段 vs 后半段的平均 */
  const half = Math.floor(semis.length / 2);
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const first = avg(semis.slice(0, half) || [0]);
  const last = avg(semis.slice(half) || [0]);
  const drift = Math.round((last - first) * 10) / 10;

  const noteName = NOTE_NAMES[((Math.round(hzToSemis(median, 440 * Math.pow(2, -9 / 12))) % 12) + 12) % 12];

  const desc = [];
  desc.push(`时长约 ${duration} 秒，能听出稳定的人声。`);
  desc.push(`大致在这个调上（约 ${noteName} 附近），音域跨了 ${range} 个半音——${range < 3 ? '很窄，几乎是念' : range < 7 ? '不大，像说话多一点' : range < 12 ? '正常一首歌的宽度' : '拉得很开'}。`);
  desc.push(
    jitter < 0.6
      ? '音高很稳，几乎不抖。'
      : jitter < 1.4
      ? '有一点自然的晃。'
      : '抖动比较明显，可能是紧张或者气不够。'
  );
  if (Math.abs(drift) > 1.2) {
    desc.push(drift > 0 ? '后半段整体往上走了，越唱越高。' : '后半段慢慢沉下去了，越唱越低。');
  }
  if (onsets > 6) desc.push('换音很密，节奏偏快。');
  else if (onsets > 2) desc.push('换音不快，偏慢。');

  return {
    duration,
    voiced: true,
    noteName,
    range,
    jitter: Math.round(jitter * 100) / 100,
    drift,
    onsets,
    text: desc.join('')
  };
}
