import React, { useEffect, useState } from 'react';
import { walletApi } from '../api.js';

export default function Wallet({ onGo }) {
  const [data, setData] = useState({ balance: 0, ledger: [], wishes: [] });
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    walletApi.get().then(setData).catch((e) => setErr(e.message));
  }, []);

  async function run(fn, okMsg) {
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await fn();
      setData(r);
      if (okMsg) {
        setMsg(okMsg);
        setTimeout(() => setMsg(''), 1800);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const wanted = data.wishes.filter((x) => x.status === 'wanted');
  const done = data.wishes.filter((x) => x.status !== 'wanted');

  return (
    <div className="reader-shell">
      <div className="reader-top">
        <button className="back" onClick={() => onGo('aerie')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div className="reader-title">他的钱包</div>
      </div>

      <div className="wallet-body">
        <div className="wallet-balance">
          <b>{data.balance}</b>
          <span>枚（虚拟，不是真钱）</span>
        </div>

        <div className="wallet-transfer">
          <input
            value={amount}
            inputMode="numeric"
            placeholder="转多少"
            onChange={(e) => setAmount(e.target.value)}
          />
          <input value={note} placeholder="说一句（可不填）" onChange={(e) => setNote(e.target.value)} />
          <button
            className="reader-btn"
            disabled={busy || !amount}
            onClick={() =>
              run(async () => {
                const r = await walletApi.transfer(Number(amount), note);
                setAmount('');
                setNote('');
                return r;
              }, '转过去了')
            }
          >
            转账
          </button>
        </div>

        <div className="section-label">他想要</div>
        {wanted.length === 0 && <div className="hint-line">现在没有想要的。他会在聊天里提。</div>}

        {wanted.map((w) => (
          <div className="wish-card" key={w.id}>
            <div className="wish-head">
              <b>{w.name}</b>
              <span>{w.price} 枚</span>
            </div>
            {w.reason && <div className="wish-reason">{w.reason}</div>}
            {w.url && (
              <a className="wish-link" href={w.url} target="_blank" rel="noopener noreferrer">
                搜一下 →
              </a>
            )}
            <div className="wish-actions">
              <button
                className="reader-btn"
                disabled={busy || data.balance < w.price}
                onClick={() => run(() => walletApi.pay(w.id), '买了')}
              >
                {data.balance < w.price ? '余额不够' : '我付了'}
              </button>
              <button className="reader-btn" disabled={busy} onClick={() => run(() => walletApi.reject(w.id), '先不买')}>
                不买
              </button>
            </div>
          </div>
        ))}

        {done.length > 0 && (
          <>
            <div className="section-label">处理过的</div>
            {done.slice(0, 8).map((w) => (
              <div className="wish-done" key={w.id}>
                <span>{w.name}</span>
                <span>{w.status === 'bought' ? '已买 · -' + w.price : '没买'}</span>
              </div>
            ))}
          </>
        )}

        <div className="section-label">流水</div>
        <div className="wallet-ledger">
          {data.ledger.length === 0 && <div className="hint-line">还没有记录。</div>}
          {data.ledger.slice(0, 20).map((l) => (
            <div className="ledger-line" key={l.id}>
              <span>{new Date(l.at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
              <span>{l.note}</span>
              <b className={l.delta > 0 ? 'plus' : 'minus'}>{l.delta > 0 ? '+' : ''}{l.delta}</b>
            </div>
          ))}
        </div>

        {msg && <div className="hint-line">{msg}</div>}
        {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      </div>
    </div>
  );
}
