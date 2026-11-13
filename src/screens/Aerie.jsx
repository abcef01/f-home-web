import React, { useEffect, useState } from 'react';
import { walletApi, memoryApi } from '../api.js';
import { daysSince } from '../lib/days.js';

export default function Aerie({ me, startDate, onGo, unread = {}, taName = 'Elliott' }) {
  const [balance, setBalance] = useState(null);
  const [memCount, setMemCount] = useState(null);
  useEffect(() => {
    walletApi.get().then((r) => setBalance(r.balance)).catch(() => {});
    memoryApi
      .get()
      .then((m) => setMemCount((m.core?.length || 0) + (m.events?.length || 0) + (m.fragments?.length || 0)))
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="aerie-head">
        <div className="eyebrow" style={{ marginTop: 8 }}>
          Aerie
        </div>
        <div className="avatar a-elliott s88" />
        <div className="aerie-name">{taName}</div>
        <div className="aerie-note">Walk gently, stay curious.</div>
        
      </div>

      <div className="stat-strip">
        <div className="stat">
          <b>{daysSince(startDate)}</b>
          <i>Days</i>
        </div>
        <div className="stat">
          <b>{memCount === null ? '—' : memCount}</b>
          <i>Memory</i>
        </div>
        <div className="stat">
          <b>{balance === null ? '—' : balance}</b>
          <i>Wallet</i>
        </div>
      </div>

      <div className="list">
        <div className="list-item" onClick={() => onGo('phone')}>
          <span className="t">手机</span>
          <span className="v">App 使用时长 · 后台通知</span>
          <span className="arrow">›</span>
        </div>
        <div className="list-item" onClick={() => onGo('memory')}>
          <span className="t">记忆</span>
          <span className="v">{memCount === null ? '—' : memCount + ' 条'}</span>
          <span className="arrow">›</span>
        </div>
        <div className="list-item" onClick={() => onGo('settings')}>
          <span className="t">声音</span>
          <span className="v">语速 · 音色</span>
          <span className="arrow">›</span>
        </div>
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
          ['权限与隐私', '位置 · 屏幕']
        ].map(([name, value]) => (
          <div className="list-item" key={name} onClick={() => onGo('settings')}>
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
