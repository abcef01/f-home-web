import React, { useEffect, useState } from 'react';

/* 桌面端：捕获浏览器的安装事件，提供一个「安装到桌面」按钮。
   装完后就是一个独立窗口，没有地址栏，跟软件一样。 */
export default function InstallHint() {
  const [evt, setEvt] = useState(null);
  const [done, setDone] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setStandalone(true);
      return;
    }
    const onPrompt = (e) => {
      e.preventDefault();
      setEvt(e);
    };
    const onInstalled = () => {
      setDone(true);
      setEvt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (standalone) return null;

  if (done) {
    return <p className="legend-note">已经装好了，从桌面图标打开就是独立窗口。</p>;
  }

  if (!evt) {
    return (
      <p className="legend-note">
        想当软件用？Chrome / Edge 右上角菜单里选「安装 Bunny&apos;s Home」，
        之后就是一个独立窗口，没有地址栏。
      </p>
    );
  }

  return (
    <div className="install-row">
      <button
        className="install-btn"
        onClick={async () => {
          evt.prompt();
          const r = await evt.userChoice;
          if (r.outcome === 'accepted') setDone(true);
          setEvt(null);
        }}
      >
        安装到桌面
      </button>
      <span className="legend-note" style={{ margin: 0 }}>
        装成独立窗口，像软件一样用
      </span>
    </div>
  );
}
