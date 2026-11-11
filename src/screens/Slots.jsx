import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';

/* 老虎机：转到什么就是什么，不许换。
   标签库来自 Ruota della Fortuna（MIT），gore 维度默认关。 */
const DIM_ORDER = ['scenario', 'physical', 'mental', 'position', 'props', 'roleplay', 'gore'];

export default function Slots({ onGo }) {
  const [data, setData] = useState(null);
  const [picked, setPicked] = useState(['scenario', 'physical', 'mental']);
  const [reels, setReels] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [sent, setSent] = useState('');
  const [err, setErr] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    fetch(new URL('/api/slots/tags?all=1', api.base || window.location.origin).toString())
      .catch(() => null)
      .finally(() => {});
  }, []);

  /* 直接从后端取（带鉴权）*/
  useEffect(() => {
    api
      .slotsTags()
      .then((r) => {
        setData(r.dimensions);
        setReels(r.dimensions.map((d) => d.tags[Math.floor(Math.random() * d.tags.length)]));
      })
      .catch((e) => setErr(e.message));
  }, []);

  const dims = useMemo(() => {
    if (!data) return [];
    return DIM_ORDER.map((id) => data.find((d) => d.id === id)).filter(Boolean);
  }, [data]);

  function toggle(id) {
    if (id === 'gore') {
      if (!window.confirm('gore 维度包含极端内容（切割、断面图等），确定要开？')) return;
    }
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    setResult(null);
    setSent('');
  }

  function spin() {
    if (!data || spinning) return;
    const chosen = dims.filter((d) => picked.includes(d.id));
    if (!chosen.length) return setErr('至少选一个转盘');

    setSpinning(true);
    setResult(null);
    setSent('');
    setErr('');

    let ticks = 0;
    const total = 18;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      ticks += 1;
      setReels(chosen.map((d) => d.tags[Math.floor(Math.random() * d.tags.length)]));
      if (ticks >= total) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        const final = chosen.map((d) => ({ dim: d, tag: d.tags[Math.floor(Math.random() * d.tags.length)] }));
        setReels(final.map((f) => f.tag));
        setSpinning(false);
        setResult(final);
        /* 转完就直接告诉他，不需要你再点 */
        tell(final);
      }
    }, 70);
  }

  useEffect(() => () => timerRef.current && clearInterval(timerRef.current), []);

  async function tell(res) {
    const list = res || result;
    if (!list) return;
    const text = list.map((r) => `${r.dim.zh}：${r.tag.zh}`).join('\n');
    try {
      const r = await api.chat({ message: `（刚转了一把老虎机，转到的结果是：\n${text}\n）` });
      setSent((r.replies || []).map((x) => x.content).join('\n'));
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="reader-shell">
      <div className="reader-top">
        <button className="back" onClick={() => onGo('home')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div className="reader-title">老虎机</div>
        <span className="reader-btn" style={{ border: 0 }}>概不退换</span>
      </div>

      <div className="slots-body">
        <div className="slot-dims">
          {dims.map((d) => (
            <button
              key={d.id}
              className={'slot-dim' + (picked.includes(d.id) ? ' on' : '')}
              onClick={() => toggle(d.id)}
            >
              {d.zh}
            </button>
          ))}
        </div>

        <div className="slot-machine">
          {dims
            .filter((d) => picked.includes(d.id))
            .map((d, i) => (
              <div className="slot-reel" key={d.id}>
                <div className={'slot-face' + (spinning ? ' spin' : '')}>{reels[i]?.zh || '—'}</div>
                <div className="slot-dim-name">{d.zh}</div>
              </div>
            ))}
        </div>

        <button className="slot-lever" onClick={spin} disabled={spinning || !data}>
          {spinning ? '转…' : '拉一下'}
        </button>

        {result && (
          <div className="slot-result">
            {result.map((r) => (
              <div key={r.dim.id} className="slot-line">
                <span>{r.dim.zh}</span>
                <b>{r.tag.zh}</b>
              </div>
            ))}
          </div>
        )}

        {sent && (
          <div className="listen-reply">
            <div className="gl">他说</div>
            <div>{sent}</div>
          </div>
        )}

        <div className="hint-line">
          转盘抽的是标签，不是剧本。抽到什么都不许换——真不想做，说「404」，全部停止。
        </div>
        {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      </div>
    </div>
  );
}
