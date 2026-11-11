/**
 * 听你的语气
 * ------------------------------------------------------------
 * 思路来自 ears / ace-ears / seven-ears：不从字面读情绪，
 * 而是拿「你这次怎么说」跟「你平时怎么说」比。
 *
 * 浏览器里能测的：
 *   · 音量（你声音比平时小 → 可能累了/低落）
 *   · 语速（字/秒，从识别结果的时间算）
 *   · 停顿（停了多久、停了几次）
 *   · 音高变化（声音有没有起伏，平 = 没精神）
 *
 * 不上模型、不上传音频，只传几个数字。
 */

export function createToneMeter() {
  let ctx = null;
  let analyser = null;
  let data = null;
  let timer = null;
  let samples = [];
  let speaking = false;
  let pauseStart = 0;
  let pauses = [];
  let pitchSamples = [];

  function start(stream) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      data = new Float32Array(analyser.fftSize);

      timer = setInterval(tick, 100);
      return true;
    } catch {
      return false;
    }
  }

  function rms(buf) {
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }

  /* 自相关粗估基频：够判断「有没有起伏」，不需要精确到音分 */
  function pitch(buf, sampleRate) {
    let best = -1;
    let bestLag = -1;
    const minLag = Math.floor(sampleRate / 400);
    const maxLag = Math.floor(sampleRate / 70);

    for (let lag = minLag; lag < maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < buf.length - lag; i += 4) corr += buf[i] * buf[i + lag];
      if (corr > best) {
        best = corr;
        bestLag = lag;
      }
    }
    return bestLag > 0 ? sampleRate / bestLag : 0;
  }

  function tick() {
    if (!analyser) return;
    analyser.getFloatTimeDomainData(data);

    const level = rms(data);
    samples.push(level);

    const loudEnough = level > 0.012;
    if (loudEnough) {
      if (!speaking) {
        if (pauseStart) {
          pauses.push(Date.now() - pauseStart);
          pauseStart = 0;
        }
        speaking = true;
      }
      const p = pitch(data, ctx.sampleRate);
      if (p > 70 && p < 400) pitchSamples.push(p);
    } else if (speaking) {
      speaking = false;
      pauseStart = Date.now();
    }
  }

  function reset() {
    samples = [];
    pauses = [];
    pitchSamples = [];
    speaking = false;
    pauseStart = 0;
  }

  /* 取这次说话的统计 */
  function read() {
    if (!samples.length) return null;

    const voiced = samples.filter((s) => s > 0.012);
    const avg = voiced.length ? voiced.reduce((a, b) => a + b, 0) / voiced.length : 0;

    const meanPitch = pitchSamples.length ? pitchSamples.reduce((a, b) => a + b, 0) / pitchSamples.length : 0;
    let pvar = 0;
    if (pitchSamples.length > 1) {
      const v = pitchSamples.reduce((a, b) => a + (b - meanPitch) ** 2, 0) / pitchSamples.length;
      pvar = Math.sqrt(v) / (meanPitch || 1);
    }

    return {
      volume: Number(avg.toFixed(4)),
      pitch: Math.round(meanPitch),
      pitchVar: Number(pvar.toFixed(3)),
      pauses: pauses.length,
      pauseMs: pauses.reduce((a, b) => a + b, 0),
      samples: samples.length
    };
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    try {
      ctx?.close();
    } catch {
      /* ignore */
    }
    ctx = null;
    analyser = null;
  }

  return { start, stop, reset, read };
}
