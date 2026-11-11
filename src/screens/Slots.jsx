import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';

/* 老虎机：展开在「一起玩」里，不跳页。
   转完直接把结果告诉他，你不用再点发送。 */
const DIM_ORDER = ['scenario', 'physical', 'mental', 'position', 'props', 'roleplay', 'gore'];
const DIM_CN = { position: '体位', scenario: '场景', props: '道具', roleplay: '设定', physical: '物理', mental: '精神', gore: '重口' };

export default function Slots() {
  const [dims, setDims] = useState([]);
  const [picked, setPicked] = useState(['scenario', 'physical', 'mental']);
  const [reels, setReels] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [reply, setReply] = useState('');
  const [err, setErr] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    api
      .slotsTags()
      .then((r) => setDims(r.dimensions || []))
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => () => timerRef.current && clearInterval(timerRef.current), []);

  const shown = useMemo(
    () => DIM_ORDER.map((id) => dims.find((d) => d.id === id)).filter((d) => d && picked.includes(d.id)),
    [dims, picked]
  );

  function toggle(id) {
    if (id === 'gore' && !picked.includes('gore')) {
      if (!window.confirm('重口维度包含极端内容（切割、断面图等），确定要开？')) return;
    }
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    setResult(null);
    setReply('');
  }

  function spin() {
    if (!dims.length || spinning) return;
    const chosen = DIM_ORDER.map((id) => dims.find((d) => d.id === id)).filter((d) => d && picked.includes(d.id));
    if (!chosen.length) return setErr('至少选一个转盘');

    setSpinning(true);
    setResult(null);
    setReply('');
    setErr('');

    let ticks = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      ticks += 1;
      setReels(chosen.map((d) => d.tags[Math.floor(Math.random() * d.tags.length)]));
      if (ticks >= 16) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        const final = chosen.map((d) => ({ dim: d, tag: d.tags[Math.floor(Math.random() * d.tags.length)] }));
        setReels(final.map((f) => f.tag));
        setSpinning(false);
        setResult(final);
        tell(final);
      }
    }, 70);
  }

  /* 转完自动告诉他 */
  async function tell(list) {
    const text = list.map((r) => `${DIM_CN[r.dim.id] || r.dim.zh}：${r.tag.zh}`).join('\n');
    try {
      const r = await api.chat({ message: `（刚转了一把老虎机，转到的结果是：\n${text}\n）` });
      setReply((r.replies || []).map((x) => x.content).join('\n'));
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="fish-panel">
      <div className="fish-status">🎰 概不退换　转到什么就是什么</div>

      <div className="slot-dims">
        {DIM_ORDER.map((id) => {
          const d = dims.find((x) => x.id === id);
          if (!d) return null;
          return (
            <button key={id} className={'slot-dim' + (picked.includes(id) ? ' on' : '')} onClick={() => toggle(id)}>
              {DIM_CN[id] || d.zh}
            </button>
          );
        })}
      </div>

      <div className="slot-machine">
        {shown.map((d, i) => (
          <div className="slot-reel" key={d.id}>
            <div className={'slot-face' + (spinning ? ' spin' : '')}>{reels[i]?.zh || '—'}</div>
            <div className="slot-dim-name">{DIM_CN[d.id] || d.zh}</div>
          </div>
        ))}
      </div>

      <div className="fish-actions">
        <button onClick={spin} disabled={spinning || !dims.length}>
          {spinning ? '转…' : '拉一下'}
        </button>
      </div>

      {result && (
        <div className="slot-result">
          {result.map((r) => (
            <div key={r.dim.id} className="slot-line">
              <span>{DIM_CN[r.dim.id] || r.dim.zh}</span>
              <b>{r.tag.zh}</b>
            </div>
          ))}
        </div>
      )}

      {reply && (
        <div className="listen-reply">
          <div className="gl">他说</div>
          <div>{reply}</div>
        </div>
      )}

      <div className="hint-line">结果已经自动发给他了。真不想做就说「404」，全部停止。</div>
      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
    </div>
  );
}
