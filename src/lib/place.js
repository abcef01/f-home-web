/**
 * 位置同步
 * ------------------------------------------------------------
 * 两件事：
 *   1. 进 App 时、以及每隔一段时间，静默更新一次位置（如果你授权过）
 *   2. 它问「你在哪」时，立刻取一次
 *
 * 不轮询、不在后台跑，只在你打开 App 的时候看一眼。
 */
import { placeApi } from '../api.js';

export async function canUseLocation() {
  try {
    if (!navigator.permissions?.query) return false;
    const p = await navigator.permissions.query({ name: 'geolocation' });
    return p.state === 'granted';
  } catch {
    return false;
  }
}

export async function refreshLocation({ force = false } = {}) {
  if (!navigator.geolocation) return null;
  if (!force && !(await canUseLocation())) return null;

  try {
    const pos = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 12000,
        maximumAge: 5 * 60 * 1000,
        enableHighAccuracy: false
      })
    );
    const r = await placeApi.set({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    return r.location;
  } catch {
    return null;
  }
}

/* 进 App 时一次，之后每 30 分钟一次（只在页面可见时） */
export function startLocationSync() {
  refreshLocation();
  const t = setInterval(() => {
    if (document.visibilityState === 'visible') refreshLocation();
  }, 30 * 60 * 1000);
  return () => clearInterval(t);
}
