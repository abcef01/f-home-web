import React, { useEffect, useRef, useState } from 'react';
import { fishingApi, monoApi, farmApi, api } from '../api.js';

const GAMES = [
  ['◯', '五子棋', '7 局 4 胜'],
  ['✌', '石头剪刀布', '12 局 5 胜'],
  ['＃', '井字棋', '3 局 2 胜'],
  ['✎', '你画我猜', '还没玩过'],
  ['♡', '真心话大冒险', '今晚要不要来一局']
];


/* 涩涩大富翁：引擎在后端，红线在引擎里过滤 */
function MonoPanel() {
  const [game, setGame] = useState(null);
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState(3);
  const [red, setRed] = useState(['后庭']);
  const [err, setErr] = useState('');

  const KINKS = ['后庭', '打', '绑', '玩具', '暴露', '羞辱', '失禁', '足', '口水', '产乳', '电', '双龙', '催眠', '蜡', '口', '夹'];

  useEffect(() => {
    monoApi.state().then((r) => r.game && setGame(r.game)).catch((e) => setErr(e.message));
  }, []);

  async function run(line) {
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await monoApi.cmd(line);
      setOut(r.output);
      setGame(r.game);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setBusy(true);
    try {
      const r = await monoApi.start(level, red);
      setGame(r.game);
      setOut(r.output);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!game) {
    return (
      <div className="fish-panel">
        <div className="fish-status">还没开局</div>
        <div className="param-label">强度 <span className="param-val">{level}</span>（1 只看不做 · 6 失控层）</div>
        <input className="range" type="range" min="1" max="6" step="1" value={level} onChange={(e) => setLevel(Number(e.target.value))} />
        <div className="param-label">红线（这些一律不会出现）</div>
        <div className="fish-actions">
          {KINKS.map((k) => (
            <button
              key={k}
              className={red.includes(k) ? 'on' : ''}
              onClick={() => setRed((r) => (r.includes(k) ? r.filter((x) => x !== k) : [...r, k]))}
            >
              {k}
            </button>
          ))}
        </div>
        <button className="fish-tell" onClick={start} disabled={busy}>开局</button>
        <div className="hint-line">后庭默认关。任何输入「404」立刻全停。</div>
        {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
      </div>
    );
  }

  return (
    <div className="fish-panel">
      <div className="fish-status">{game.status.split('\n')[0]}　强度 {game.level}</div>
      <div className="fish-out">{out || game.status}</div>
      <div className="fish-actions">
        <button onClick={() => run('roll')} disabled={busy}>掷骰</button>
        <button onClick={() => run('done')} disabled={busy}>做了</button>
        <button onClick={() => run('skip')} disabled={busy}>跳过</button>
        <button onClick={() => run('cards')} disabled={busy}>手牌</button>
        <button onClick={() => run('buy')} disabled={busy}>买卡 3币</button>
        <button onClick={() => run('end')} disabled={busy}>结算</button>
        <button onClick={() => run('404')} className="stop">404</button>
      </div>
      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
    </div>
  );
}


/* 小田：他自己种的，你只能看 */
function FarmPanel() {
  const [farm, setFarm] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    farmApi.state().then((r) => setFarm(r.farm)).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="fish-panel"><div className="hint-line">{err}</div></div>;
  if (!farm) return <div className="fish-panel"><div className="fish-status">读取中…</div></div>;

  return (
    <div className="fish-panel">
      <div className="fish-status">🌱 第 {farm.day} 天 · {farm.coins} 币</div>
      <div className="fish-out">{farm.status}</div>
      <div className="hint-line">这块地是他自己在种，平时自己浇水收菜——你想看就过来看一眼。</div>
    </div>
  );
}

/* 钓鱼：引擎在后端，这里是看得见的水面 */
function FishingPanel({ onTell }) {
  const [status, setStatus] = useState('');
  const [output, setOutput] = useState('');
  const [line, setLine] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const boxRef = useRef(null);

  useEffect(() => {
    fishingApi
      .state()
      .then((r) => setStatus(r.status))
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [output]);

  async function run(cmd) {
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await fishingApi.cmd(cmd);
      setOutput(r.output);
      setStatus(r.status);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fish-panel">
      <div className="fish-status">{status.split('\n')[0]}</div>

      <div className="fish-out" ref={boxRef}>
        {output || '水面很安静。抛一竿试试。'}
      </div>

      <div className="fish-actions">
        <button onClick={() => run('cast')} disabled={busy}>抛一竿</button>
        <button onClick={() => run('cast 10')} disabled={busy}>连钓十竿</button>
        <button onClick={() => run('inventory')} disabled={busy}>渔篓</button>
        <button onClick={() => run('enc')} disabled={busy}>图鉴</button>
        <button onClick={() => run('shop')} disabled={busy}>商店</button>
        <button onClick={() => run('dive 3')} disabled={busy}>潜水×3</button>
        <button onClick={() => run('buy oxygen 5')} disabled={busy}>买氧气5</button>
        <button onClick={() => run('sell all')} disabled={busy}>卖光</button>
      </div>

      <div className="fish-input">
        <input
          value={line}
          placeholder="指令：goto reed_river / dive 5 / choose 1 / surface / look 银梭鱼"
          onChange={(e) => setLine(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && line.trim()) {
              run(line.trim());
              setLine('');
            }
          }}
        />
        <button
          onClick={() => {
            if (line.trim()) {
              run(line.trim());
              setLine('');
            }
          }}
          disabled={busy || !line.trim()}
        >
          执行
        </button>
      </div>

      {output && (
        <button className="fish-tell" onClick={() => onTell && onTell(output)} disabled={busy}>
          让它说一句
        </button>
      )}
      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
    </div>
  );
}

export default function Games({ onGo }) {
  const [fishOpen, setFishOpen] = useState(false);
  const [monoOpen, setMonoOpen] = useState(false);
  const [farmOpen, setFarmOpen] = useState(false);

  /* 把渔获丢进聊天，让它接一句 */
  async function tell(out) {
    const brief = out.split('\n').slice(0, 4).join('\n').slice(0, 200);
    await api.chat({ message: `（我刚钓完鱼，结果是这样：\n${brief}\n）` }).catch(() => {});
  }

  return (
    <>
      <div className="page-head">
        <button className="back" onClick={() => onGo('home')}>
          <svg viewBox="0 0 24 24">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <div>
          <div className="set-title">一起玩</div>
          <div className="set-sub">5 个小游戏 · 还有一池鱼</div>
        </div>
      </div>

      <div className="game-grid">
        <div className={'game-card' + (farmOpen ? ' open' : '')} onClick={() => setFarmOpen((v) => !v)}>
          <span className="g-ico">🌱</span>
          <div>
            <div className="g-name">小田</div>
            <div className="g-meta">{farmOpen ? '收起' : '他自己在种'}</div>
          </div>
        </div>

        <div className={'game-card' + (monoOpen ? ' open' : '')} onClick={() => setMonoOpen((v) => !v)}>
          <span className="g-ico">🎲</span>
          <div>
            <div className="g-name">涩涩大富翁</div>
            <div className="g-meta">{monoOpen ? '收起' : '20 格 · 12 轮 · 18+'}</div>
          </div>
        </div>

        <div className={'game-card' + (fishOpen ? ' open' : '')} onClick={() => setFishOpen((v) => !v)}>
          <span className="g-ico">🎣</span>
          <div>
            <div className="g-name">钓鱼</div>
            <div className="g-meta">{fishOpen ? '收起' : '81 种鱼 · 11 个钓点'}</div>
          </div>
        </div>

        {GAMES.map(([icon, name, meta]) => (
          <div className="game-card" key={name}>
            <span className="g-ico">{icon}</span>
            <div>
              <div className="g-name">{name}</div>
              <div className="g-meta">{meta}</div>
            </div>
          </div>
        ))}
      </div>

      {farmOpen && <FarmPanel />}
      {monoOpen && <MonoPanel />}
      {fishOpen && <FishingPanel onTell={tell} />}

      <div className="section-label">4399</div>
      <div className="portal">
        <div className="p-title">4399 小游戏</div>
        <p className="p-desc">4399 禁止被别的网站内嵌，所以只能外链过去，不能直接放进来。</p>
      </div>
      <div className="write-row" style={{ marginTop: 14 }}>
        <button className="write-btn" onClick={() => window.open('https://www.4399.com', '_blank', 'noopener')}>
          打开 4399
        </button>
      </div>
      <div style={{ height: 24 }} />
    </>
  );
}
