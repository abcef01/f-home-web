import React, { useRef, useState } from 'react';
import { api, auth } from '../api.js';

/* 数据备份：导出 / 导入 */
export default function BackupBox() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  async function doExport() {
    if (busy) return;
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const res = await fetch((api.base || '') + '/api/backup/export', {
        headers: { Authorization: 'Bearer ' + (auth.token || '') }
      });
      if (!res.ok) throw new Error((await res.text()).slice(0, 120));
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bunny-home-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      let size = Math.round(blob.size / 1024);
      setMsg(`已导出（${size} KB）`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function doImport(file) {
    if (!file || busy) return;
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const r = await api.backupImport(payload, 'merge');
      setMsg('已恢复：' + Object.entries(r.restored || {}).map(([k, v]) => `${k} ${v}`).join('、'));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="backup-box">
      <div className="hint-line">
        把对话、记忆、手帐、约定、书架书目、游戏进度全部打包成一个文件。换设备、换库、或者只是想留一份，都用它。
      </div>
      <div className="reader-sheet-row">
        <button className="quest-review" onClick={doExport} disabled={busy}>
          {busy ? '…' : '导出备份'}
        </button>
        <button className="quest-review" onClick={() => fileRef.current?.click()} disabled={busy}>
          导入恢复
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={(e) => doImport(e.target.files?.[0])}
        />
      </div>
      <div className="hint-line">导入是「合并」，不会删掉现在的东西；同一份会覆盖成备份里的样子。</div>
      {msg && <div className="hint-line">{msg}</div>}
      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
    </div>
  );
}
