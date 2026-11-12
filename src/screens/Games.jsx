import { fishingApi, monoApi, farmApi, burgerApi, pondApi, api } from '../api.js';
import Slots from './Slots.jsx';
import { GomokuPanel, TicTacToePanel, RpsPanel, TruthDarePanel, DrawGuessPanel } from '../components/MiniGames.jsx';
import React, { useEffect, useRef, useState } from 'react';

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
  const [safe, setSafe] = useState('停一下');
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
      /* 抽到任务就转给他，让他自己念、自己接 */
      const pend = r.game?.pending;
      if (pend && pend.text && pend.kind !== 'buyTerritory') {
        api.chat({ message: '（大富翁抽到任务了：' + pend.text + '）' }).catch(() => {});
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setBusy(true);
    try {
      const r = await monoApi.start(level, red, safe);
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
        <div className="param-label">安全词（说出口立刻停）</div>
        <div className="fact-add">
          <input value={safe} onChange={(e) => setSafe(e.target.value)} placeholder="停一下" />
        </div>
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
      <div className="fact-add" style={{ marginTop: 6 }}>
        <input defaultValue={game.safeword || ''} placeholder="安全词" /* safeEditShown */
          onBlur={(e) => { const w = e.target.value.trim(); if (w && w !== game.safeword) run('safeword ' + w); }} />
      </div>
      </div>
      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
    </div>
  );
}






/* 瓶中生态 */
function PondPanel() {
  const [pond, setPond] = useState(null);
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    pondApi.state().then((r) => setPond(r.pond)).catch((e) => setErr(e.message));
  }, []);

  async function run(cmd) {
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await pondApi.cmd(cmd);
      setOut(r.output);
      setPond(r.pond);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fish-panel">
      <div className="fish-status">{pond ? pond.status.split('\n')[0] : '读取中…'}</div>
      <div className="fish-out">{out || (pond ? pond.status : '')}</div>

      <div className="fish-actions">
        <button onClick={() => run('wait 3')} disabled={busy}>过三天</button>
        <button onClick={() => run('add 藻 5')} disabled={busy}>放藻</button>
        <button onClick={() => run('add weed 2')} disabled={busy}>放水草</button>
        <button onClick={() => run('add daphnia 3')} disabled={busy}>放水蚤</button>
        <button onClick={() => run('add minnow 2')} disabled={busy}>放鱼</button>
        <button onClick={() => run('skim')} disabled={busy}>捞藻</button>
        <button onClick={() => run('water')} disabled={busy}>换水</button>
        <button onClick={() => run('status')} disabled={busy}>看池子</button>
      </div>

      <div className="hint-line">
        没有分数。放进去的东西会自己长、自己吃、自己死——水会臭，鱼会浮上来。
      </div>
      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
    </div>
  );
}

