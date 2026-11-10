import React from 'react';

/* 统一的头像渲染：有自定义图就用图，没有就用默认图形 */
export default function AvatarImg({ who = 'ta', url, size = 's26', className = '' }) {
  const cls = `avatar ${size} ${who === 'me' ? 'a-bunny' : 'a-elliott'} ${className}`.trim();

  if (url) {
    return (
      <div className={cls + ' has-img'}>
        <img src={url} alt={who === 'me' ? '我的头像' : 'Elliott'} />
      </div>
    );
  }

  return (
    <div className={cls}>
      {who === 'me' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="#7A6448" strokeWidth="1.1">
          <path d="M12 19.2c-3.6-2.6-6.2-5-6.2-7.8A3.6 3.6 0 0 1 12 8.9a3.6 3.6 0 0 1 6.2 2.5c0 2.8-2.6 5.2-6.2 7.8Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="#4C5C66" strokeWidth="1.1">
          <path d="M16.5 15.4A7.2 7.2 0 0 1 8.6 5.2a7.4 7.4 0 1 0 9.2 9.3c-.5.1-1 .2-1.3.9Z" />
        </svg>
      )}
    </div>
  );
}
