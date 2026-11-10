/**
 * 原生 App 里才会生效的状态上报
 * ------------------------------------------------------------
 * 在浏览器里这段直接返回 null；装进 Capacitor 壳之后，
 * 通过 BunnyStatus 插件拿到「锁屏」和「正在用的 App」。
 */

function hasNative() {
  return Boolean(window.Capacitor?.Plugins?.BunnyStatus);
}

export async function readNativeStatus() {
  if (!hasNative()) return {};
  try {
    const r = await window.Capacitor.Plugins.BunnyStatus.getStatus();
    return {
      locked: typeof r.locked === 'boolean' ? r.locked : null,
      foregroundApp: r.foregroundApp || null
    };
  } catch {
    return {};
  }
}

export function nativeAvailable() {
  return hasNative();
}

/* 引导用户去开「使用情况访问」（只在 App 里有意义） */
export async function openUsageAccessSettings() {
  if (!hasNative()) return false;
  try {
    await window.Capacitor.Plugins.BunnyStatus.openUsageAccess?.();
    return true;
  } catch {
    return false;
  }
}
