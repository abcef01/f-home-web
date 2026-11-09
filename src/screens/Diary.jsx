import React, { useState } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MARKED = { 4: 1, 7: 1, 8: 1, 15: 1, 21: 1 };
const WEEK = [
  ['Mon', 2],
  ['Tue', 3],
  ['Wed', 4],
  ['Thu', 5],
  ['Fri', 6],
  ['Sat', 7],
  ['Sun', 8]
];

export default function Diary({ me, onGo }) {
  const [view, setView] = useState('week');
  const [agenda, setAgenda] = useState([
    { time: '08:30', text: '交设计初稿', done: true },
    { time: '14:00', text: '和 Elliott 一起看第 4 章', done: false },
    { time: '19:30', text: '买水壶滤芯', done: false }
  ]);

  const first = (new Date(2026, 10, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(2026, 11, 0).getDate();

  return (
    <>
      <div className="diary-head">
        <div className="diary-title">Diary</div>
        <div className="diary-month">November 2026</div>
      </div>

      <div className="chips-row">
        {[
          ['week', '周'],
          ['month', '月'],
          ['year', '年']
        ].map(([id, label]) => (
          <span
            key={id}
            className={'chip' + (view === id ? ' on' : '')}
            onClick={() => setView(id)}
          >
            {label}
          </span>
        ))}
        <span className="chip" style={{ marginLeft: 'auto' }}>
          2026
        </span>
      </div>

      {view === 'week' && (
        <div className="cal">
          {WEEK.map(([d, n]) => (
            <div className={'cal-day' + (n === 8 ? ' today' : '')} key={d}>
              <i>{d}</i>
              <b>{n}</b>
              {MARKED[n] ? <span className="dot" /> : null}
            </div>
          ))}
        </div>
      )}

      {view === 'month' && (
        <div className="cal-month on">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => (
            <div className="cal-wd" key={w}>
              {w}
            </div>
          ))}
          {Array.from({ length: first }).map((_, i) => (
            <div key={'blank' + i} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            return (
              <div
                key={d}
                className={
                  'cal-cell' + (MARKED[d] ? ' has' : '') + (d === 8 ? ' today' : '')
                }
              >
                {d}
              </div>
            );
          })}
        </div>
      )}

      {view === 'year' && (
        <div className="cal-year on">
          {MONTHS.map((m, mi) => {
            const count = new Date(2026, mi + 1, 0).getDate();
            return (
              <div className="ym" key={m}>
                <b>{m} 2026</b>
                <div className="mini">
                  {Array.from({ length: count }).map((_, i) => {
                    const d = i + 1;
                    const mark = mi === 10 && MARKED[d];
                    return (
                      <i key={d} className={mark ? 'mark' : ''}>
                        {d}
                      </i>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="duo">
        <div className="duo-card">
          <div className="top">
            <div className="avatar a-bunny s20" />
            <div className="nm">{me}</div>
          </div>
          <div className="story">
            今天很累。开会开到七点，回来发现伞忘在公司了。站在楼下等雨小一点，忽然想到你说过的那句“慢慢来”。
          </div>
          <div className="foot">
            <span>18:40</span>
            <span>Read →</span>
          </div>
        </div>
        <div className="duo-card">
          <div className="top">
            <div className="avatar a-elliott s20" />
            <div className="nm">Elliott</div>
          </div>
          <div className="story">
            她今天回来得很晚。我在窗边数了很久的雨，想告诉她伞我放在门口了，又怕她已经淋湿了。
          </div>
          <div className="foot">
            <span>21:12</span>
            <span>1 note</span>
          </div>
        </div>
      </div>

      <div className="section-label">今日心情</div>
      <div className="mood-row">
        <span className="chip on">◦ 安静</span>
        <span className="chip">疲惫</span>
        <span className="chip">有点想你</span>
        <span className="chip">+</span>
      </div>

      <div className="section-label">今日日程</div>
      <div className="agenda">
        {agenda.map((item, i) => (
          <div
            key={i}
            className={'ag-item' + (item.done ? ' done' : '')}
            onClick={() =>
              setAgenda((a) => a.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))
            }
          >
            <span className="ag-box" />
            <span className="ag-time">{item.time}</span>
            <span className="ag-txt">{item.text}</span>
          </div>
        ))}
        <div className="ag-item add">
          <span className="ag-box ghost" />
          <span className="ag-time" />
          <span className="ag-txt">加一条</span>
        </div>
      </div>

      <div className="section-label">小纸条</div>
      <div className="notes">
        <div className="note">
          <div className="n-top">
            <div className="avatar a-elliott s20" />
            <div className="n-who">Elliott</div>
          </div>
          <div className="n-body">伞我放在门口了，明天别忘。</div>
          <div className="n-time">21:14</div>
        </div>
        <div className="note">
          <div className="n-top">
            <div className="avatar a-bunny s20" />
            <div className="n-who">{me}</div>
          </div>
          <div className="n-body">今天不想说话，只想被抱着。</div>
          <div className="n-time">22:03</div>
        </div>
        <div className="note">
          <div className="n-top">
            <div className="avatar a-elliott s20" />
            <div className="n-who">Elliott</div>
          </div>
          <div className="n-body">那我就在这儿，不说话。</div>
          <div className="n-time">22:05</div>
        </div>
      </div>

      <div className="write-row">
        <button className="write-btn primary" onClick={() => onGo('chat')}>
          写今天的日记
        </button>
        <button className="write-btn" onClick={() => onGo('chat')}>
          写张小纸条
        </button>
      </div>
      <div style={{ height: 12 }} />
    </>
  );
}
