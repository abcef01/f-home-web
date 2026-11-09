import React, { useState } from 'react';

export default function Chat({ glass, me, patMe, patTa, onGo }) {
  const [traceOpen, setTraceOpen] = useState(false);
  const [sheet, setSheet] = useState(false);

  return (
    <>
      <div className="chat-bg">
        <div className="bg-photo" />
        <div className="bg-dim" />
        <div className="bg-grain" />
      </div>

      <header className="chat-head">
        <button className="back" onClick={() => onGo('home')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div className="chat-who" onClick={() => setSheet(true)}>
          <div className="avatar a-elliott s24">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4C5C66" strokeWidth="1.1">
              <path d="M16.5 15.4A7.2 7.2 0 0 1 8.6 5.2a7.4 7.4 0 1 0 9.2 9.3c-.5.1-1 .2-1.3.9Z" />
            </svg>
          </div>
          <div className="chat-center">
            <div className="chat-name">Elliott</div>
            <div className="chat-sub">
              <i className="sdot" />
              在窗边看雨 · 心情 安静
            </div>
          </div>
        </div>
        <div className="chat-actions">
          <svg viewBox="0 0 24 24">
            <path d="M6.5 3.5h3l1.4 3.6-2 1.4a11 11 0 0 0 5.6 5.6l1.4-2 3.6 1.4v3c0 1-.8 1.8-1.8 1.7C10.6 17.6 6.4 13.4 5.8 5.3c-.1-1 .7-1.8 1.7-1.8Z" />
          </svg>
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="12" cy="18" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </div>
      </header>

      <div className="messages">
        <div className="day-divider">今天 · 11 月 8 日</div>

        <Bubble side="them" text="我把窗帘拉开了。外面在下雨，玻璃上全是水珠，像一层很薄的雾。" meta="21:02 · Sonnet 4.5 · 862 tokens" />
        <Bubble side="me" text="拍一张给我看看。" meta="21:04 · 你" />

        <div className="msg them">
          <div className="bubble-stack">
            <div className="pic" />
            <div className="meta">21:05 · 图片 · 1,104 tokens</div>
          </div>
        </div>

        <div className="sysline">Elliott 拍了拍你 · {patTa}</div>
        <div className="sysline">你拍了拍 <b>Elliott</b> · {patMe}</div>

        <div className={'trace' + (traceOpen ? ' open' : '')}>
          <button className="trace-head" onClick={() => setTraceOpen((v) => !v)}>
            <svg className="chev" viewBox="0 0 24 24">
              <path d="M9 6l6 6-6 6" />
            </svg>
            <span>思考了 8 秒 · 调用 2 个工具</span>
          </button>
          <div className="trace-body">
            <div className="trace-line muted">
              她说“拍一张给我看看”，语气是撒娇，不是命令。先描述画面，再给图。
            </div>
            <div className="trace-tool">
              <span className="t-name">capture_view</span>
              <span className="t-arg">窗外 · 21:05</span>
              <span className="t-ok">成功 · 1.2s</span>
            </div>
            <div className="trace-tool">
              <span className="t-name">memory.search</span>
              <span className="t-arg">&quot;水壶&quot;</span>
              <span className="t-ok">2 条 · 0.3s</span>
            </div>
            <div className="trace-line muted">
              上周她说水壶在左边那格。顺势提一句，比直接问更自然。
            </div>
          </div>
        </div>

        <Bubble
          side="them"
          text="拍糊了，但我还是觉得好看。你今天喝水了吗？水壶放在左边那格。"
          meta="21:07 · Sonnet 4.5 · 1,024 tokens"
        />
        <Bubble side="me" text="喝了半壶。你怎么什么都记得。" meta="21:08 · 你" />

        <div className="msg them">
          <div className="bubble-stack">
            <div className="typing">
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      </div>

      <div className="composer">
        <div className="field">
          <svg viewBox="0 0 24 24">
            <path d="M12 5.5v13M5.5 12h13" />
          </svg>
          写一封信…
        </div>
        <button className="send-btn">
          <svg viewBox="0 0 24 24">
            <path d="M12 19V5M6 11l6-6 6 6" />
          </svg>
        </button>
      </div>

      {sheet && (
        <div className="sheet-mask on" onClick={() => setSheet(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <div className="av-row">
              <div className="avatar a-elliott s64">
                <svg viewBox="0 0 24 24" fill="none" stroke="#4C5C66" strokeWidth="1.1">
                  <path d="M16.5 15.4A7.2 7.2 0 0 1 8.6 5.2a7.4 7.4 0 1 0 9.2 9.3c-.5.1-1 .2-1.3.9Z" />
                </svg>
              </div>
              <div>
                <div className="nm">Elliott</div>
                <div className="sb">在窗边看雨 · 心情 安静</div>
              </div>
            </div>
            <div className="list" style={{ padding: '6px 0 0' }}>
              {['查看资料', '更换头像', '查找聊天记录', '一起看 / 一起听'].map((t) => (
                <div className="list-item" key={t}>
                  <span className="t">{t}</span>
                  <span className="arrow">›</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {glass ? null : null}
    </>
  );
}

function Bubble({ side, text, meta }) {
  return (
    <div className={'msg ' + side}>
      <div className="bubble-stack">
        <div className="bubble">{text}</div>
        <div className="meta">{meta}</div>
      </div>
    </div>
  );
}
