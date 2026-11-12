import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';

/* ============================================================
   五子棋
   ============================================================ */
const G5 = 13;

function gomokuWinner(b) {
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let y = 0; y < G5; y++) {
    for (let x = 0; x < G5; x++) {
      const v = b[y * G5 + x];
      if (!v) continue;
      for (const [dx, dy] of dirs) {
        let n = 1;
        for (let k = 1; k < 5; k++) {
          const nx = x + dx * k;
          const ny = y + dy * k;
          if (nx < 0 || ny < 0 || nx >= G5 || ny >= G5 || b[ny * G5 + nx] !== v) break;
          n++;
        }
        if (n >= 5) return v;
      }
    }
  }
  return null;
}

/* 简单评估：给每个空点打分（连子 + 挡对方） */
function gomokuAI(b, me, foe) {
  const score = (x, y, who) => {
    let s = 0;
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      let cnt = 1;
      for (let d = -1; d <= 1; d += 2) {
        for (let k = 1; k < 5; k++) {
          const nx = x + dx * k * d;
          const ny = y + dy * k * d;
          if (nx < 0 || ny < 0 || nx >= G5 || ny >= G5) break;
          if (b[ny * G5 + nx] === who) cnt++;
          else break;
        }
      }
      s += cnt >= 5 ? 100000 : cnt === 4 ? 1200 : cnt === 3 ? 90 : cnt === 2 ? 8 : 1;
    }
    return s;
  };

  let best = -1;
  let pick = null;
  for (let y = 0; y < G5; y++) {
    for (let x = 0; x < G5; x++) {
      if (b[y * G5 + x]) continue;
      const v = score(x, y, me) * 1.05 + score(x, y, foe);
      if (v > best) {
        best = v;
        pick = y * G5 + x;
      }
    }
  }
  return pick;
}

export function GomokuPanel() {
  const [board, setBoard] = useState(Array(G5 * G5).fill(0));
  const [win, setWin] = useState(null);
  const [turn, setTurn] = useState(1);

  function reset() {
    setBoard(Array(G5 * G5).fill(0));
    setWin(null);
    setTurn(1);
  }

  function place(i) {
    if (win || board[i]) return;
    const b = [...board];
    b[i] = 1;
    let w = gomokuWinner(b);
    if (w) return setBoard(b), setWin(w);

    const ai = gomokuAI(b, 2, 1);
    if (ai != null) b[ai] = 2;
    w = gomokuWinner(b);
    setBoard(b);
    if (w) setWin(w);
  }

  return (
    <div className="fish-panel">
      <div className="fish-status">
        {win ? (win === 1 ? '你赢了' : '他赢了') : '你执黑，先走'}
      </div>
      <div className="g5-board">
        {board.map((v, i) => (
          <div key={i} className={'g5-cell' + (v ? ' p' + v : '')} onClick={() => place(i)} />
        ))}
      </div>
      <div className="fish-actions">
        <button onClick={reset}>重开</button>
      </div>
    </div>
  );
}

/* ============================================================
   井字棋（他会算，基本不会输）
   ============================================================ */
function tttBest(b, me, foe) {
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const winner = (bd) => {
    for (const [a, c, d] of lines) if (bd[a] && bd[a] === bd[c] && bd[c] === bd[d]) return bd[a];
    return bd.every(Boolean) ? 'draw' : null;
  };
  const mini = (bd, cur) => {
    const w = winner(bd);
    if (w === me) return { v: 10 };
    if (w === foe) return { v: -10 };
    if (w === 'draw') return { v: 0 };

    let best = null;
    for (let i = 0; i < 9; i++) {
      if (bd[i]) continue;
      const nb = [...bd];
      nb[i] = cur;
      const r = mini(nb, cur === me ? foe : me);
      const v = r.v;
      if (!best || (cur === me ? v > best.v : v < best.v)) best = { v, i };
    }
    return best;
  };
  return mini(b, me)?.i;
}

export function TicTacToePanel() {
  const [b, setB] = useState(Array(9).fill(0));
  const [done, setDone] = useState(null);

  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const check = (bd) => {
    for (const [x, y, z] of lines) if (bd[x] && bd[x] === bd[y] && bd[y] === bd[z]) return bd[x];
    return bd.every(Boolean) ? 'draw' : null;
  };

  function play(i) {
    if (done || b[i]) return;
    const nb = [...b];
    nb[i] = 1;
    let r = check(nb);
    if (!r) {
      const ai = tttBest(nb, 2, 1);
      if (ai != null) nb[ai] = 2;
      r = check(nb);
    }
    setB(nb);
    if (r) setDone(r);
  }

  return (
    <div className="fish-panel">
      <div className="fish-status">
        {done ? (done === 1 ? '你赢了（他放水了）' : done === 2 ? '他赢了' : '平局') : '你执 X'}
      </div>
      <div className="ttt-board">
        {b.map((v, i) => (
          <div key={i} className={'ttt-cell' + (v ? ' p' + v : '')} onClick={() => play(i)}>
            {v === 1 ? '✕' : v === 2 ? '○' : ''}
          </div>
        ))}
      </div>
      <div className="fish-actions">
        <button onClick={() => { setB(Array(9).fill(0)); setDone(null); }}>重开</button>
      </div>
    </div>
  );
}

