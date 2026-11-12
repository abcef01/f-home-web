import React, { useEffect, useState } from 'react';
import { questsApi } from '../api.js';

/* 约定：任务 / 积分 / 连击（原来放在游戏里，挪到"仪式"这边） */
export default function Quests() {
  const [q, setQ] = useState(null);
  const [title, setTitle] = useState('');
  const [points, setPoints] = useState(5);
  const [proof, setProof] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    questsApi.list().then(setQ).catch((e) => setErr(e.message));
  }, []);

  async function run(fn) {
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await fn();
      setQ(r);
      if (r.approved !== undefined) setMsg(r.approved ? r.comment || '过了' : r.comment || '没通过');
      else if (r.reward) setMsg('兑换了：' + r.reward.name);
      else setMsg('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!q) return <div className="hint-line">读取中…</div>;

  return (
    <div className="quests-box">
      <div className="score">
        <b>{q.points}</b>
        <span>连击 {q.streak.count} 天（最长 {q.streak.best || 0}）</span>
      </div>

      {q.open.length === 0 && <div className="hint-line">手上没有约定。</div>}

      {q.open.map((t) => (
        <div key={t.id} className="quest-item">
          <div className="quest-line">
            <span>{t.title}</span>
            <b>{t.points} 分</b>
            {t.status === 'submitted' && <i>待审</i>}
          </div>

          {t.status === 'open' && (
            <div className="fact-add" style={{ marginTop: 6 }}>
              <input
                placeholder="做到什么程度，写一句"
                value={proof[t.id] || ''}
                onChange={(e) => setProof((p) => ({ ...p, [t.id]: e.target.value }))}
              />
              <button disabled={busy || !(proof[t.id] || '').trim()} onClick={() => run(() => questsApi.submit(t.id, proof[t.id]))}>
                保存
              </button>
            </div>
          )}

          {t.status === 'submitted' && (
            <button className="quest-review" disabled={busy} onClick={() => run(() => questsApi.review(t.id))}>
              让他审
            </button>
          )}
        </div>
      ))}

      <button className="quest-review" disabled={busy} onClick={() => run(() => questsApi.ideateQ())}>
        让他定一个
      </button>

      <div className="fact-add">
        <input value={title} placeholder="约定一件事，比如：每天喝够水" onChange={(e) => setTitle(e.target.value)} />
        <input
          style={{ maxWidth: 64 }}
          value={points}
          onChange={(e) => setPoints(Number(e.target.value) || 5)}
        />
        <button
          disabled={busy || !title.trim()}
          onClick={() =>
            run(async () => {
              const r = await questsApi.create(title.trim(), points);
              setTitle('');
              return r;
            })
          }
        >
          约定
        </button>
      </div>

      {q.rewards?.length > 0 && (
        <div className="quest-rewards">
          {q.rewards.map((r) => (
            <button key={r.id} disabled={busy || q.points < r.cost} onClick={() => run(() => questsApi.redeem(r.id))}>
              {r.name} {r.cost}
            </button>
          ))}
        </div>
      )}

      {q.achievements?.length > 0 && <div className="hint-line">成就：{q.achievements.join('、')}</div>}
      {msg && <div className="hint-line">{msg}</div>}
      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
    </div>
  );
}
