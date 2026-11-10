import React, { useEffect, useMemo, useState } from 'react';
import Opening from './Opening.jsx';
import Home from './screens/Home.jsx';
import Chat from './screens/Chat.jsx';
import Diary from './screens/Diary.jsx';
import Aerie from './screens/Aerie.jsx';
import Settings from './screens/Settings.jsx';
import Rituals from './screens/Rituals.jsx';
import Album from './screens/Album.jsx';
import Mail from './screens/Mail.jsx';
import Games from './screens/Games.jsx';
import Lock from './components/Lock.jsx';
import { authApi, uiSettings } from './api.js';

const DEFAULTS = {
  theme: 'cream',
  font: 'serif',
  surface: 'paper', // paper | glass | chat
  fontSize: 15,
  lineHeight: 1.9,
  letterSpacing: 0.015,
  bubbleRadius: 20,
  bubbleAlpha: 0.48,
  globalRadius: 18,
  veil: 0.46,
  blur: 14,
  me: 'Bunny',
  homeTitle: '',
  startDate: '2025-02-01',
  savedAt: 0,
  patMe: '顺毛',
  patTa: '摸摸头',
  showAvatars: false,
  lang: 'zh'
};

function load() {
  try {
    const raw = localStorage.getItem('bunnyhome');
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default function App() {
  const [settings, setSettings] = useState(load);
  /* 口令锁：checking -> ok / locked */
  const [authState, setAuthState] = useState('checking');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    let alive = true;
    authApi
      .check()
      .then((r) => alive && setAuthState(r.ok ? 'ok' : 'locked'))
      .catch(() => alive && setAuthState('locked'));
    return () => {
      alive = false;
    };
  }, []);
  const KNOWN = ['object', 'home', 'chat', 'diary', 'aerie', 'settings', 'opening'];
  const [screen, setScreen] = useState(() => {
    const h = (window.location.hash || '').replace('#', '');
    return KNOWN.includes(h) && h !== 'object' ? h : 'opening';
  });

  /* 每次改动记一个时间戳：云端与本地的合并以「谁更新」为准 */
  const update = (patch) => setSettings((s) => ({ ...s, ...patch, savedAt: Date.now() }));

  /* 进站后拉一次云端设置（换设备/清缓存也能恢复） */
  useEffect(() => {
    if (authState !== 'ok') return;
    let alive = true;
    uiSettings
      .get()
      .then((v) => {
        if (!alive || !v || typeof v !== 'object') return;
        /* 只有云端比本地新才覆盖，避免旧配置把刚改的冲掉 */
        setSettings((s) => ((v.savedAt || 0) > (s.savedAt || 0) ? { ...s, ...v } : s));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [authState]);

  /* 改动后 1.2 秒自动同步，手滑也不会丢 */
  useEffect(() => {
    if (authState !== 'ok') return;
    const t = setTimeout(() => {
      uiSettings.save(settings).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [settings, authState]);

  async function saveNow() {
    setSaving(true);
    setSaveMsg('');
    try {
      await uiSettings.save(settings);
      setSaveMsg('已保存');
    } catch (e) {
      setSaveMsg('保存失败：' + e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 2600);
    }
  }

  useEffect(() => {
    try {
      localStorage.setItem('bunnyhome', JSON.stringify(settings));
    } catch {
      /* 忽略隐私模式下的写入失败 */
    }

    const r = document.documentElement;
    document.body.setAttribute('data-theme', settings.theme);
    document.body.setAttribute('data-font', settings.font);
    document.body.setAttribute(
      'data-surface',
      settings.surface === 'glass' ? 'glass' : 'paper'
    );
    if (settings.showAvatars) document.body.classList.add('show-avatars');
    else document.body.classList.remove('show-avatars');

    r.style.setProperty('--fs', settings.fontSize + 'px');
    r.style.setProperty('--lh', settings.lineHeight);
    r.style.setProperty('--ls', settings.letterSpacing + 'em');
    r.style.setProperty('--bubble-radius', settings.bubbleRadius + 'px');
    r.style.setProperty('--bubble-alpha', settings.bubbleAlpha);
    r.style.setProperty('--global-radius', settings.globalRadius + 'px');
    r.style.setProperty('--glass-veil', settings.veil);
    r.style.setProperty('--glass-blur', settings.blur + 'px');
  }, [settings]);

  const chatGlass = settings.surface !== 'paper';
  const me = settings.me || 'Bunny';
  const homeTitle = settings.homeTitle || `${me}'s Home`;

  const screens = useMemo(
    () => ({
      home: (
        <Home
          me={me}
          homeTitle={homeTitle}
            startDate={settings.startDate}
          onGo={setScreen}
        />
      ),
      chat: (
        <Chat
          glass={chatGlass}
          me={me}
          showAvatars={settings.showAvatars}
          patMe={settings.patMe}
          patTa={settings.patTa}
          onGo={setScreen}
        />
      ),
      diary: <Diary me={me} onGo={setScreen} />,
      aerie: <Aerie me={me} onGo={setScreen} />,
      rituals: <Rituals onGo={setScreen} />,
      album: <Album onGo={setScreen} />,
      mail: <Mail me={me} onGo={setScreen} />,
      games: <Games onGo={setScreen} />,
      settings: (
        <Settings
          settings={settings}
          update={update}
          onSave={saveNow}
          saving={saving}
          saveMsg={saveMsg}
          onGo={setScreen}
        />
      )
    }),
    [me, homeTitle, chatGlass, settings, setScreen]
  );

  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'chat', label: 'Chat' },
    { id: 'diary', label: 'Diary' },
    { id: 'aerie', label: 'Aerie' },
    { id: 'settings', label: 'Settings' }
  ];

  const isTab = tabs.some((t) => t.id === screen);

  if (authState === 'locked') return <Lock onUnlock={() => setAuthState('ok')} />;
  if (authState === 'checking') return <div className="boot-blank" />;

  return (
    <>
      <div className="phone">
        <StatusBar dark={screen === 'opening'} />

        {screen === 'opening' ? (
          <Opening onEnter={() => setScreen('home')} />
        ) : (
          <section className={'screen active ' + (screen === 'chat' ? (chatGlass ? 'chat--glass' : 'chat--paper') : '')}>
            <div className={screen === 'chat' ? 'chat-wrap' : 'scroll'}>{screens[screen]}</div>
          </section>
        )}

        {isTab && <TabBar tabs={tabs} current={screen} onGo={setScreen} />}
      </div>

      <aside className="legend">
        <h3>{homeTitle}</h3>
        <p className="legend-note">
          你和 Elliott 的私人空间。<br />
          口令保护 · 五个模型通道 · 记忆云端同步
        </p>
        <p className="legend-note">
          手机上用浏览器打开，选「添加到主屏幕」，就能像 App 一样全屏使用。
        </p>
      </aside>
    </>
  );
}

function StatusBar({ dark }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  const h = now.getHours() % 12 || 12;
  const m = String(now.getMinutes()).padStart(2, '0');
  return (
    <div className="statusbar">
      <span>{`${h}:${m}`}</span>
      <div className="icons">
        <svg width="15" height="10" viewBox="0 0 15 10" fill="currentColor">
          <rect x="0" y="6" width="2.4" height="4" rx="0.6" />
          <rect x="3.6" y="4.2" width="2.4" height="5.8" rx="0.6" />
          <rect x="7.2" y="2.4" width="2.4" height="7.6" rx="0.6" />
          <rect x="10.8" y="0.4" width="2.4" height="9.6" rx="0.6" />
        </svg>
        <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
          <path d="M7 9.2 4.4 6.6a3.7 3.7 0 0 1 5.2 0L7 9.2Zm-4.2-4.4a6.6 6.6 0 0 1 8.4 0l-1.1 1.1a5 5 0 0 0-6.2 0L2.8 4.8ZM.6 2.6a9.5 9.5 0 0 1 12.8 0l-1.1 1.1a7.9 7.9 0 0 0-10.6 0L.6 2.6Z" />
        </svg>
        <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor">
          <rect x="0.5" y="0.5" width="17" height="9" rx="2.4" />
          <rect x="2" y="2" width="12.5" height="6" rx="1.2" fill="currentColor" stroke="none" />
          <path d="M19.4 3.4v3.2c1-.3 1.4-.9 1.4-1.6s-.4-1.3-1.4-1.6Z" fill="currentColor" stroke="none" />
        </svg>
      </div>
    </div>
  );
}

export function TabBar({ tabs, current, onGo }) {
  const icons = {
    home: <path d="M4 11 12 4.5l8 6.5v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8Z" />,
    chat: <path d="M20.5 12.2c0 4-3.8 7.2-8.5 7.2-1 0-2-.1-2.9-.4L4 20.5l1.1-3.4A6.9 6.9 0 0 1 3.5 12.2C3.5 8.2 7.3 5 12 5s8.5 3.2 8.5 7.2Z" />,
    diary: (
      <>
        <path d="M5 4.5h11.5A1.5 1.5 0 0 1 18 6v14H6.5A1.5 1.5 0 0 1 5 18.5v-14Z" />
        <path d="M5 17.5h13M9 8.5h5" />
      </>
    ),
    aerie: (
      <>
        <path d="M4 11 12 4.5l8 6.5v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8Z" />
        <path d="M10 20v-5h4v5" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="2.9" />
        <path d="M12 3.5v2.2M12 18.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
      </>
    )
  };

  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={'tab' + (current === t.id ? ' active' : '')}
          onClick={() => onGo(t.id)}
        >
          <svg viewBox="0 0 24 24">{icons[t.id]}</svg>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
