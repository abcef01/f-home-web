/**
 * 接住从系统分享面板发进来的图片
 * 流程：sw.js 把文件存进 cache → 页面从 cache 取出 → 变成 File
 */
export async function takeSharedImage() {
  try {
    if (!('caches' in window)) return null;
    const cache = await caches.open('share-target');
    const res = await cache.match('/__shared__/image');
    if (!res) return null;
    const nameRes = await cache.match('/__shared__/name');
    const name = nameRes ? await nameRes.text() : 'shared.jpg';
    const blob = await res.blob();

    await cache.delete('/__shared__/image');
    await cache.delete('/__shared__/name');

    return new File([blob], name || 'shared.jpg', { type: blob.type || 'image/jpeg' });
  } catch {
    return null;
  }
}
