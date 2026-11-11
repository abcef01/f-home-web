import React from 'react';
import ModelPicker from '../components/ModelPicker.jsx';
import ChatSettings from '../components/ChatSettings.jsx';
import StickerManager from '../components/StickerManager.jsx';
import AvatarPicker from '../components/AvatarPicker.jsx';
import NotifyToggle from '../components/NotifyToggle.jsx';
import { api, auth } from '../api.js';
import BackupBox from '../components/BackupBox.jsx';
import { factsApi, memoryApi, placeApi } from '../api.js';
import { speak, chineseVoices, onVoicesReady, speechSupported } from '../lib/speech.js';

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
        <div className="gl">位置与天气</div>
        <PlaceBox />
      </div>

      <div className="group">
        <div className="gl">声音</div>
        <VoiceBox settings={settings} update={update} />
      </div>

      <div className="group">
        <div className="gl">记忆</div>
        <MemoryBox />
      </div>

      <div className="group">
        <div className="gl">重要事实</div>
        <FactsBox />
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

/* 重要事实：生日、忌讳、约定——这些永远不会被记忆压缩掉 */
function FactsBox() {
  const [list, setList] = React.useState([]);
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    factsApi.list().then(setList).catch((e) => setErr(e.message));
  }, []);

  async function add() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setErr('');
    try {
      setList(await factsApi.add(t));
      setText('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    try {
      setList(await factsApi.remove(id));
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="facts-box">
      {list.length === 0 && <div className="hint-line">还没有。写点它会一直记得的事。</div>}
      {list.map((f) => (
        <div className="fact-row" key={f.id}>
          <span>{f.text}</span>
          <button onClick={() => remove(f.id)} title="删除">×</button>
        </div>
      ))}
      <div className="fact-add">
        <input
          value={text}
          placeholder="比如：她生日 3 月 14 日"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button onClick={add} disabled={busy || !text.trim()}>{busy ? '…' : '记住'}</button>
      </div>
      <div className="hint-line">这些会一直带给它，不会被记忆压缩掉。</div>
      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
    </div>
  );
}
/* 三层记忆：碎片 / 事件 / 核心，另有待确认的候选 */
function MemoryBox() {
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState('');
  const [open, setOpen] = React.useState('');

  React.useEffect(() => {
    memoryApi.get().then(setData).catch((e) => setErr(e.message));
  }, []);

  async function decide(id, accept) {
    try {
      const r = await memoryApi.decideCandidate(id, accept);
      setData((d) => ({ ...d, core: r.core, candidates: r.candidates }));
    } catch (e) {
      setErr(e.message);
    }
  }

  async function drop(id) {
    try {
      const r = await memoryApi.removeCore(id);
      setData((d) => ({ ...d, core: r.core }));
    } catch (e) {
      setErr(e.message);
    }
  }

  if (!data) return <div className="hint-line">读取中…</div>;

  const { candidates = [], core = [], events = [], fragments = [] } = data;

  return (
    <div className="mem-box">
      {candidates.length > 0 && (
        <div className="mem-cand">
          <div className="mem-sub">它想记住这些，要吗？</div>
          {candidates.map((c) => (
            <div className="fact-row" key={c.id}>
              <span>{c.text}</span>
              <button onClick={() => decide(c.id, true)} title="记住">✓</button>
              <button onClick={() => decide(c.id, false)} title="不要">×</button>
            </div>
          ))}
        </div>
      )}

      <div className="mem-sub">核心 · {core.length}</div>
      {core.length === 0 && <div className="hint-line">还没有确认过的长期记忆。</div>}
      {core.map((c) => (
        <div className="fact-row" key={c.id}>
          <span>{c.text}</span>
          <button onClick={() => drop(c.id)} title="删除">×</button>
        </div>
      ))}

      <div className="mem-sub" onClick={() => setOpen(open === 'e' ? '' : 'e')} style={{ cursor: 'pointer' }}>
        事件 · {events.length} {open === 'e' ? '▾' : '▸'}
      </div>
      {open === 'e' && events.map((e) => <div className="mem-line" key={e.id}>{e.text}</div>)}

      <div className="mem-sub" onClick={() => setOpen(open === 'f' ? '' : 'f')} style={{ cursor: 'pointer' }}>
        碎片 · {fragments.length} {open === 'f' ? '▾' : '▸'}
      </div>
      {open === 'f' && fragments.map((f) => <div className="mem-line" key={f.id}>{f.text}</div>)}

      <div className="hint-line">
        碎片自动提取，攒够几条会合并成事件；核心要你确认才会升级，永远不会被压缩掉。
      </div>
      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
    </div>
  );
}
/* 它的声音 */
function VoiceBox({ settings, update }) {
  const voice = settings.voice || {};
  const [voices, setVoices] = React.useState([]);

  React.useEffect(() => {
    if (!speechSupported()) return;
    return onVoicesReady((list) => setVoices(chineseVoices()));
  }, []);

  function set(patch) {
    update({ voice: { ...voice, ...patch } });
  }

  if (!speechSupported()) {
    return <div className="hint-line">这个浏览器不支持语音合成。</div>;
  }

  return (
    <div className="voice-box">
      <div className="list-item">
        <span className="t">新消息自动念</span>
        <button
          className={'toggle' + (voice.auto ? ' on' : '')}
          onClick={() => set({ auto: !voice.auto })}
          aria-label="自动朗读开关"
        />
      </div>

      <div className="param-label">
        语速 <span className="param-val">{(voice.rate || 1).toFixed(2)}×</span>
      </div>
      <input
        className="range"
        type="range"
        min="0.7"
        max="1.4"
        step="0.05"
        value={voice.rate || 1}
        onChange={(e) => set({ rate: Number(e.target.value) })}
      />

      <div className="param-label">音色</div>
      <select
        className="voice-select"
        value={voice.name || ''}
        onChange={(e) => set({ name: e.target.value })}
      >
        <option value="">系统默认</option>
        {voices.map((v) => (
          <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
        ))}
      </select>

      <button
        className="avatar-btn"
        style={{ alignSelf: 'flex-start', marginTop: 6 }}
        onClick={() => speak('嗯，我在。今天过得怎么样？', { rate: voice.rate || 1, voiceName: voice.name || '' })}
      >
        试听
      </button>
      <div className="hint-line">
        用的是手机自带的语音，不花钱、离线也能用。音色取决于你系统里装了什么。
      </div>
    </div>
  );
}
/* 位置与天气：知道你在哪、外面什么天 */
function PlaceBox() {
  const [loc, setLoc] = React.useState(null);
  const [wx, setWx] = React.useState(null);
  const [city, setCity] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    placeApi.get().then((r) => {
      setLoc(r.location);
      setWx(r.weather);
    }).catch((e) => setErr(e.message));
  }, []);

  async function useMyLocation() {
    setBusy(true);
    setErr('');
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000 })
      );
      const r = await placeApi.set({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      setLoc(r.location);
      setWx(r.weather);
    } catch (e) {
      setErr(e.code === 1 ? '你拒绝了定位权限' : '定位失败，可以直接填城市名');
    } finally {
      setBusy(false);
    }
  }

  async function useCity() {
    if (!city.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const r = await placeApi.set({ city: city.trim() });
      setLoc(r.location);
      setWx(r.weather);
      setCity('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="place-box">
      {loc ? (
        <div className="fact-row">
          <span>{loc.city || '已设置位置'} {loc.region ? `· ${loc.region}` : ''}</span>
        </div>
      ) : (
        <div className="hint-line">还没设置位置。设好之后它就知道你那边天气。</div>
      )}

      {wx && (
        <div className="hint-line">
          现在 {wx.now.temp}°C（体感 {wx.now.feels}°C）{wx.now.text}；
          今天 {wx.days?.[0]?.min}~{wx.days?.[0]?.max}°C
          {wx.days?.[0]?.rain > 30 ? `，降雨 ${wx.days[0].rain}%` : ''}
        </div>
      )}

      <button className="avatar-btn" onClick={useMyLocation} disabled={busy} style={{ alignSelf: 'flex-start' }}>
        {busy ? '定位中…' : '取我的位置'}
      </button>

      <div className="fact-add">
        <input
          value={city}
          placeholder="或者直接填城市，比如 杭州"
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && useCity()}
        />
        <button onClick={useCity} disabled={busy || !city.trim()}>设</button>
      </div>

      <div className="hint-line">只用来查天气，不会持续追踪你。</div>
      {err && <div className="hint-line" style={{ color: '#b4553f' }}>{err}</div>}
    </div>
  );
}