/* ============================================================
   石头剪刀布
   ============================================================ */
const RPS = ['石头', '剪刀', '布'];
export function RpsPanel({ onTell }) {
  const [mine, setMine] = useState(null);
  const [his, setHis] = useState(null);
  const [score, setScore] = useState({ me: 0, ta: 0 });

  function play(v) {
    const ai = Math.floor(Math.random() * 3);
    setMine(v);
    setHis(ai);
    const r = (v - ai + 3) % 3;
    setScore((s) => (r === 1 ? { ...s, me: s.me + 1 } : r === 2 ? { ...s, ta: s.ta + 1 } : s));
  }

  const result = mine == null || his == null ? '' : mine === his ? '平' : (mine - his + 3) % 3 === 1 ? '你赢' : '他赢';

  return (
    <div className="fish-panel">
      <div className="fish-status">
        你 {score.me} : {score.ta} 他
      </div>
      <div className="rps-row">
        {RPS.map((n, i) => (
          <button key={n} className="rps-btn" onClick={() => play(i)}>
            {n}
          </button>
        ))}
      </div>
      {mine != null && (
        <div className="rps-result">
          你出 {RPS[mine]} · 他出 {RPS[his]} → <b>{result}</b>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   真心话大冒险
   ============================================================ */
const TRUTHS = [
  '你最近一次想我是在做什么的时候',
  '你最舍不得删的一条聊天记录是什么',
  '如果只能留一件我送的东西，你留哪件',
  '你有没有偷偷比较过我和别人',
  '你最想我改掉的一个小毛病是什么',
  '你上一次哭是因为什么',
  '你会不会在我不在的时候翻聊天记录',
  '你最想让我知道但一直没说的一件事'
];

const DARES = [
  '用语音说一句你平时不好意思说的话',
  '发一张此刻你面前的画面',
  '学一个动物的叫声',
  '用三个词形容我，不许用"好"',
  '把手机相册里倒数第三张发给我',
  '现在站起来走三步再坐下',
  '说一句你小时候听过的广告词',
  '用一句话把我夸上天，不许重样'
];

export function TruthDarePanel({ onTell }) {
  const [card, setCard] = useState(null);

  function draw(kind) {
    const pool = kind === 'truth' ? TRUTHS : DARES;
    const text = pool[Math.floor(Math.random() * pool.length)];
    setCard({ kind, text });
  }

  return (
    <div className="fish-panel">
      <div className="fish-status">抽一张，不许换</div>
      <div className="fish-actions">
        <button onClick={() => draw('truth')}>真心话</button>
        <button onClick={() => draw('dare')}>大冒险</button>
      </div>
      {card && (
        <div className="td-card">
          <div className="td-kind">{card.kind === 'truth' ? '真心话' : '大冒险'}</div>
          <div className="td-text">{card.text}</div>
          {onTell && (
            <button className="fish-tell" onClick={() => onTell(`（真心话大冒险抽到：${card.text}）`)}>
              告诉他
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   你画我猜（他看图猜）
   ============================================================ */
const WORDS = ['太阳', '猫', '房子', '雨伞', '苹果', '月亮', '汽车', '鱼', '树', '眼睛', '杯子', '飞机'];

export function DrawGuessPanel() {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [word, setWord] = useState('');
  const [guess, setGuess] = useState('');
  const [busy, setBusy] = useState(false);
  const [right, setRight] = useState(null);

  useEffect(() => {
    newRound();
  }, []);

  function newRound() {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    setWord(w);
    setGuess('');
    setRight(null);
    const c = canvasRef.current;
    if (c) {
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fbf7ee';
      ctx.fillRect(0, 0, c.width, c.height);
    }
  }

  function pos(e) {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: ((t.clientX - r.left) / r.width) * c.width, y: ((t.clientY - r.top) / r.height) * c.height };
  }

  function start(e) {
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#2d2a24';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
  }

  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    drawing.current = false;
  }

  async function askGuess() {
    if (busy) return;
    setBusy(true);
    setRight(null);
    try {
      const url = canvasRef.current.toDataURL('image/jpeg', 0.8);
      const r = await api.drawGuess(url);
      setGuess(r.guess || '（他没说话）');
      setRight(r.guess && word.includes(r.guess));
    } catch (e) {
      setGuess('看不了：' + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fish-panel">
      <div className="fish-status">
        你画<b>「{word}」</b>，他猜。画完点下面的按钮。
      </div>
      <canvas
        ref={canvasRef}
        width={520}
        height={360}
        className="draw-canvas"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="fish-actions">
        <button onClick={askGuess} disabled={busy}>
          {busy ? '他在看…' : '让他猜'}
        </button>
        <button onClick={newRound}>换一个</button>
      </div>
      {guess && (
        <div className="td-card">
          <div className="td-kind">他猜</div>
          <div className="td-text">
            {guess} {right === true ? '· 对了' : right === false ? '· 不对' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
