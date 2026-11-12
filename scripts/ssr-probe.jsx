import React from 'react';
import { renderToString } from 'react-dom/server';
import Chat from '../src/screens/Chat.jsx';
import Home from '../src/screens/Home.jsx';
import Aerie from '../src/screens/Aerie.jsx';
import Memory from '../src/screens/Memory.jsx';
import Diary from '../src/screens/Diary.jsx';
import Rituals from '../src/screens/Rituals.jsx';
import Games from '../src/screens/Games.jsx';
import Moments from '../src/screens/Moments.jsx';
import Favorites from '../src/screens/Favorites.jsx';
import Wallet from '../src/screens/Wallet.jsx';
import Study from '../src/screens/Study.jsx';
import Reading from '../src/screens/Reading.jsx';
import Reader from '../src/screens/Reader.jsx';
import Album from '../src/screens/Album.jsx';
import Settings from '../src/screens/Settings.jsx';

const noop = () => {};
const screens = {
  Chat: <Chat me="Bunny" onGo={noop} onCall={noop} avatars={{}} />,
  Home: <Home me="Bunny" homeTitle="Bunny's Home" startDate="2025-02-01" onGo={noop} unread={{}} />,
  Aerie: <Aerie me="Bunny" startDate="2025-02-01" onGo={noop} unread={{}} />,
  Memory: <Memory onGo={noop} />,
  Diary: <Diary me="Bunny" onGo={noop} />,
  Rituals: <Rituals startDate="2025-02-01" onGo={noop} />,
  Games: <Games onGo={noop} />,
  Moments: <Moments onGo={noop} me="Bunny" />,
  Favorites: <Favorites onGo={noop} />,
  Wallet: <Wallet onGo={noop} />,
  Study: <Study onGo={noop} />,
  Reading: <Reading onGo={noop} />,
  Reader: <Reader onGo={noop} />,
  Album: <Album onGo={noop} />,
  Settings: <Settings settings={{}} update={noop} onSave={noop} onGo={noop} avatars={{}} onAvatarsChange={noop} />
};

let bad = 0;
for (const [name, el] of Object.entries(screens)) {
  try {
    const html = renderToString(el);
    console.log('✅', name, html.length, 'chars');
  } catch (e) {
    bad++;
    console.log('❌', name, '→', e.message);
  }
}
console.log(bad ? `\n有 ${bad} 个页面渲染失败` : '\n全部渲染通过');
