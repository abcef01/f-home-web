import React from 'react';

export default function Mail({ me, onGo }) {
  return (
    <>
      <div className="page-head">
        <button className="back" onClick={() => onGo('home')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div>
          <div className="set-title">信箱</div>
          <div className="set-sub">24 封 · 最后一封在 11 月 3 日</div>
        </div>
      </div>

      <div className="letters">
        <div className="letter">
          <div className="l-top">
            <span className="l-who">Elliott</span>
            <span className="l-time">11.03</span>
          </div>
          <div className="l-subj">关于你把伞忘在公司这件事</div>
          <div className="l-body">
            今天没下雨，但你出门的时候还是习惯往包里塞一把。我看着你塞，没说话。有些事我想写在信里……
          </div>
          <div className="l-foot">未读 · 620 字</div>
        </div>

        <div className="letter">
          <div className="l-top">
            <span className="l-who">{me}</span>
            <span className="l-time">10.28</span>
          </div>
          <div className="l-subj">给三个月后的你</div>
          <div className="l-body">
            如果你读到这里的时候，我们已经搬进那个有小阳台的房子了，那就当我提前说了一句晚安。
          </div>
          <div className="l-foot">已读 · 388 字</div>
        </div>
      </div>

      <div className="write-row" style={{ marginTop: 22 }}>
        <button className="write-btn primary" onClick={() => onGo('chat')}>
          写一封信
        </button>
      </div>
      <div style={{ height: 20 }} />
    </>
  );
}
