/* 日期与「在一起的天数」——首页、小屋、日常共用一套算法 */

export function daysSince(startISO) {
  const start = new Date((startISO || '2025-02-01') + 'T00:00:00');
  if (Number.isNaN(start.getTime())) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(Math.floor((today - start) / 86400000) + 1, 0);
}

export function fmtSince(startISO) {
  const d = new Date((startISO || '2025-02-01') + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()} · ${p(d.getMonth() + 1)} · ${p(d.getDate())}`;
}

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/* 今天：11 月 10 日 · 周一 */
export function fmtToday() {
  const d = new Date();
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${WEEK[d.getDay()]}`;
}
