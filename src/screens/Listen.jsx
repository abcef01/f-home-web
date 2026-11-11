import React, { useRef, useState } from 'react';
import { api } from '../api.js';
import { analyzeSong } from '../lib/audio-notes.js';

/* 一起听：选一个音频文件，本地分析结构，再发给他 */
export default function Listen({ onGo }) {
  const [file, setFile] = useState(null);
  const [music, setMusic] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState('');
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  async function pick(f) {
    if (!f) return;
    setFile(f);
    setMusic(null);
    setErr('');
    setSent('');
    setBusy(true);
    try {
      const buf = await f.arrayBuffer();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const audio = await ctx.decodeAudioData(buf);
      await ctx.close().catch(() => {});

      const ch = audio.getChannelData(0);
      const m = analyzeSong(ch, audio.sampleRate, { maxSeconds: 180 });
      if (m.error) throw new Error(m.error);
      m.fileName = f.name.replace(/\.[^.]+$/, '').slice(0, 40);
      setMusic(m);
    } catch (e) {
      setErr(e.message.includes('decode') ? '这个格式解不开，试试 mp3 或 m4a' : e.message);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!music || busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await api.chat({ message: '（发来一首歌）', music });
      setSent((r.replies || []).map((x) => x.content).join('\n'));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const mm = music ? `${Math.floor(music.duration / 60)}:${String(music.duration % 60).padStart(2, '0')}` : '';

  return (
    <div className="reader-shell">
      <div className="reader-top">
        <button className="back" onClick={() => onGo('home')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div className="reader-title">一起听</div>
        <button className="reader-btn" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? '…' : '选歌'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>

      <div className="listen-body">
        {!music && !busy && (
          <div className="hint-line">
            选一个音频文件（mp3 / m4a / wav）。它在浏览器里分析这首歌的调性、速度、和弦走向，然后把「听起来的样子」告诉它。
            <br />
            <br />
            它听不到歌词——想让它知道在唱什么，你得自己说。
          </div>
        )}

        {busy && !music && <div className="hint-line">正在分析…</div>}

        {music && (
          <div className="song-detail">
            <div className="song-title">{music.fileName}</div>
            <div className="song-line">
              {mm} · {music.bpm} BPM · {music.key}
            </div>
            <div className="song-chords">
              {(music.progression || []).slice(0, 8).map((c) => c.name).join(' → ')}
            </div>
            <div className="song-tags">
              <span>音色偏{music.brightness}</span>
              <span>密度 {music.density}/秒</span>
              <span>起伏 {music.dynamics?.range > 0.25 ? '明显' : '不大'}</span>
            </div>
            <button className="fish-tell" onClick={send} disabled={busy}>
              {busy ? '…' : '发给他'}
            </button>
          </div>
        )}

        {sent && (
          <div className="listen-reply">
            <div className="gl">他说</div>
            <div>{sent}</div>
          </div>
        )}

        {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      </div>
    </div>
  );
}
