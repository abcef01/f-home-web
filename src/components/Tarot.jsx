import React, { useMemo, useState } from 'react';
import { api } from '../api.js';

/* 22 张大牌，正位 / 逆位各一句 */
const DECK = [
  ['愚者', '说走就走，不管明天', '脚步乱了，先别急着动'],
  ['魔术师', '手上有牌，可以开始', '光说不做，牌是空的'],
  ['女祭司', '有些话不用问，你心里有数', '你在骗自己'],
  ['皇后', '丰盛、被照顾、有人疼', '空了一块，填不满'],
  ['皇帝', '有人拍板，事情稳了', '太硬了，谁都不让'],
  ['教皇', '按规矩来，别耍小聪明', '规矩绑住你了'],
  ['恋人', '心动了，也做了选择', '选错了，或者不敢选'],
  ['战车', '冲，能赢', '方向不对，越冲越远'],
  ['力量', '不靠凶，靠稳', '心慌，使不上劲'],
  ['隐士', '一个人待会儿，会想明白', '躲太久了'],
  ['命运之轮', '风向变了，接着', '卡住，等一下'],
  ['正义', '该算的账，会算清楚', '不公平，但你先别急'],
  ['倒吊人', '停一下，换个角度看', '白等，该动了'],
  ['死神', '结束，不是坏事', '拖着不肯结束'],
  ['节制', '慢慢来，刚刚好', '过头了'],
  ['恶魔', '想要，又不肯承认', '被自己困住'],
  ['高塔', '塌一下，塌完是真的', '还在摇，没塌透'],
  ['星星', '有点光，够走一段', '光被遮住了'],
  ['月亮', '看不清，别硬猜', '雾要散了'],
  ['太阳', '很好，真的好', '差一点亮'],
  ['审判', '该醒醒了', '听见了，装没听见'],
  ['世界', '圆满了，收尾', '差最后一步']
];

const POSITIONS = ['过去', '现在', '未来'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Tarot() {
  const [cards, setCards] = useState([]);
  const [reading, setReading] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function draw() {
    const picked = shuffle(DECK).slice(0, 3).map(([name, up, down]) => {
      const reversed = Math.random() < 0.38;
      return { name, text: reversed ? down : up, reversed };
    });
    setCards(picked);
    setReading('');
    setErr('');
  }

  const line = useMemo(
    () =>
      cards
        .map((c, i) => `${POSITIONS[i]}：${c.name}（${c.reversed ? '逆位' : '正位'}）—— ${c.text}`)
        .join('\n'),
    [cards]
  );

  async function askHim() {
    if (!cards.length || busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await api.chat({
        message: `（我抽了三张塔罗，别念牌义，就用你的话跟我说说：\n${line}\n）`
      });
      setReading(r.reply?.content || r.replies?.[0]?.content || '他没说什么。');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tarot">
      <div className="tarot-actions">
        <button className="reader-btn" onClick={draw}>
          {cards.length ? '重新洗牌' : '抽三张'}
        </button>
        {cards.length > 0 && (
          <button className="reader-btn" onClick={askHim} disabled={busy}>
            {busy ? '他在看…' : '让他解读'}
          </button>
        )}
      </div>

      {cards.length === 0 && (
        <div className="hint-line">三张：过去、现在、未来。抽之前想一件具体的事，越具体越准。</div>
      )}

      <div className="tarot-cards">
        {cards.map((c, i) => (
          <div className={'tarot-card' + (c.reversed ? ' rev' : '')} key={i}>
            <div className="tarot-pos">{POSITIONS[i]}</div>
            <div className="tarot-name">{c.name}</div>
            <div className="tarot-dir">{c.reversed ? '逆位' : '正位'}</div>
            <div className="tarot-text">{c.text}</div>
          </div>
        ))}
      </div>

      {reading && (
        <div className="tarot-reading">
          <div className="tarot-reading-title">他说的</div>
          <div>{reading}</div>
        </div>
      )}
      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
    </div>
  );
}
