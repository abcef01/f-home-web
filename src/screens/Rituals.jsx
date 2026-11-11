import React from 'react';
import Quests from '../components/Quests.jsx';
import { daysSince, fmtToday } from '../lib/days.js';

export default function Rituals({ startDate, onGo }) {
  return (
    <>
      <div className="page-head">
        <button className="back" onClick={() => onGo('home')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div>
          <div className="set-title">日常</div>
          <div className="set-sub">{fmtToday()} · 在一起第 {daysSince(startDate)} 天</div>
        </div>
      </div>

      <div className="status-row" style={{ marginTop: 18 }}>
        <div className="status-card">
          <div>
            <div className="who">早安</div>
            <div className="what">07:12 · 已打卡</div>
          </div>
        </div>
        <div className="status-card">
          <div>
            <div className="who">晚安</div>
            <div className="what">还没到时间</div>
          </div>
        </div>
      </div>

      <div className="group">
        <div className="gl">喝水 · 水壶</div>
        <div className="meter">
          <div className="meter-bar" style={{ width: '62%' }} />
        </div>
        <div className="meter-foot">
          <span>1,250 ml</span>
          <span>目标 2,000 ml</span>
        </div>
      </div>

      <div className="group">
        <div className="gl">三餐</div>
        <div className="meal">
          <div className="meal-row">
            <span className="mt">早餐</span>
            <span className="mv">08:20 · 燕麦碗 + 一杯手冲</span>
          </div>
          <div className="meal-row">
            <span className="mt">午餐</span>
            <span className="mv">12:40 · 番茄牛腩面</span>
          </div>
          <div className="meal-row empty">
            <span className="mt">晚餐</span>
            <span className="mv">还没记 · 点这里补上</span>
          </div>
        </div>
      </div>

      <div className="group">
        <div className="gl">昨晚睡眠</div>
        <div className="stat-strip" style={{ margin: 0 }}>
          <div className="stat">
            <b>23:40</b>
            <i>入睡</i>
          </div>
          <div className="stat">
            <b>06:55</b>
            <i>醒来</i>
          </div>
          <div className="stat">
            <b>7h 20m</b>
            <i>时长</i>
          </div>
        </div>
      </div>

      <div className="group">
        <div className="gl">约定与积分</div>
        <Quests />
      </div>
      <div style={{ height: 30 }} />
    </>
  );
}
