/**
 * 手机状态上报（浏览器能拿到的那部分）
 * ------------------------------------------------------------
 * 电量、是否充电、网络、前后台、屏幕、是否装成了 App。
 * 正在用哪个 App、有没有锁屏，只有原生 App 能拿到。
 */
import { api } from '../api.js';

async function readBattery() {
  try {
    if (!navigator.getBattery) return {};
    const b = await navigator.getBattery();
    return { battery: Math.round(b.level * 100), charging: b.charging };
  } catch {
    return {};
  }
}

function readNetwork() {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return navigator.onLine ? { online: true, network: null } : { online: false, network: 'offline' };
  return {
    online: navigator.onLine,
    network: c.effectiveType ? c.effectiveType : c.type || null
  };
}

function readPlatform() {
  const ua = navigator.userAgent;
  const platform = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : 'Desktop';
  return {
    platform,
    standalone:
      window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
    screen: `${window.screen.width}x${window.screen.height}`
  };
}

export async function reportDevice() {
  try {
    const [battery, rest] = [await readBattery(), { ...readNetwork(), ...readPlatform() }];
    await api.device({
      ...battery,
      ...rest,
      visibility: document.visibilityState
    });
  } catch {
    /* 静默失败：状态上报不该打扰用户 */
  }
}

/* 进页面报一次，切前台报一次，之后每 5 分钟一次 */
export function startDeviceReporting() {
  reportDevice();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reportDevice();
  });
  window.addEventListener('online', reportDevice);
  window.addEventListener('offline', reportDevice);
  const t = setInterval(reportDevice, 5 * 60 * 1000);
  return () => clearInterval(t);
}
