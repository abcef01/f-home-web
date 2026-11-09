import React, { useEffect, useState } from 'react';
import { chatSettings } from '../api.js';

export default function ChatSettings() {
  const [params, setParams] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setParams(await chatSettings.get());
      } catch (e) {
        setErr('读不到参数：' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setErr('');
    try {
      const saved = await chatSettings.save({
        systemPrompt: params.systemPrompt,
        temperature: params.temperature,
        contextRounds: params.contextRounds
      });
      setParams(saved);
      setMsg('已保存，下一句就生效');
      setTimeout(() => setMsg(''), 2600);
    } catch (e) {
      setErr('保存失败：' + e.message);
    }
  }

  if (loading) return <div className="hint-line">正在读取对话参数…</div>;
  if (!params) return <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>;

  return (
    <div className="param-box">
      <button className="param-toggle" onClick={() => setOpen((v) => !v)}>
        <span>{open ? '收起人设与参数' : '展开人设与参数'}</span>
        <span className={'chev2' + (open ? ' up' : '')}>›</span>
      </button>

      {open && (
        <>
          <div className="param-label">人设（系统提示词）</div>
          <textarea
            className="param-textarea"
            rows={6}
            value={params.systemPrompt}
            onChange={(e) => setParams({ ...params, systemPrompt: e.target.value })}
          />
          <div className="hint-line">这段决定它是谁、怎么说话。改完记得保存。</div>

          <div className="param-label">
            温度 <span className="param-val">{params.temperature.toFixed(2)}</span>
          </div>
          <input
            className="range"
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={params.temperature}
            onChange={(e) => setParams({ ...params, temperature: Number(e.target.value) })}
          />
          <div className="hint-line">低一点更稳、更克制；高一点更松散、更有惊喜。</div>

          <div className="param-label">
            上下文轮数 <span className="param-val">{params.contextRounds}</span>
          </div>
          <input
            className="range"
            type="range"
            min="2"
            max="30"
            step="1"
            value={params.contextRounds}
            onChange={(e) => setParams({ ...params, contextRounds: Number(e.target.value) })}
          />
          <div className="hint-line">每次带多少轮历史给它（1 轮 = 你说一句 + 它回一句）。</div>

          <button className="param-save" onClick={save}>
            保存
          </button>
          {msg && <div className="hint-line" style={{ color: 'var(--accent-deep)' }}>{msg}</div>}
          {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
        </>
      )}
    </div>
  );
}
