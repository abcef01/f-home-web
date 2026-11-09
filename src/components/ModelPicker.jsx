import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function ModelPicker() {
  const [channels, setChannels] = useState([]);
  const [current, setCurrent] = useState(null);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [ch, cur] = await Promise.all([api.channels(), api.currentModel()]);
        setChannels(ch);
        setCurrent(cur);
        const chName = cur.channel || 'chat';
        setModels(await api.models(chName).catch(() => []));
      } catch (e) {
        setErr('连不上后端：' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function pickChannel(name) {
    setErr('');
    setMsg('');
    setCurrent((c) => ({ ...c, channel: name }));
    try {
      setModels(await api.models(name));
    } catch (e) {
      setModels([]);
      setErr('这个通道暂时取不到模型列表：' + e.message);
    }
  }

  async function pickModel(model) {
    setErr('');
    setMsg('');
    const channel = current?.channel || 'chat';
    setCurrent({ channel, model });
    try {
      await api.setModel(channel, model);
      setMsg('已切换，下一句就会用新的');
      setTimeout(() => setMsg(''), 2600);
    } catch (e) {
      setErr('切换失败：' + e.message);
    }
  }

  if (loading) return <div className="hint-line">正在读取模型列表…</div>;

  return (
    <div className="model-picker">
      <div className="seg" style={{ flexWrap: 'wrap' }}>
        {channels.map((c) => (
          <button
            key={c.name}
            className={current?.channel === c.name ? 'on' : ''}
            disabled={!c.configured}
            onClick={() => c.configured && pickChannel(c.name)}
            title={c.configured ? c.base : '这个通道还没配密钥'}
          >
            {c.label}
            {c.configured ? '' : ' ·未配'}
          </button>
        ))}
      </div>

      <div className="model-list">
        {models.length === 0 && <div className="hint-line">没有可用的模型</div>}
        {models.map((m) => (
          <button
            key={m}
            className={'model-chip' + (current?.model === m ? ' on' : '')}
            onClick={() => pickModel(m)}
          >
            {m}
          </button>
        ))}
      </div>

      {msg && <div className="hint-line" style={{ color: 'var(--accent-deep)' }}>{msg}</div>}
      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      <div className="hint-line">
        当前：<b>{current?.model || '—'}</b>
        {current?.channel ? ` · ${channels.find((c) => c.name === current.channel)?.label || current.channel}` : ''}
      </div>
    </div>
  );
}
