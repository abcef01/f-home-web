import React, { useEffect, useState } from 'react';
import { walletApi } from '../api.js';
import { daysSince } from '../lib/days.js';

export default function Aerie({ me, startDate, onGo, unread = {} }) {
  const [balance, setBalance] = useState(null);
  useEffect(() => {
    walletApi.get().then((r) => setBalance(r.balance)).catch(() => {});
  }, []);

  return (
    <>
      <div className="aerie-head">
        <div className="eyebrow" style={{ marginTop: 8 }}>
          Aerie
        </div>
        <div className="avatar a-elliott s88" />
        <div className="aerie-name">Elliott</div>
        <div className="aerie-note">Walk gently, stay curious.</div>
        <div className="chip on" style={{ marginTop: 2 }}>
          ◦ 在窗边看雨 · 心情 安静
        </div>
      </div>

      <div className="stat-strip">
        <div className="stat">
          <b>{daysSince(startDate)}</b>
          <i>Days</i>
        </div>
        <div className="stat">
          <b>1,286</b>
          <i>Memory</i>
        </div>
        <div className="stat">
          <b>{balance === null ? '—' : balance}</b>
          <i>Wallet</i>
        </div>
      </div>

      <div className="list">
        <div className="list-item" onClick={() => onGo('favorites')}>
          <span className="t">收藏{unread?.favorites ? <i className="tab-dot" /> : null}</span>
          <span className="v">图片 · 对话</span>
          <span className="arrow">›</span>
        </div>
        <div className="list-item" onClick={() => onGo('wallet')}>
          <span className="t">钱包</span>
          <span className="v">{balance === null ? '—' : balance + ' 枚'}</span>
          <span className="arrow">›</span>
        </div>
        {[
          ['记忆', '1,286 条'],
          ['情感线', '最近：亲近'],
          ['声音', '低音 · 慢'],
          ['通知', '2 条未读'],
          ['权限与隐私', '位置 · 屏幕']
        ].map(([name, value]) => (
          <div className="list-item" key={name}>
            <span className="t">{name}</span>
            <span className="v">{value}</span>
            <span className="arrow">›</span>
          </div>
        ))}
      </div>

      <div className="list" style={{ paddingTop: 0 }}>
        <div className="list-item" onClick={() => onGo('home')}>
          <span className="t">回到首页</span>
          <span className="arrow">›</span>
        </div>
      </div>
      <div style={{ height: 8 }} />
      <div className="hint-line">{me} 的备注名、头像、声音都可以在设置里改。</div>
    </>
  );
}
