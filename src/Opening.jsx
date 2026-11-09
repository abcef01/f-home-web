import React, { useEffect, useRef, useState } from 'react';

const COPY = '在 0 和 1 的尽头，我遇见了你。';
const CHARS = '01';

function heartInside(u, v) {
  const a = u * u + v * v - 1;
  return a * a * a - u * u * v * v * v <= 0;
}
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function envBeat(t) {
  const ps = (t - 4200) / 1000;
  if (ps <= 0) return 0;
  return (
    Math.pow(Math.max(0, Math.sin(ps * Math.PI * 1.5)), 4) +
    0.6 * Math.pow(Math.max(0, Math.sin(ps * Math.PI * 1.5 - 0.7)), 6)
  );
}

export default function Opening({ onEnter }) {
  const canvasRef = useRef(null);
  const rootRef = useRef(null);
  const stateRef = useRef({ parts: [], beat: null, raf: 0, t0: 0 });
  const [showText, setShowText] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = rootRef.current;
    if (!canvas || !host) return undefined;
    const ctx = canvas.getContext('2d');
    const S = stateRef.current;

    let W = 0;
    let H = 0;
    let dpr = 1;

    const build = () => {
      const r = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cx = W / 2;
      const cy = H * 0.4;
      const sc = Math.min(W * 0.3, 116);

      const targets = [];
      let guard = 0;
      while (targets.length < 420 && guard < 90000) {
        guard++;
        const u = Math.random() * 2.72 - 1.36;
        const v = Math.random() * 2.5 - 1.32;
        if (!heartInside(u, v)) continue;
        targets.push({ x: cx + u * sc, y: cy - v * sc });
      }

      const parts = [];
      for (let i = 0; i < 420; i++) {
        const tg = targets[i % targets.length];
        parts.push({
          x: Math.random() * W,
          y: Math.random() * H * 1.5 - H * 0.45,
          vx: -12 + Math.random() * 26,
          vy: 55 + Math.random() * 115,
          tx: tg.x,
          ty: tg.y,
          ch: CHARS.charAt(Math.floor(Math.random() * CHARS.length)),
          ph: Math.random() * 6.283,
          k: 5.5 + Math.random() * 5,
          a: 0.22 + Math.random() * 0.55,
          s: 0.95,
          flow: 5.2 + Math.random() * 5,
          rho: 0,
          ux: 0,
          uy: 0
        });
      }

      const dists = parts.map((p) => {
        const dx = p.tx - cx;
        const dy = p.ty - cy;
        const d = Math.hypot(dx, dy) || 1;
        p.rho = d;
        p.ux = dx / d;
        p.uy = dy / d;
        return d;
      });
      const sorted = [...dists].sort((a, b) => a - b);
      const thr = sorted[Math.floor(sorted.length * 0.72)] || 0;
      parts.forEach((p, i) => {
        p.edge = dists[i] >= thr;
      });

      S.parts = parts;
      S.beat = null;
      S.W = W;
      S.H = H;
      S.cx = cx;
      S.cy = cy;
      S.sc = sc;
    };

    const draw = (t, dt) => {
      const { parts, cx, cy } = S;
      ctx.clearRect(0, 0, W, H);

      const breath = 0.5 + 0.5 * Math.sin(t * 0.00078);
      const raw = envBeat(t);
      S.beat = S.beat === null ? raw : S.beat * 0.82 + raw * 0.18;
      const beat = S.beat;

      const glowA = 0.05 + 0.035 * breath + 0.05 * beat;
      const g = ctx.createRadialGradient(cx, cy, 12, cx, cy, 300);
      g.addColorStop(0, `rgba(198,220,236,${glowA.toFixed(3)})`);
      g.addColorStop(1, 'rgba(198,220,236,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = 'center';
      ctx.font = '9.5px Consolas, monospace';

      const fadeIn = clamp01(t / 900);
      const bloom = 1 + 0.022 * beat;

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];

        if (t < 1200) {
          p.y += p.vy * dt * 0.55;
          p.x += p.vx * dt * 0.55;
          if (p.y > H + 20) {
            p.y = -20;
            p.x = Math.random() * W;
          }
          ctx.fillStyle = `rgba(196,210,220,${(p.a * fadeIn).toFixed(3)})`;
          ctx.fillText(p.ch, p.x, p.y);
          continue;
        }

        let px;
        let py;
        let aa;

        if (t / 1000 > p.flow) {
          p.s += (0.1 + 0.05 * Math.sin(p.ph)) * dt * (1 + 0.85 * beat);
          if (p.s > 1.4) p.s -= 1.4;

          const s = p.s;
          let rr;
          if (s < 0.12) {
            rr = 0.14 + 0.4 * (s / 0.12);
            aa = s / 0.12;
          } else if (s < 0.28) {
            rr = 0.54 + ((s - 0.12) / 0.16) * 0.46;
            aa = 1;
          } else if (s < 0.95) {
            rr = 1;
            aa = 1;
          } else {
            const k3 = (s - 0.95) / 0.45;
            rr = 1 + 0.55 * k3;
            aa = Math.pow(1 - k3, 1.4);
          }
          if (aa <= 0.012) continue;
          px = cx + p.ux * p.rho * rr * bloom;
          py = cy + p.uy * p.rho * rr * bloom;
        } else {
          const ax = (p.tx - p.x) * p.k;
          const ay = (p.ty - p.y) * p.k;
          p.vx = (p.vx + ax * dt) * 0.9;
          p.vy = (p.vy + ay * dt) * 0.9;
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          const dx = p.x - cx;
          const dy = p.y - cy;
          const dl = Math.sqrt(dx * dx + dy * dy) || 1;
          const wob = Math.sin(t * 0.0009 + p.ph) * 0.6;
          px = cx + dx * bloom + (dx / dl) * wob;
          py = cy + dy * bloom + (dy / dl) * wob;
          aa = 1 - 0.1 * beat;
        }

        const a = p.a * fadeIn * aa;
        const cc = Math.min(255, 206 + Math.round(20 * beat) + Math.round(10 * breath));
        ctx.fillStyle = `rgba(${cc},${Math.min(255, cc + 18)},${Math.min(255, cc + 28)},${a.toFixed(3)})`;
        ctx.fillText(p.ch, px, py);
      }
    };

    build();

    let last = 0;
    const t0 = performance.now();
    const loop = (now) => {
      const t = now - t0;
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      draw(t, dt);
      S.raf = requestAnimationFrame(loop);
    };
    S.raf = requestAnimationFrame(loop);

    const onResize = () => {
      cancelAnimationFrame(S.raf);
      build();
      last = 0;
      S.t0 = performance.now();
      S.raf = requestAnimationFrame(loop);
    };
    window.addEventListener('resize', onResize);

    const tText = setTimeout(() => setShowText(true), 5600);
    const tHint = setTimeout(() => setShowHint(true), 7800);

    return () => {
      cancelAnimationFrame(S.raf);
      window.removeEventListener('resize', onResize);
      clearTimeout(tText);
      clearTimeout(tHint);
    };
  }, []);

  return (
    <section
      ref={rootRef}
      className="screen active"
      id="opening"
      onClick={onEnter}
      style={{ cursor: 'pointer' }}
    >
      <canvas id="opCanvas" ref={canvasRef} />
      <div className="op-stage">
        <div className="op-mark">Bunny &amp; Elliott</div>
      </div>
      <div className={'op-text' + (showText ? ' on' : '')}>
        {COPY.split('').map((ch, i) => (
          <span key={i} className="ch" style={{ transitionDelay: `${i * 62}ms` }}>
            {ch}
          </span>
        ))}
      </div>
      <div className={'op-hint' + (showHint ? ' on' : '')}>轻触任意处，进入</div>
    </section>
  );
}
