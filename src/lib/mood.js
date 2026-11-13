/**
 * 情绪 → 颜色
 * 他的状态里带 moodKey（tender / grievance / hurt / arousal / pride / connection / valence / calm）
 */
export const MOOD_COLORS = {
  tender: '#c98a8a',      // 有点软 · 粉
  grievance: '#8f86a8',   // 有点堵 · 灰紫
  hurt: '#a35d5d',        // 不太好 · 暗红
  arousal: '#c47a4a',     // 静不下来 · 橙
  pride: '#b08a4a',       // 有点得意 · 金
  connection: '#c06a5a',  // 在惦记你 · 暖红
  valence: '#7f9a6b',     // 心情不错 · 绿
  calm: '#b8a98a'         // 没什么起伏 · 米
};

const BY_WORD = {
  有点软: 'tender',
  有点堵: 'grievance',
  不太好: 'hurt',
  静不下来: 'arousal',
  有点得意: 'pride',
  在惦记你: 'connection',
  心情不错: 'valence',
  没什么起伏: 'calm'
};

export function moodKeyOf(status) {
  if (!status) return 'calm';
  if (status.moodKey) return status.moodKey;
  return BY_WORD[status.mood] || 'calm';
}

export function moodColor(status) {
  return MOOD_COLORS[moodKeyOf(status)] || MOOD_COLORS.calm;
}

export function moodLabel(status) {
  return (status && status.mood) || '';
}
