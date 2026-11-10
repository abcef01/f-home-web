import React, { useEffect, useRef, useState } from 'react';
import { stickersApi } from '../api.js';

/* 把图片压到 320px 以内再上传，省流量也省存储 */
function compress(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 320;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const isPng = /png/i.test(file.type);
        resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.86));
      };
      img.onerror = () => reject(new Error('这张图读不出来'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('读取失败'));
    reader.readAsDataURL(file);
  });
}

/* 表情包管理（放在设置页） */
export default function StickerManager() {
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    stickersApi
      .list()
      .then(setList)
      .catch((e) => setErr('读不到表情包：' + e.message));
  }, []);

  async function onFiles(e) {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    setBusy(true);
    setErr('');
    setMsg('');
    let ok = 0;
    for (const f of files) {
      try {
        const dataUrl = await compress(f);
        const r = await stickersApi.add(f.name.replace(/\.[^.]+$/, ''), dataUrl);
        setList(r.stickers);
        ok += 1;
      } catch (e2) {
        setErr('有一张没上传成功：' + e2.message);
      }
    }
    setMsg(ok ? `已加入 ${ok} 张` : '');
    setBusy(false);
    e.target.value = '';
    setTimeout(() => setMsg(''), 2600);
  }

  async function remove(id) {
    try {
      await stickersApi.remove(id);
      setList((l) => l.filter((x) => x.id !== id));
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="sticker-manager">
      <div className="sticker-grid">
        {list.length === 0 && <div className="hint-line">还没有表情，下面导入几张吧</div>}
        {list.map((s) => (
          <div className="sticker-cell" key={s.id}>
            <img src={s.url} alt={s.name} />
            <button className="sticker-del" onClick={() => remove(s.id)} title="删除">
              ×
            </button>
          </div>
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={onFiles}
      />
      <button className="sticker-add" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? '导入中…' : '＋ 导入图片'}
      </button>
      <div className="hint-line">支持一次选多张，会自动压缩到 320px。导入后聊天里就能直接发。</div>
      {msg && <div className="hint-line" style={{ color: 'var(--accent-deep)' }}>{msg}</div>}
      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
    </div>
  );
}
