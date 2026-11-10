import React, { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function NotifyToggle({ apiBase, token }) {
  const [state, setState] = useState('checking'); // checking | unsupported | off | on | denied
  const [msg, setMsg] = useState('');

  async function api(path, options = {}) {
    const res = await fetch(apiBase + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(options.headers || {})
      }
    });
    if (!res.ok) throw new Error((await res.text()).slice(0, 120));
    return res.json().catch(() => ({}));
  }

  useEffect(() => {
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setState('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        setState('denied');
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        setState(sub ? 'on' : 'off');
      } catch {
        setState('off');
      }
    })();
  }, []);

  async function enable() {
    setMsg('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setState('denied');
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
      await navigator.serviceWorker.ready;
      const { publicKey } = await api('/api/push/key');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      await api('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON() }) });
      setState('on');
      setMsg('已开启');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg('开启失败：' + e.message);
    }
  }

  async function disable() {
    setMsg('');
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await api('/api/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState('off');
      setMsg('已关闭');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg('关闭失败：' + e.message);
    }
  }

  async function test() {
    setMsg('');
    try {
      const r = await api('/api/push/test', { method: 'POST', body: '{}' });
      setMsg(r.sent ? `已推送到 ${r.sent} 台设备` : '还没有订阅设备');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg(e.message);
    }
  }

  if (state === 'checking') return <div className="hint-line">检查通知支持…</div>;
  if (state === 'unsupported') {
    return <div className="hint-line">这个浏览器不支持后台通知。安卓 Chrome / iPhone 加到主屏幕后可以。</div>;
  }
  if (state === 'denied') {
    return <div className="hint-line">通知被浏览器拒绝了。去系统设置里允许这个站点的通知，再回来。</div>;
  }

  return (
    <div className="notify-box">
      <div className="list-item">
        <span className="t">它说话时通知我</span>
        <button
          className={'toggle' + (state === 'on' ? ' on' : '')}
          onClick={() => (state === 'on' ? disable() : enable())}
          aria-label="后台通知开关"
        />
      </div>
      <div className="hint-line">
        关掉 App 之后，它主动说话时会弹一条通知（只写「给你留了一句话」，内容进 App 才看得到）。
      </div>
      {state === 'on' && (
        <button className="avatar-btn" onClick={test} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
          发一条测试通知
        </button>
      )}
      {msg && <div className="hint-line" style={{ color: 'var(--accent-deep)' }}>{msg}</div>}
    </div>
  );
}
