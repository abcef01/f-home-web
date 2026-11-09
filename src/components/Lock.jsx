import React, { useState } from 'react';
import { authApi, auth } from '../api.js';

export default function Lock({ onUnlock }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e?.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await authApi.login(value.trim());
      if (r.token) auth.token = r.token;
      onUnlock();
    } catch (e2) {
      setErr(e2.message === '口令不对' ? '口令不对，再试一次' : e2.message);
      setValue('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lock-screen">
      <div className="lock-inner">
        <div className="lock-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1">
            <path d="M4 11.5 12 5l8 6.5V20H4z" />
            <path d="M10 20v-5h4v5" />
          </svg>
        </div>
        <div className="lock-title">Bunny's Home</div>
        <div className="lock-sub">这里是私人的。输入口令再进去。</div>

        <form onSubmit={submit}>
          <input
            className="lock-input"
            type="password"
            value={value}
            autoFocus
            placeholder="口令"
            onChange={(e) => setValue(e.target.value)}
          />
          <button className="lock-btn" type="submit" disabled={busy || !value.trim()}>
            {busy ? '验证中…' : '进去'}
          </button>
        </form>

        {err && <div className="lock-err">{err}</div>}
        <div className="lock-note">口令只存在后端，别人拿到网址也进不来。</div>
      </div>
    </div>
  );
}
