import React from 'react';
import ModelPicker from '../components/ModelPicker.jsx';
import ChatSettings from '../components/ChatSettings.jsx';
import StickerManager from '../components/StickerManager.jsx';
import AvatarPicker from '../components/AvatarPicker.jsx';
import NotifyToggle from '../components/NotifyToggle.jsx';
import { api, auth } from '../api.js';

const THEMES = [
  ['cream', '#B08A6A', '素色奶霜'],
  ['snow', '#8FA3B8', '京都初雪'],
  ['lilac', '#A99BC0', '雾香芋紫'],
  ['oat', '#BFA579', '燕麦米白'],
  ['mint', '#9CB5A6', '薄荷云']
];

function Slider({ label, value, min, max, step, onChange, digits = 2 }) {
  return (
    <div className="slider-row">
      <span className="lb">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className="val">
        {digits === 0 ? Math.round(value) : value.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '')}
      </span>
    </div>
  );
}

export default function Settings({ settings, update, onGo, onSave, saving, saveMsg, avatars, onAvatarsChange }) {
  const s = settings;
  return (
    <>
      <div className="set-head">
        <div className="set-title">设置</div>
        <div className="set-sub">这个家的样子，由你决定。</div>
      </div>

      <div className="group">
        <div className="gl">模型</div>
        <ModelPicker />
      </div>

      <div className="group">
        <div className="gl">对话参数</div>
        <ChatSettings />
      </div>

      <div className="group">
        <div className="gl">看屏幕</div>
        <div className="list-item">
          <span className="t">允许他看我的屏幕</span>
          <button
            className={'toggle' + (s.watchAllowed ? ' on' : '')}
            onClick={() => update({ watchAllowed: !s.watchAllowed })}
            aria-label="允许看屏幕"
          />
        </div>
        <div className="slider-row" style={{ marginTop: 6 }}>
          <span className="t">看一次间隔</span>
          <input
            type="range"
            min="15"
            max="300"
            step="15"
            value={s.watchEvery || 45}
            onChange={(e) => update({ watchEvery: Number(e.target.value) })}
          />
          <span className="val">{s.watchEvery || 45}s</span>
        </div>
        <div className="hint-line">
          关掉这个开关，他就不能看；聊天里他也能主动请求，你可以当场拒绝。
          共享时底部有停止键，浏览器顶部也有。
        </div>
      </div>

      <div className="group">
        <div className="gl">通知</div>
        <NotifyToggle apiBase={api.base} token={auth.token} />
      </div>

      <div className="group">
        <div className="gl">头像</div>
        <AvatarPicker avatars={avatars} onChange={onAvatarsChange} />
      </div>

      <div className="group">
        <div className="gl">表情包</div>
        <StickerManager />
      </div>

      <div className="group">
        <div className="gl">界面质感</div>
        <div className="seg">
          {[
            ['paper', '素雅纸感'],
            ['glass', '玻璃'],
            ['chat', '仅聊天']
          ].map(([id, label]) => (
            <button
              key={id}
              className={s.surface === id ? 'on' : ''}
              onClick={() => update({ surface: id })}
            >
              {label}
            </button>
          ))}
        </div>
        <Slider label="纸白" value={s.veil} min={0.15} max={0.8} step={0.02} onChange={(v) => update({ veil: v })} />
        <Slider label="模糊" value={s.blur} min={0} max={30} step={1} onChange={(v) => update({ blur: v })} digits={0} />
        <Slider label="全局" value={s.globalRadius} min={0} max={28} step={1} onChange={(v) => update({ globalRadius: v })} digits={0} />
        <Slider label="圆角" value={s.bubbleRadius} min={4} max={28} step={1} onChange={(v) => update({ bubbleRadius: v })} digits={0} />
        <Slider label="气泡" value={s.bubbleAlpha} min={0.15} max={0.9} step={0.01} onChange={(v) => update({ bubbleAlpha: v })} />
        <div className="hint-line" style={{ padding: '6px 0 0' }}>
          纸白越高越像纸、越低越透；模糊只影响玻璃后面的背景。
        </div>
      </div>

      <div className="group">
        <div className="gl">主题色</div>
        <div className="swatches">
          {THEMES.map(([id, color]) => (
            <div
              key={id}
              className={'sw' + (s.theme === id ? ' on' : '')}
              style={{ background: color }}
              title={THEMES.find((t) => t[0] === id)[2]}
              onClick={() => update({ theme: id })}
            />
          ))}
        </div>
      </div>

      <div className="group">
        <div className="gl">字体</div>
        <div className="seg">
          {[
            ['serif', '衬线 · 古典'],
            ['sans', '无衬线 · 现代'],
            ['kai', '楷体 · 手写']
          ].map(([id, label]) => (
            <button key={id} className={s.font === id ? 'on' : ''} onClick={() => update({ font: id })}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="group">
        <div className="gl">语言</div>
        <div className="seg">
          <button className={s.lang === 'zh' ? 'on' : ''} onClick={() => update({ lang: 'zh' })}>
            中文
          </button>
          <button className={s.lang === 'en' ? 'on' : ''} onClick={() => update({ lang: 'en' })}>
            English
          </button>
        </div>
      </div>

      <div className="group">
        <div className="gl">排版</div>
        <Slider label="字号" value={s.fontSize} min={9.5} max={21} step={0.5} onChange={(v) => update({ fontSize: v })} digits={1} />
        <Slider label="行距" value={s.lineHeight} min={1.4} max={2.4} step={0.05} onChange={(v) => update({ lineHeight: v })} />
        <Slider label="字距" value={s.letterSpacing} min={0} max={0.08} step={0.005} onChange={(v) => update({ letterSpacing: v })} digits={3} />
      </div>

      <div className="preview-type">
        我把窗帘拉开了。外面在下雨，玻璃上全是水珠，像一层很薄的雾。
      </div>

      <div className="list" style={{ paddingTop: 16 }}>
        <div className="list-item">
          <span className="t">我的名字</span>
          <input
            className="name-input"
            value={s.me}
            maxLength={12}
            placeholder="怎么称呼你"
            onChange={(e) => update({ me: e.target.value })}
          />
          <span className="arrow">›</span>
        </div>
        <div className="list-item">
          <span className="t">开始日期</span>
          <input
            className="field-input"
            type="date"
            value={s.startDate || '2025-02-01'}
            onChange={(e) => update({ startDate: e.target.value })}
          />
          <span className="arrow">›</span>
        </div>
        <div className="list-item">
          <span className="t">首页标题</span>
          <input
            className="name-input"
            value={s.homeTitle}
            maxLength={18}
            placeholder={`${s.me || 'Bunny'}'s Home`}
            onChange={(e) => update({ homeTitle: e.target.value })}
          />
          <span className="arrow">›</span>
        </div>
        <div className="list-item">
          <span className="t">对话显示头像</span>
          <button
            className={'toggle' + (s.showAvatars ? ' on' : '')}
            onClick={() => update({ showAvatars: !s.showAvatars })}
            aria-label="切换对话头像"
          />
        </div>
        <div className="list-item">
          <span className="t">我拍 ta</span>
          <input
            className="name-input"
            value={s.patMe}
            maxLength={10}
            onChange={(e) => update({ patMe: e.target.value })}
          />
          <span className="arrow">›</span>
        </div>
        <div className="list-item">
          <span className="t">ta 拍我</span>
          <input
            className="name-input"
            value={s.patTa}
            maxLength={10}
            onChange={(e) => update({ patTa: e.target.value })}
          />
          <span className="arrow">›</span>
        </div>
        <div className="list-item" onClick={() => onGo('opening')}>
          <span className="t">启动动画</span>
          <span className="v">重看</span>
          <span className="arrow">›</span>
        </div>
      </div>
      <div style={{ height: 14 }} />

      {/* 保存条：改完点一下，存到云端 */}
      <div className="save-bar">
        <button className="save-btn" onClick={onSave} disabled={saving}>
          {saving ? '保存中…' : '保存设置'}
        </button>
        {saveMsg && <span className={'save-msg' + (saveMsg.includes('失败') ? ' err' : '')}>{saveMsg}</span>}
      </div>
    </>
  );
}