/* 中午的汉堡店 */
function BurgerPanel() {
  const [game, setGame] = useState(null);
  const [out, setOut] = useState('');
  const [line, setLine] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    burgerApi.state().then((r) => setGame(r.game)).catch((e) => setErr(e.message));
  }, []);

  async function run(cmd) {
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await burgerApi.cmd(cmd);
      setOut(r.output);
      setGame(r.game);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fish-panel">
      <div className="fish-status">{game ? game.status.split('\n')[0] : '读取中…'}</div>
      <div className="fish-out">{out || (game ? game.status : '')}</div>

      <div className="fish-actions">
        <button onClick={() => run('order')} disabled={busy}>看单</button>
        <button onClick={() => run('wait')} disabled={busy}>等一回合</button>
        <button onClick={() => run('serve')} disabled={busy}>出餐</button>
        <button onClick={() => run('day')} disabled={busy}>收摊</button>
        <button onClick={() => run('shop')} disabled={busy}>装修</button>
        <button onClick={() => run('status')} disabled={busy}>状态</button>
      </div>

      <div className="fish-input">
        <input
          value={line}
          placeholder="grill 牛肉饼 / flip A / take A / build 原味胚 生菜 牛肉饼 原味胚 / sauce 番茄酱 正常"
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

      <div className="hint-line">
        自己玩也行：看单 → grill 肉 → 等到正好 → flip 翻面 → take 取 → build 按顺序叠 → sauce 加酱 → serve 出餐。
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
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [pondOpen, setPondOpen] = useState(false);
  const [slotOpen, setSlotOpen] = useState(false);
  const [gomokuOpen, setGomokuOpen] = useState(false);
  const [tttOpen, setTttOpen] = useState(false);
  const [rpsOpen, setRpsOpen] = useState(false);
  const [tdOpen, setTdOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);

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

        <div className={'game-card' + (gomokuOpen ? ' open' : '')} onClick={() => setGomokuOpen((v) => !v)}>
          <span className="g-ico">⚫</span>
          <div>
            <div className="g-name">五子棋</div>
            <div className="g-meta">{gomokuOpen ? '收起' : '13 路 · 你执黑'}</div>
          </div>
        </div>

        <div className={'game-card' + (tttOpen ? ' open' : '')} onClick={() => setTttOpen((v) => !v)}>
          <span className="g-ico">＃</span>
          <div>
            <div className="g-name">井字棋</div>
            <div className="g-meta">{tttOpen ? '收起' : '他会算'}</div>
          </div>
        </div>

        <div className={'game-card' + (rpsOpen ? ' open' : '')} onClick={() => setRpsOpen((v) => !v)}>
          <span className="g-ico">✌</span>
          <div>
            <div className="g-name">石头剪刀布</div>
            <div className="g-meta">{rpsOpen ? '收起' : '运气游戏'}</div>
          </div>
        </div>

        <div className={'game-card' + (tdOpen ? ' open' : '')} onClick={() => setTdOpen((v) => !v)}>
          <span className="g-ico">♡</span>
          <div>
            <div className="g-name">真心话大冒险</div>
            <div className="g-meta">{tdOpen ? '收起' : '抽一张，不许换'}</div>
          </div>
        </div>

        <div className={'game-card' + (drawOpen ? ' open' : '')} onClick={() => setDrawOpen((v) => !v)}>
          <span className="g-ico">✎</span>
          <div>
            <div className="g-name">你画我猜</div>
            <div className="g-meta">{drawOpen ? '收起' : '他看图猜'}</div>
          </div>
        </div>


        <div className={'game-card' + (slotOpen ? ' open' : '')} onClick={() => setSlotOpen((v) => !v)}>
          <span className="g-ico">🎰</span>
          <div>
            <div className="g-name">老虎机</div>
            <div className="g-meta">{slotOpen ? '收起' : '转到什么就是什么'}</div>
          </div>
        </div>

        <div className={'game-card' + (pondOpen ? ' open' : '')} onClick={() => setPondOpen((v) => !v)}>
          <span className="g-ico">🫙</span>
          <div>
            <div className="g-name">瓶中生态</div>
            <div className="g-meta">{pondOpen ? '收起' : '一池清水'}</div>
          </div>
        </div>

        <div className={'game-card' + (burgerOpen ? ' open' : '')} onClick={() => setBurgerOpen((v) => !v)}>
          <span className="g-ico">🍔</span>
          <div>
            <div className="g-name">汉堡店</div>
            <div className="g-meta">{burgerOpen ? '收起' : '7 天 · 烤肉与叠层'}</div>
          </div>
        </div>

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

      {gomokuOpen && <GomokuPanel onTell={tell} />}
      {tttOpen && <TicTacToePanel onTell={tell} />}
      {rpsOpen && <RpsPanel onTell={tell} />}
      {tdOpen && <TruthDarePanel onTell={tell} />}
      {drawOpen && <DrawGuessPanel onTell={tell} />}
      {slotOpen && <Slots />}
      {pondOpen && <PondPanel />}
      {burgerOpen && <BurgerPanel />}
      {farmOpen && <FarmPanel />}
      {monoOpen && <MonoPanel />}
      {fishOpen && <FishingPanel onTell={tell} />}
      <div style={{ height: 24 }} />
    </>
  );
}
