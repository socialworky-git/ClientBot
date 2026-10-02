/* Socialworky · Reflection Batting Practice — at-bat scene.
   Framework-free reference implementation of the prototype in this folder.
   Usage:
     const scene = createAtBatScene(document.getElementById('atbatScene'), { bonusMs: 25000 });
     await scene.pitch({ who: 'Jasmine', text: '...' });   // resolves at release (start the bonus timer here)
     scene.hold();                                          // on Swing click, while the umpire call is loading
     await scene.result('evocative_reflection', '+50 pts and +6 speed bonus'); // plays outcome, resolves when done
*/
(function () {
  const CSS = `
.abs{position:relative;width:100%;aspect-ratio:760/360;border-radius:12px;overflow:hidden;background:#1C2B22;font-family:var(--sans,'Hanken Grotesk',Arial,sans-serif)}
.abs svg.abs-field{position:absolute;inset:0;width:100%;height:100%;display:block}
.abs-bubble{position:absolute;left:4.5%;top:7%;width:52%;transition:opacity .4s}
.abs-bubble>div{background:#fff;border:1px solid #D5DDE5;border-left:3px solid #3E4A57;border-radius:10px;padding:11px 14px;font-size:14.5px;line-height:1.45;color:#26313C;transform-origin:6% 100%;box-shadow:0 8px 22px rgba(0,0,0,.18);animation:abs-bubble .45s cubic-bezier(.2,.7,.3,1.1) both}
.abs-who{font-size:10.5px;letter-spacing:1px;text-transform:uppercase;font-weight:700;color:#3E4A57;margin-bottom:3px}
.abs-clock{position:absolute;right:2.4%;top:5%;width:78px;height:78px}
.abs-clock svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)}
.abs-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#fff;font-variant-numeric:tabular-nums}
.abs-call{position:absolute;left:52%;top:46%;display:flex;flex-direction:column;align-items:center;gap:8px;animation:abs-pill .5s cubic-bezier(.2,.7,.3,1.2) both}
.abs-call b{font-weight:800;font-size:30px;letter-spacing:1px;color:#fff;border-radius:28px;padding:6px 22px;white-space:nowrap}
.abs-call span{font-size:13px;font-weight:700;color:#C9D8CE;white-space:nowrap}
.abs-fw{animation:abs-fw 1.5s cubic-bezier(.15,.7,.3,1) both}
.abs-lights{animation:abs-lights 2s linear both}.abs-sky{animation:abs-sky 1.6s linear both}
@keyframes abs-bubble{0%{transform:scale(.25);opacity:0}70%{transform:scale(1.03);opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes abs-pill{0%{transform:translate(-50%,-50%) scale(0);opacity:0}60%{transform:translate(-50%,-50%) scale(1.15);opacity:1}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}
@keyframes abs-fw{0%{transform:translate(0,0);opacity:0}8%{opacity:1}55%{transform:translate(var(--dx),var(--dy));opacity:1}100%{transform:translate(var(--ex),var(--ey));opacity:0}}
@keyframes abs-lights{0%{opacity:.3}10%,30%,50%,80%{opacity:1}20%,40%{opacity:.45}100%{opacity:.3}}
@keyframes abs-sky{0%{opacity:0}10%{opacity:.16}40%,100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.abs-bubble>div,.abs-call,.abs-fw,.abs-lights,.abs-sky{animation-duration:.01s!important}}`;

  const FIELD = `
<svg class="abs-field" viewBox="0 0 760 360" aria-hidden="true">
<rect x="0" y="300" width="760" height="60" fill="#24382C"/>
<ellipse cx="110" cy="300" rx="56" ry="9" fill="rgba(235,120,107,.25)"/>
<g data-k="body"><rect x="98" y="244" width="24" height="54" rx="12" fill="#EB786B"/><circle cx="110" cy="229" r="12" fill="#EB786B"/>
<line data-k="arm" x1="110" y1="254" x2="110" y2="280" stroke="#C2452F" stroke-width="7" stroke-linecap="round"/></g>
<polygon points="592,298 608,298 612,302 600,306 588,302" fill="#fff" opacity=".85"/>
<circle data-k="mitt" cx="684" cy="276" r="12" fill="#7A5048"/>
<g data-k="batter"><rect x="619" y="242" width="22" height="56" rx="11" fill="#fff"/><circle cx="630" cy="228" r="11" fill="#fff"/>
<line data-k="bat" x1="622" y1="258" x2="670" y2="212" stroke="#F6D4CD" stroke-width="6" stroke-linecap="round"/>
<g data-k="stars" opacity="0"><circle cx="646" cy="204" r="2.6" fill="#F6D4CD"/><circle cx="622" cy="218" r="2.6" fill="#F6D4CD"/><circle cx="622" cy="190" r="2.6" fill="#F6D4CD"/></g></g>
<circle data-k="flash" cx="575" cy="270" r="6" fill="#fff" opacity="0"/>
<g data-k="ball" opacity="0"><circle r="6" fill="#fff"/><path d="M-3 -5 Q0 0 -3 5" fill="none" stroke="#C2452F" stroke-width="1.2"/><path d="M3 -5 Q0 0 3 5" fill="none" stroke="#C2452F" stroke-width="1.2"/></g>
<g data-k="fx"></g>
</svg>
<div class="abs-clock" data-k="clock"><svg viewBox="0 0 78 78"><circle cx="39" cy="39" r="32" fill="#1C2B22" stroke="#24382C" stroke-width="7"/>
<circle data-k="ring" cx="39" cy="39" r="32" fill="none" stroke="#9FB8A8" stroke-width="7" stroke-linecap="round" stroke-dasharray="201.06" stroke-dashoffset="0"/></svg>
<div class="abs-num" data-k="num">25</div></div>`;

  // Outcome table. Keys match deriveCategory() in the game.
  const OUT = {
    simple_reflection:    { t: 'SINGLE',    bg: '#6B8E9E', c: [330, 200],  e: [-30, 180], d: 800 },
    complex_reflection:   { t: 'DOUBLE',    bg: '#2E7D54', c: [330, 40],   e: [-30, 100], d: 1100 },
    evocative_reflection: { t: 'HOME RUN',  bg: '#C2452F', c: [470, -200], e: [250, -60], d: 1000, hr: true },
    other:                { t: 'STRIKEOUT', bg: '#9aa0a6', k: true },
  };
  const P0 = [138, 252], PC = [360, 206], PE = [575, 270], MITT = [684, 276], RING = 201.06;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const eo = t => 1 - Math.pow(1 - t, 2);
  const kf = (k, t) => { if (t <= k[0][0]) return k[0][1]; for (let i = 1; i < k.length; i++) if (t <= k[i][0]) { const a = k[i - 1], b = k[i]; return a[1] + (b[1] - a[1]) * ease((t - a[0]) / (b[0] - a[0])); } return k[k.length - 1][1]; };
  const q = (p0, c, p2, s) => { const u = 1 - s; return [u * u * p0[0] + 2 * u * s * c[0] + s * s * p2[0], u * u * p0[1] + 2 * u * s * c[1] + s * s * p2[1]]; };
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function createAtBatScene(root, opts = {}) {
    if (!document.getElementById('abs-css')) { const st = document.createElement('style'); st.id = 'abs-css'; st.textContent = CSS; document.head.appendChild(st); }
    const bonusMs = opts.bonusMs || 25000, clockSecs = Math.round(bonusMs / 1000);
    root.classList.add('abs'); root.innerHTML = FIELD;
    const E = {}; root.querySelectorAll('[data-k]').forEach(n => E[n.dataset.k] = n);
    if (opts.showClock === false) E.clock.style.display = 'none';
    let ph = 'idle', t0 = 0, rel = 0, sw = 0, s0 = .9, b0 = 0, curS = 0, curBob = 0, out = null, done = null, onRel = null, bubble = null, call = null, fxOn = false;

    const setBall = (x, y, rot, sc, op) => { E.ball.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)}) scale(${sc})`); E.ball.setAttribute('opacity', op); };
    const setBat = a => E.bat.setAttribute('transform', `rotate(${a.toFixed(1)} 622 258)`);
    const clock = (rem, now) => { E.ring.setAttribute('stroke-dashoffset', (RING * (1 - rem)).toFixed(2)); E.ring.setAttribute('stroke', rem < .2 ? '#EB786B' : '#9FB8A8');
      E.num.textContent = Math.ceil(rem * clockSecs); E.clock.style.opacity = rem < .2 && rem > 0 ? (Math.sin(now / 120) > 0 ? 1 : .55) : 1; };
    const clear = () => { bubble && bubble.remove(); call && call.remove(); bubble = call = null; E.fx.innerHTML = ''; fxOn = false;
      E.batter.removeAttribute('transform'); E.mitt.removeAttribute('transform'); E.stars.setAttribute('opacity', 0); E.flash.setAttribute('opacity', 0); };
    const showCall = (o, gain) => { call = document.createElement('div'); call.className = 'abs-call';
      call.innerHTML = `<b style="background:${o.bg};${o.hr ? 'box-shadow:0 0 0 7px rgba(235,120,107,.25),0 0 32px rgba(235,120,107,.6)' : ''}">${o.t}</b><span>${esc(gain)}</span>`; root.appendChild(call); };
    const fireworks = () => { const cols = ['#EB786B', '#fff', '#F6D4CD', '#9FB8A8'], NS = 'http://www.w3.org/2000/svg';
      [[300, 86, 14, 54, 0], [470, 66, 14, 44, .35], [390, 120, 12, 36, .7]].forEach(([cx, cy, n, d, delay]) => { for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, r = d * (i % 2 ? .72 : 1), c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', i % 3 ? 3 : 4); c.setAttribute('fill', cols[i % 4]); c.setAttribute('class', 'abs-fw');
        c.style.cssText = `--dx:${(Math.cos(a) * r).toFixed(1)}px;--dy:${(Math.sin(a) * r).toFixed(1)}px;--ex:${(Math.cos(a) * r * 1.15).toFixed(1)}px;--ey:${(Math.sin(a) * r * 1.15 + 18).toFixed(1)}px;animation-delay:${delay}s`;
        E.fx.appendChild(c); } });
      E.fx.insertAdjacentHTML('afterbegin', '<rect class="abs-sky" width="760" height="360" fill="#fff"/>'); };

    function loop(now) {
      raf = requestAnimationFrame(loop);
      const wt = (now - t0) / 1000;
      E.arm.setAttribute('transform', `rotate(${(wt < 1 && ph !== 'idle' ? kf([[0, 0], [.45, 110], [.85, 270], [1, 360]], wt) : 0).toFixed(1)} 110 254)`);
      E.body.setAttribute('transform', `rotate(${(wt < 1 && ph !== 'idle' ? kf([[0, 0], [.45, -8], [.88, 10], [1, 0]], wt) : 0).toFixed(1)} 110 298)`);
      const waggle = 6 * Math.sin(now / 300);
      if (ph === 'idle') { setBat(waggle); return; }
      if (ph === 'windup') { setBall(P0[0], P0[1], 0, 1, 0); clock(1, now); setBat(waggle);
        if (wt >= .85) { ph = 'flight'; rel = now; onRel && onRel(); } return; }
      if (ph === 'flight' || ph === 'hold') {
        if (ph === 'flight') { const p = (now - rel) / bonusMs; curS = .9 * Math.min(p, 1); curBob = p >= 1 ? 3 * Math.sin(now / 220) : 0; clock(Math.max(0, 1 - p), now); }
        const [x, y] = q(P0, PC, PE, curS); setBall(x, y + curBob, (now - rel) * .25, 1, Math.min(1, (now - rel) / 80)); setBat(ph === 'hold' ? 0 : waggle); return; }
      const st = now - sw, o = out;
      if (!o.k) {
        setBat(st < 300 ? -200 * ease(st / 300) : st < 1100 ? -200 : st < 1500 ? -200 * (1 - ease((st - 1100) / 400)) : 0);
        if (st < 180) { const [x, y] = q(P0, PC, PE, s0 + (1 - s0) * st / 180); setBall(x, y + b0 * (1 - st / 180), st * .6, 1, 1); }
        else { const ht = (st - 180) / o.d; if (ht <= 1) { const [x, y] = q(PE, o.c, o.e, eo(ht)); setBall(x, y, st * .8, (1 - .5 * ht).toFixed(2), ht > .85 ? ((1 - ht) / .15).toFixed(2) : 1); } else E.ball.setAttribute('opacity', 0); }
        const ft = (st - 180) / 280; if (ft >= 0 && ft <= 1) { E.flash.setAttribute('r', 6 + 30 * ft); E.flash.setAttribute('opacity', (.9 * (1 - ft)).toFixed(2)); } else E.flash.setAttribute('opacity', 0);
        if (!call && st >= 320) showCall(o, out.gain);
        if (o.hr && !fxOn && st >= 650) { fxOn = true; fireworks(); }
        if (ph === 'swing' && st >= (o.hr ? 2600 : 1700)) { ph = 'done'; done && done(); }
      } else {
        if (st < 160) { const [hx, hy] = q(P0, PC, PE, s0), t = st / 160; setBall(hx + (MITT[0] - hx) * t, hy + b0 + (MITT[1] - hy - b0) * t, st, 1, 1); } else setBall(MITT[0], MITT[1], 0, 1, 1);
        const mt = (st - 160) / 180; E.mitt.setAttribute('transform', mt > 0 && mt < 1 ? `translate(684 276) scale(${(1 + .3 * Math.sin(Math.PI * mt)).toFixed(3)}) translate(-684 -276)` : '');
        const bt = st - 240; setBat(bt < 0 ? 0 : bt < 300 ? -200 * ease(bt / 300) : bt < 900 ? -200 : bt < 1300 ? -200 * (1 - ease((bt - 900) / 400)) : 0);
        const w = (st - 520) / 680; E.batter.setAttribute('transform', w > 0 && w < 1 ? `rotate(${(9 * Math.sin(w * Math.PI * 3) * (1 - w)).toFixed(2)} 630 298)` : '');
        E.stars.setAttribute('opacity', st > 560 && st < 1900 ? Math.min(1, (st - 560) / 120, (1900 - st) / 200).toFixed(2) : 0);
        E.stars.setAttribute('transform', `rotate(${((st - 560) * .6).toFixed(0)} 630 204)`);
        if (!call && st >= 560) showCall(o, out.gain);
        if (ph === 'swing' && st >= 1900) { ph = 'done'; done && done(); }
      }
    }
    let raf = requestAnimationFrame(loop);

    return {
      /** Wind up and throw. Resolves at release, when the statement appears and the bonus clock starts. */
      pitch({ who, text }) {
        clear(); ph = 'windup'; t0 = performance.now();
        return new Promise(res => { onRel = () => {
          bubble = document.createElement('div'); bubble.className = 'abs-bubble';
          bubble.innerHTML = `<div><div class="abs-who">${esc(who)}</div>${esc(text)}</div>`; root.appendChild(bubble); onRel = null; res(); }; });
      },
      /** Freeze the ball and clock while the umpire call is loading. */
      hold() { if (ph === 'flight') ph = 'hold'; },
      /** Resume flight if the scoring request fails and the user can swing again. */
      resume() { if (ph === 'hold') ph = 'flight'; },
      /** Play the outcome. category = deriveCategory() result; gain = the points line. Resolves when finished. */
      result(category, gain) {
        out = Object.assign({ gain }, OUT[category] || OUT.other); s0 = curS || .9; b0 = curBob || 0;
        if (bubble) bubble.style.opacity = .35; ph = 'swing'; sw = performance.now();
        return new Promise(res => { done = () => { done = null; res(); }; });
      },
      /** Elapsed bonus time in ms (from release). */
      elapsed() { return rel ? performance.now() - rel : 0; },
      reset() { clear(); ph = 'idle'; E.ball.setAttribute('opacity', 0); clock(1, 0); },
      destroy() { cancelAnimationFrame(raf); root.innerHTML = ''; },
    };
  }
  window.createAtBatScene = createAtBatScene;
})();
