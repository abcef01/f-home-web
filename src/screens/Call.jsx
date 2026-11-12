import React, { useEffect, useRef, useState } from 'react';
import { callApi, callFrameApi } from '../api.js';
import { speak, stopSpeak, listenStream, listenSupported } from '../lib/speech.js';
import { createToneMeter } from '../lib/tone.js';

/**
 * 通话界面
 * ------------------------------------------------------------
 * 拨号 → 响铃 → 接通 → 说话 → 挂断 → 摘要
 * 它不是真的打电话，是把这个过程做出来。
 */
export default function Call({ voice = {}, onClose }) {
  const [phase, setPhase] = useState('dialing'); // dialing | ringing | talking | ending | done
  const [seconds, setSeconds] = useState(0);
  const [lines, setLines] = useState([]);
  const [interim, setInterim] = useState('');
  const [muted, setMuted] = useState(false);
  const [summary, setSummary] = useState('');
  const [err, setErr] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [frameNote, setFrameNote] = useState('');
  const [frameEvery, setFrameEvery] = useState(5);
  const [frameMode, setFrameMode] = useState('frame'); // frame | stream

  const recRef = useRef(null);
  const audioCtxRef = useRef(null);
  const busyRef = useRef(false);
  const phaseRef = useRef('dialing');
  const meterRef = useRef(null);
  const micRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameTimer = useRef(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /* 关摄像头 */
  function stopCamera() {
    if (frameTimer.current) clearInterval(frameTimer.current);
    frameTimer.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  /* 每 20 秒抓一帧给他看 */
  function grabFrame() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement('canvas');
    const w = frameMode === 'stream' ? 320 : 480;
    const h = Math.round((v.videoHeight / v.videoWidth) * w);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(v, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', frameMode === 'stream' ? 0.5 : 0.7);

    callFrameApi
      .send(dataUrl)
      .then((r) => {
        if (r?.desc) setFrameNote(r.desc.slice(0, 90));
      })
      .catch(() => {});
  }

  async function toggleCamera() {
    if (cameraOn) {
      stopCamera();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
      setTimeout(grabFrame, 1200);
      frameTimer.current = setInterval(grabFrame, Math.max(1.5, frameEvery) * 1000);
    } catch (e) {
      setErr('打不开摄像头：' + (e.message || ''));
    }
  }

  useEffect(() => () => stopCamera(), []);

  /* 改间隔/模式：重设定时器 */
  useEffect(() => {
    if (!cameraOn) return;
    if (frameTimer.current) clearInterval(frameTimer.current);
    frameTimer.current = setInterval(grabFrame, Math.max(1.5, frameEvery) * 1000);
  }, [frameEvery, frameMode]);

  /* 响铃：两声回铃音，然后接通 */
  useEffect(() => {
    let cancelled = false;
    const ring = async () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        const beep = (delay, freq = 425) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = freq;
          o.type = 'sine';
          g.gain.value = 0;
          o.connect(g).connect(ctx.destination);
          o.start(ctx.currentTime + delay);
          g.gain.setValueAtTime(0, ctx.currentTime + delay);
          g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + delay + 0.05);
          g.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 0.8);
          o.stop(ctx.currentTime + delay + 0.85);
        };
        beep(0);
        beep(1.1);
        await new Promise((r) => setTimeout(r, 2200));
        if (cancelled) return;
        setPhase('talking');
      } catch {
        setPhase('talking');
      }
    };

    setPhase('ringing');
    callApi
      .start({ reason: '想听听你的声音' })
      .then(() => {
        if (!cancelled) ring();
      })
      .catch((e) => setErr(e.message));

    return () => {
      cancelled = true;
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  /* 通话计时 */
  useEffect(() => {
    if (phase !== 'talking') return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  /* 接通：它先开口，然后开始听 */
  useEffect(() => {
    if (phase !== 'talking') return;

    /* 单独开一路麦克风做语气分析（识别那一路拿不到音频） */
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        micRef.current = stream;
        const meter = createToneMeter();
        if (meter.start(stream)) meterRef.current = meter;
      })
      .catch(() => {});

    say('喂？').then(() => startListening());

    return () => {
      cancelled = true;
      recRef.current?.stop();
      recRef.current = null;
      meterRef.current?.stop();
      meterRef.current = null;
      micRef.current?.getTracks().forEach((t) => t.stop());
      micRef.current = null;
    };
  }, [phase]);

  async function say(text) {
    setLines((l) => [...l, { role: 'ta', text }]);
    await new Promise((resolve) => {
      speak(text, { rate: voice.rate || 1, voiceName: voice.name || '' });
      const wait = Math.min(20000, 900 + text.length * 200);
      setTimeout(resolve, wait);
    });
  }

  function startListening() {
    if (!listenSupported() || phaseRef.current !== 'talking') return;
    recRef.current?.stop();
    recRef.current = listenStream({
      onPartial: (t) => setInterim(t),
      onFinal: async (text) => {
        setInterim('');
        if (busyRef.current || phaseRef.current !== 'talking') return;
        busyRef.current = true;
        recRef.current?.stop();
        recRef.current = null;

        setLines((l) => [...l, { role: 'me', text }]);

        /* 取这一段说话的语气，然后清零重新计 */
        const tone = meterRef.current?.read() || null;
        meterRef.current?.reset();

        try {
          const r = await callApi.turn(text, false, tone);
          if (r.reply) {
            setLines((l) => [...l, { role: 'ta', text: r.reply }]);
            speak(r.reply, { rate: voice.rate || 1, voiceName: voice.name || '' });
            await new Promise((res) => setTimeout(res, Math.min(20000, 900 + r.reply.length * 200)));
          }
          if (r.hangUp) {
            /* 万一它没好好告别，补一句再挂 */
            const bye = /拜拜|晚安|挂了|晚安啦|明儿见|回头聊|早点睡|快去睡/;
            if (r.reply && !bye.test(r.reply)) {
              const extra = '我挂了啊，拜拜。';
              setLines((l) => [...l, { role: 'ta', text: extra }]);
              speak(extra, { rate: voice.rate || 1, voiceName: voice.name || '' });
              await new Promise((res) => setTimeout(res, 2200));
            }
            setPhase('ending');
            busyRef.current = false;
            finish();
            return;
          }
        } catch (e) {
          setErr(e.message);
        }
        busyRef.current = false;
        if (phaseRef.current === 'talking') startListening();
      },
      onError: () => {
        /* 听不到就继续听，不打断通话 */
      }
    });
  }

  async function finish() {
    recRef.current?.stop();
    recRef.current = null;
    stopSpeak();
    setPhase('ending');
    try {
      const r = await callApi.end();
      setSummary(r.summary || '');
      setPhase('done');
      if (r.summary) speak('挂了。' + r.summary.slice(0, 30), { rate: voice.rate || 1 });
    } catch (e) {
      setErr(e.message);
      setPhase('done');
    }
  }

  async function hangUp() {
    if (phase !== 'talking') return finish();

    /* 交给它说最后一句，而不是由界面硬切 */
    recRef.current?.stop();
    recRef.current = null;
    stopSpeak();
    setPhase('ending');
    try {
      const r = await callApi.turn('（我这边要挂电话了）', true);
      if (r.reply) {
        setLines((l) => [...l, { role: 'me', text: '那我先挂了。' }]);
        setLines((l) => [...l, { role: 'ta', text: r.reply }]);
        speak(r.reply, { rate: voice.rate || 1, voiceName: voice.name || '' });
        await new Promise((res) => setTimeout(res, Math.min(20000, 900 + r.reply.length * 200)));
      }
    } catch {
      /* 模型没回也照样挂 */
    }
    finish();
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="call-overlay">
      <div className="call-top">
        <div className="call-name">Elliott</div>
        <div className="call-state">
          {phase === 'dialing' && '正在拨号…'}
          {phase === 'ringing' && '回铃中…'}
          {phase === 'talking' && `${mm}:${ss}`}
          {phase === 'ending' && '挂断中…'}
          {phase === 'done' && '已挂断'}
        </div>
      </div>

      {cameraOn && (
        <div className="call-cam-settings">
          <div className="ccs-row">
            <button className={frameMode === 'frame' ? 'on' : ''} onClick={() => setFrameMode('frame')}>
              帧
            </button>
            <button className={frameMode === 'stream' ? 'on' : ''} onClick={() => setFrameMode('stream')}>
              视频流
            </button>
          </div>
          <div className="ccs-row">
            {[2, 5, 10, 20].map((n) => (
              <button key={n} className={frameEvery === n ? 'on' : ''} onClick={() => setFrameEvery(n)}>
                {n}s
              </button>
            ))}
          </div>
        </div>
      )}

      {cameraOn && (
        <div className="call-cam">
          <video ref={videoRef} muted playsInline />
          {frameNote && <div className="call-cam-note">{frameNote}</div>}
        </div>
      )}

      <div className="call-body">
        {lines.slice(-6).map((l, i) => (
          <div key={i} className={'call-line ' + l.role}>
            {l.text}
          </div>
        ))}
        {interim && <div className="call-line me interim">{interim}</div>}
        {summary && (
          <div className="call-summary">
            <div className="call-summary-title">通话摘要</div>
            <div>{summary}</div>
          </div>
        )}
        {err && <div className="call-line" style={{ color: '#b4553f' }}>{err}</div>}
      </div>

      <div className="call-actions">
        {phase === 'done' ? (
          <button className="call-btn end" onClick={onClose}>
            挂断
          </button>
        ) : (
          <>
            <button
              className={'call-btn' + (cameraOn ? ' on' : '')}
              onClick={toggleCamera}
              title="视频"
            >
              {cameraOn ? '关镜头' : '开镜头'}
            </button>
            <button
              className={'call-btn mute' + (muted ? ' on' : '')}
              onClick={() => {
                setMuted((m) => !m);
                if (!muted) {
                  recRef.current?.stop();
                  recRef.current = null;
                } else if (phaseRef.current === 'talking') {
                  startListening();
                }
              }}
            >
              {muted ? '取消静音' : '静音'}
            </button>
            <button className="call-btn end" onClick={hangUp}>
              挂断
            </button>
          </>
        )}
      </div>
    </div>
  );
}
