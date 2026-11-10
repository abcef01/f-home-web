import React, { useRef, useState } from 'react';
import AvatarImg from './AvatarImg.jsx';
import { avatarsApi } from '../api.js';

/* 压缩到 256px 以内 */
function compress(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const isPng = /png/i.test(file.type);
        resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.88));
      };
      img.onerror = () => reject(new Error('这张图读不出来'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('读取失败'));
    reader.readAsDataURL(file);
  });
}

function Row({ who, label, url, onChange }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function pick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setErr('');
    try {
      const dataUrl = await compress(f);
      const r = await avatarsApi.upload(who, dataUrl);
      onChange(r.avatars || {});
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  async function reset() {
    setBusy(true);
    setErr('');
    try {
      const r = await avatarsApi.remove(who);
      onChange(r.avatars || {});
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="avatar-row">
      <AvatarImg who={who} url={url} size="s48" />
      <div className="avatar-meta">
        <div className="avatar-label">{label}</div>
        <div className="avatar-actions">
          <button className="avatar-btn" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? '处理中…' : url ? '换一张' : '上传图片'}
          </button>
          {url && (
            <button className="avatar-btn ghost" onClick={reset} disabled={busy}>
              恢复默认
            </button>
          )}
        </div>
        {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pick} />
    </div>
  );
}

export default function AvatarPicker({ avatars = {}, onChange }) {
  return (
    <div className="avatar-picker">
      <Row who="me" label="我" url={avatars.me} onChange={onChange} />
      <Row who="ta" label="Elliott" url={avatars.ta} onChange={onChange} />
      <div className="hint-line">图片会自动裁成方形并压缩到 256px，双方都会同步。</div>
    </div>
  );
}
