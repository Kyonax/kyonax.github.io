// THE VALIDATED BLOG-LANDING DESIGN (2026-09-11) — generates the two artboards of the
// Claude Design canvas https://claude.ai/code/artifact/3b4c2df0-4c85-4d4b-b5a5-0b90ba1c64ca
// (Version 5). Run with `node docs/plans/blog-landing-design/blog-landing.design.mjs` from
// the repo; it writes Main.dc.html (1440) and Phone.dc.html (390) next to itself. Every
// value in here is the spec: tokens, type tiers, the galaxy density function, the frame
// strip mechanics, the three drawings, the marquee contents, the phone order.
// Round four: the Galaxy hero, chosen. The status chip now states what was parsed, nothing
// blinks, the marquee carries the project's own numbers, three new scene drawings tell one
// story (parse → integrate → deploy), a "made with org2html" line links GitHub under them,
// and on a phone the order is animation → title → marquee → drawings.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const face = (family, weight, file) => `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;font-display:swap;src:url(data:font/woff2;base64,${readFileSync(resolve(REPO, 'src/fonts', file)).toString('base64')}) format('woff2');}`;

const fonts = [face('Geomanist', 700, 'Geomanist/Original/GeomanistBold.woff2'), face('Geomanist', 400, 'Geomanist/Original/GeomanistRegural.woff2'), face('SpaceMono', 400, 'SpaceMono/Original/SpaceMonoNerdFont-Regular.woff2'), face('SpaceMono', 700, 'SpaceMono/Original/SpaceMonoNerdFont-Bold.woff2')].join('\n');
const logo = readFileSync(resolve(REPO, 'src/assets/app/LOGO_KYONAX.svg'), 'utf8')
  .replace(/<\?xml[^>]*>\s*/, '').replace(/<!--[\s\S]*?-->\s*/, '').replace(/ id="Capa_1"/, '').replace(/ style="[^"]*"/, '').replace(/ xml:space="preserve"/, '');
const rng = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// Measured 2026-09-11 from kyo-blog/content/engineering and the site's index.json.
const STATS = { files: 12, kb: 67, lines: '1,684', words: '9,100', minutes: 51, headings: 100, en: 6, es: 6, build: '2026-09-10', engine: '1.2.0', gates: '175/175' };

// ---------- ascii galaxy frames -------------------------------------------
const blank = (w, h) => Array.from({ length: h }, () => Array.from({ length: w }, () => [' ', 0]));
const paint = (g, x, y, ch, tone) => { const r = Math.round(y), c = Math.round(x); if (r >= 0 && r < g.length && c >= 0 && c < g[0].length) { const cell = g[r][c]; if (tone >= cell[1] || cell[0] === ' ') { cell[0] = ch; cell[1] = tone; } } };
const render = (g) => g.map((row) => { let out = '', cur = -1, run = ''; const flush = () => { if (!run) return; out += cur === 0 ? run : `<${cur === 1 ? 'i' : 'b'}>${run}</${cur === 1 ? 'i' : 'b'}>`; run = ''; }; for (const [ch, tone] of row) { const t = ch === ' ' ? 0 : tone; if (t !== cur) { flush(); cur = t; } run += ch; } flush(); return out; }).join('\n');
const strip = (frames) => frames.map(render).join('\n');
const galaxyFrames = (w, h, n, seed = 5) => {
  const ramp = ' .·:-=+*#%@'; const cx = w / 2, cy = h / 2; const frames = [];
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const noise = blank(w, h).map((row) => row.map(() => rng(seed++)() - 0.5));
  for (let f = 0; f < n; f++) {
    const phase = Math.PI * f / n; const g = blank(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - cx) / 2.05, dy = y - cy; const rad = Math.hypot(dx, dy) + 0.001; const th = Math.atan2(dy, dx) - phase;
      const core = Math.exp(-(rad * rad) / 4.5) * 1.1;
      let arms = 0; for (const off of [0, Math.PI]) { const d = wrap(th - (2.31 * Math.log(rad + 0.5) + off)); arms += Math.exp(-(d * d) / 0.16) * Math.exp(-rad / 17) * 1.35; }
      let v = core + arms + Math.exp(-rad / 9) * 0.1 + noise[y][x] * 0.09; if (rad > 21) v -= (rad - 21) * 0.1;
      const i = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * (ramp.length - 1))));
      if (i > 0) paint(g, x, y, ramp[i], i >= 8 ? 2 : i >= 5 ? 1 : 0);
    }
    frames.push(g);
  }
  return frames;
};

// ---------- the three drawings: parse → integrate → deploy ------------------
const FG = 'oklch(78% .014 286.375)', DIM = 'oklch(70% .016 285.938/.5)', HI = 'oklch(98.5% 0 0)', BG = 'oklch(14.5% 0 0)', CARD = 'oklch(24% 0 0)';
const marching = `<animate attributeName="stroke-dashoffset" values="0;-16" dur="1.6s" repeatCount="indefinite"/>`;
const gearPath = (cx, cy, ro, ri, teeth) => { const pts = []; const step = Math.PI * 2 / teeth; for (let i = 0; i < teeth; i++) { const a = i * step; [[ro, a], [ro, a + step * .3], [ri, a + step * .5], [ri, a + step * .8]].forEach(([r, t]) => pts.push(`${(cx + r * Math.cos(t)).toFixed(1)} ${(cy + r * Math.sin(t)).toFixed(1)}`)); } return `M${pts.join('L')}Z`; };

// 1 · PARSE — an .org file feeds the engine; the engine turns; components come out.
const comps = [
  { y: 42, h: 12, body: `<rect x="232" y="45" width="56" height="6" fill="${HI}"/>` },
  { y: 60, h: 24, body: `<path d="M232 66h64M232 73h56M232 80h60" stroke="${FG}"/>` },
  { y: 90, h: 32, w: 38, body: `<rect x="229" y="91" width="36" height="30" fill="${CARD}"/><path d="M234 98h20M234 105h26M234 112h16" stroke="${FG}"/>` },
  { y: 90, h: 32, x: 268, w: 38, body: `<rect x="272" y="106" width="7" height="12" fill="${HI}"/><rect x="283" y="99" width="7" height="19" fill="${FG}"/><rect x="294" y="110" width="7" height="8" fill="${FG}"/>` },
  { y: 128, h: 14, body: `<path d="M232 136l10-6 8 5 12-8 10 6" stroke="${HI}"/><rect x="286" y="131" width="6" height="6" fill="${FG}"/>` },
];
const compAnim = (i, n) => { const s = (0.14 + i * 0.13).toFixed(2), e = (0.14 + i * 0.13 + 0.05).toFixed(2); return `<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;${s};${e};.93;1" dur="7s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="-5 0;-5 0;0 0;0 0;-5 0" keyTimes="0;${s};${e};.93;1" dur="7s" repeatCount="indefinite"/>`; };
const cellParse = `<svg viewBox="0 0 324 180" fill="none" stroke-width="1" aria-hidden="true">
  <rect x="18" y="36" width="86" height="108" stroke="${FG}" fill="${BG}"/><rect x="28" y="48" width="46" height="5" fill="${HI}"/>
  <text x="28" y="72" fill="${FG}" font-family="monospace" font-size="9">*</text><path d="M36 69h58" stroke="${DIM}"/><text x="28" y="86" fill="${FG}" font-family="monospace" font-size="9">*</text><path d="M36 83h50M28 97h64M28 109h40" stroke="${DIM}"/><path d="M28 123h30" stroke="${FG}" stroke-dasharray="2 2"/>
  <path d="M110 90h24" stroke="${DIM}" stroke-dasharray="4 4">${marching}</path>
  <rect x="140" y="64" width="52" height="52" stroke="${HI}" fill="${BG}"/>
  <g><path d="${gearPath(166, 90, 18, 13.5, 8)}" stroke="${HI}" fill="${BG}"/><animateTransform attributeName="transform" type="rotate" from="0 166 90" to="360 166 90" dur="9s" repeatCount="indefinite"/></g>
  <g><path d="${gearPath(166, 90, 8.5, 6, 6)}" stroke="${FG}" fill="${BG}"/><circle cx="166" cy="90" r="2.5" fill="${HI}"/><animateTransform attributeName="transform" type="rotate" from="360 166 90" to="0 166 90" dur="6.75s" repeatCount="indefinite"/></g>
  <path d="M198 90h20" stroke="${DIM}" stroke-dasharray="4 4">${marching}</path><path d="M218 46v96" stroke="${DIM}" stroke-dasharray="4 4"><animate attributeName="stroke-dashoffset" values="0;-16" dur="1.6s" repeatCount="indefinite"/></path>
  ${comps.map((c, i) => `<g>${compAnim(i, comps.length)}<rect x="${c.x || 228}" y="${c.y}" width="${c.w || 78}" height="${c.h}" stroke="${FG}" fill="${BG}"/>${c.body}</g>`).join('')}
</svg>`;

// 2 · INTEGRATE — components are dragged into their slots on the page.
const card = (w, h, bars) => `<rect width="${w}" height="${h}" fill="${CARD}" stroke="${HI}"/>${bars}`;
const cursor = (x, y) => `<path d="M${x} ${y}l0 13 3.5-3 2.5 5.5 2.5-1-2.5-5.5 4.5-.5z" fill="${HI}" stroke="${BG}" stroke-width=".8"/>`;
const drag = (from, to, t0, t1, w, h, bars) => `<g opacity="0"><animate attributeName="opacity" values="0;0;1;1;1;0" keyTimes="0;${(t0 - .02).toFixed(2)};${t0};${t1};.95;1" dur="8s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="${from};${from};${to};${to};${from}" keyTimes="0;${t0};${t1};.96;1" calcMode="spline" keySplines="0 0 1 1;.4 0 .2 1;0 0 1 1;0 0 1 1" dur="8s" repeatCount="indefinite"/>${card(w, h, bars)}<g><animate attributeName="opacity" values="1;1;1;0;0" keyTimes="0;${t1};${(t1 + .03).toFixed(2)};${(t1 + .06).toFixed(2)};1" dur="8s" repeatCount="indefinite"/>${cursor(w - 10, h - 8)}</g></g>`;
const slot = (x, y, w, h, t1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="${DIM}" stroke-dasharray="3 3"><animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;${t1};${(t1 + .03).toFixed(2)};.96;1" dur="8s" repeatCount="indefinite"/></rect>`;
const cellIntegrate = `<svg viewBox="0 0 324 180" fill="none" stroke-width="1" aria-hidden="true">
  <rect x="40" y="22" width="244" height="140" stroke="${FG}" fill="${BG}"/><path d="M40 36h244" stroke="${FG}"/><rect x="46" y="27" width="4" height="4" fill="${DIM}"/><rect x="53" y="27" width="4" height="4" fill="${DIM}"/><rect x="60" y="27" width="4" height="4" fill="${DIM}"/>
  <rect x="52" y="46" width="100" height="8" fill="${HI}"/>
  ${slot(52, 62, 110, 40, .24)}${slot(172, 62, 100, 40, .52)}${slot(52, 110, 220, 40, .80)}
  ${drag('200 118', '52 62', .06, .24, 110, 40, `<rect x="8" y="8" width="60" height="5" fill="${HI}"/><rect x="8" y="18" width="90" height="4" fill="${FG}"/><rect x="8" y="27" width="70" height="4" fill="${DIM}"/>`)}
  ${drag('200 118', '172 62', .34, .52, 100, 40, `<rect x="8" y="10" width="7" height="20" fill="${HI}"/><rect x="19" y="16" width="7" height="14" fill="${FG}"/><rect x="30" y="22" width="7" height="8" fill="${FG}"/><rect x="41" y="12" width="7" height="18" fill="${FG}"/>`)}
  ${drag('30 130', '52 110', .62, .80, 220, 40, `<rect x="8" y="8" width="204" height="24" fill="${BG}" stroke="${DIM}"/><path d="M16 16h60M16 24h96" stroke="${FG}"/><rect x="190" y="14" width="14" height="12" fill="${HI}"/>`)}
</svg>`;

// 3 · DEPLOY — the assembled page ships to the host, packet by packet, until the check.
const cellDeploy = `<svg viewBox="0 0 324 180" fill="none" stroke-width="1" aria-hidden="true">
  <rect x="22" y="40" width="110" height="100" stroke="${FG}" fill="${BG}"/><path d="M22 52h110" stroke="${FG}"/><rect x="27" y="44" width="4" height="4" fill="${DIM}"/><rect x="34" y="44" width="4" height="4" fill="${DIM}"/>
  <rect x="30" y="60" width="50" height="6" fill="${HI}"/><rect x="30" y="72" width="44" height="20" stroke="${DIM}"/><rect x="80" y="72" width="44" height="20" stroke="${DIM}"/><rect x="30" y="98" width="94" height="18" stroke="${DIM}"/><path d="M36 106h60" stroke="${FG}"/><rect x="30" y="122" width="94" height="10" stroke="${DIM}"/>
  <path id="up4" d="M140 90h64" stroke="${DIM}" stroke-dasharray="4 4">${marching}</path>
  ${[0, .8, 1.6].map((b) => `<rect width="6" height="6" x="-3" y="-3" fill="${HI}"><animateMotion dur="2.4s" begin="${b}s" repeatCount="indefinite"><mpath href="#up4"/></animateMotion></rect>`).join('')}
  <rect x="210" y="44" width="92" height="92" stroke="${HI}" fill="${BG}"/>
  ${[54, 80, 106].map((y, i) => { const s = (0.2 + i * 0.22).toFixed(2); return `<rect x="220" y="${y}" width="72" height="20" stroke="${DIM}"/><path d="M226 ${y + 10}h30" stroke="${DIM}"/><rect x="280" y="${y + 7}" width="6" height="6" fill="${HI}"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;${s};${(+s + .04).toFixed(2)};.94;1" dur="7s" repeatCount="indefinite"/></rect><rect x="280" y="${y + 7}" width="6" height="6" stroke="${DIM}"/>`; }).join('')}
  <rect x="22" y="156" width="246" height="2" fill="${CARD}"/><rect x="22" y="156" width="246" height="2" fill="${HI}"><animate attributeName="width" values="0;246;246;0" keyTimes="0;.74;.94;1" dur="7s" repeatCount="indefinite"/></rect>
  <path d="M282 157l4 4 8-9" stroke="${HI}" stroke-width="1.5" stroke-dasharray="30" stroke-dashoffset="30"><animate attributeName="stroke-dashoffset" values="30;30;0;0;30" keyTimes="0;.76;.84;.94;1" dur="7s" repeatCount="indefinite"/></path>
</svg>`;

// ---------- CSS -----------------------------------------------------------
const css = `
${fonts}
:root{--bg:oklch(14.5% 0 0);--ink:oklch(76% 0 0);--h:oklch(98.5% 0 0);--n200:oklch(78% .014 286.375);--n300:oklch(70% .016 285.938);--n400:oklch(37% .013 285.805);--pri:oklch(85.9% .1686 91.3);--rule:oklch(100% 0 0/.2);--mono:"SpaceMono",monospace;--disp:"Geomanist",sans-serif;
  --fs-100:11.4px;--fs-200:12.6px;--fs-300:13.8px;--fs-400:15px;--fs-500:19.5px;--fs-600:24px;--fs-700:28.5px;--fs-800:37.5px;--pad:16px;--lh:6.6px;--fz:6.1px}
@media (min-width:1200px){:root{--fs-100:10.5px;--fs-200:13.5px;--fs-300:15px;--fs-400:18px;--fs-500:24px;--fs-600:36px;--fs-700:54px;--fs-800:72px;--pad:36px;--lh:12.5px;--fz:11.5px}}
*{box-sizing:border-box} html{font-size:12px}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--mono);-webkit-font-smoothing:antialiased}
a{color:var(--h);text-decoration:none} a:hover{color:var(--pri)}
.page{background:var(--bg);position:relative;overflow:hidden;min-height:100%}
.wrap{max-width:1280px;margin:0 auto;padding-inline:var(--pad)}
.nav{height:53px;display:flex;align-items:center;justify-content:space-between}
.nav__brand{font-family:var(--disp);font-size:20px;color:var(--h);display:flex;align-items:center;gap:36px}
.nav__links{display:flex;gap:18px;font-size:var(--fs-300);letter-spacing:.08em;text-transform:uppercase}
.nav__links a{padding:6px 0;border-bottom:1px solid transparent;color:var(--ink)} .nav__links a.is-active{color:var(--h);border-bottom-color:var(--h)}
.nav__actions{display:flex;align-items:center;gap:12px;font-size:var(--fs-200)}
.nav__lang{border:1px solid var(--rule);padding:4px 8px;color:var(--pri);font-weight:700;letter-spacing:.08em;line-height:1;background:color-mix(in srgb,var(--pri) 8%,transparent)}
.nav__sep{width:1px;height:14px;background:var(--rule)} .nav__ico{width:14px;height:14px;fill:var(--h)}
/* hero */
.hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);border-top:1px solid var(--rule)}
.hero__text{padding:64px var(--pad) 64px 0;display:flex;flex-direction:column;justify-content:center}
.hero__vis{position:relative;border-left:1px solid var(--rule);display:flex;align-items:center;justify-content:center;padding:44px 12px 28px;overflow:hidden;min-height:540px}
.h1{font-family:var(--disp);font-weight:700;font-size:var(--fs-800);line-height:1;letter-spacing:-.01em;color:var(--h);margin:0 0 16px;text-wrap:balance}
.sub{font-family:var(--disp);font-size:var(--fs-400);line-height:1.6;letter-spacing:.012em;color:var(--ink);margin:0;max-width:50ch}
.roll{height:calc(var(--h) * var(--lh));overflow:hidden;position:relative}
.roll pre{margin:0;font-family:var(--mono);font-size:var(--fz);line-height:var(--lh);white-space:pre;color:oklch(54% 0 0);animation:roll var(--dur) steps(var(--n)) infinite;letter-spacing:0}
.roll i{font-style:normal;color:oklch(78% 0 0)} .roll b{font-weight:400;color:var(--h)}
@keyframes roll{to{transform:translateY(calc(-1 * var(--n) * var(--h) * var(--lh)))}}
.roll::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 55%,var(--bg) 100%);pointer-events:none}
.chip{position:absolute;top:0;left:0;padding:8px 12px;border-right:1px solid var(--rule);border-bottom:1px solid var(--rule);font-size:var(--fs-100);letter-spacing:.14em;text-transform:uppercase;color:var(--h);display:flex;gap:8px;align-items:center}
.chip::before{content:"";width:7px;height:7px;background:var(--h)} .chip span{color:var(--n300)}
/* marquee */
.ticker{border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);overflow:hidden;white-space:nowrap;font-size:var(--fs-100);letter-spacing:.16em;text-transform:uppercase;color:var(--n300);padding:11px 0}
.ticker span{display:inline-block;animation:marquee 46s linear infinite} .ticker b{color:var(--h);font-weight:400}
@keyframes marquee{to{transform:translateX(-50%)}}
/* the drawings */
.band{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
.band > div{border-left:1px solid var(--rule);padding:26px 22px;background-image:radial-gradient(oklch(100% 0 0/.11) .8px,transparent .9px);background-size:12px 12px;display:flex;align-items:center;justify-content:center}
.band > div:first-child{border-left:0}
.band svg{width:100%;max-width:300px;height:auto;display:block}
.band-foot{display:flex;justify-content:space-between;gap:16px;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);padding:10px 0;font-size:var(--fs-100);letter-spacing:.16em;text-transform:uppercase;color:var(--n300)}
.band-foot a{color:var(--h);text-decoration:underline;text-underline-offset:3px}
/* archive (validated, unchanged) */
.lead{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:36px;margin-top:56px}
.lead__date{font-size:var(--fs-200);color:var(--ink);letter-spacing:.06em}
.lead__title{font-family:var(--disp);font-weight:700;font-size:var(--fs-700);line-height:1;color:var(--h);margin:8px 0 14px;letter-spacing:-.01em}
.lead__ex{font-size:var(--fs-200);line-height:1.6;color:var(--ink);max-width:52ch;margin:0}
.lead__cta{display:inline-flex;gap:8px;align-items:center;margin-top:16px;padding:9px 17px;border:1px solid var(--pri);color:var(--pri);font-size:var(--fs-200);letter-spacing:.1em;text-transform:uppercase}
.cover{aspect-ratio:16/10;border:1px solid var(--rule);background:linear-gradient(135deg,oklch(20% 0 0),oklch(12% 0 0));position:relative}
.cover::after{content:"COVER // build-test-deploy.png";position:absolute;right:10px;bottom:8px;font-size:var(--fs-100);letter-spacing:.14em;color:var(--n300)}
.recent{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:48px;list-style:none;padding:0}
.card{border:1px solid var(--rule);border-top:2px solid var(--pri);padding:18px;display:flex;flex-direction:column;gap:10px;min-height:180px;position:relative}
.card__n{position:absolute;right:16px;top:8px;font-family:var(--disp);font-weight:700;font-size:56px;color:oklch(100% 0 0/.06);line-height:1}
.card__t{font-family:var(--disp);font-weight:700;font-size:var(--fs-400);color:var(--h);margin-top:auto}
.card__m{font-size:var(--fs-100);letter-spacing:.14em;text-transform:uppercase;color:var(--n300)}
.all{margin-top:56px} .sh{border-bottom:1px solid var(--rule);padding-bottom:14px;margin-bottom:24px}
.sh h2{font-family:var(--disp);font-size:var(--fs-500);color:var(--h);margin:0;line-height:1;letter-spacing:-.01em}
.search{border:1px solid var(--rule);padding:10px 12px;font-size:var(--fs-200);color:var(--n300);display:flex;gap:10px;margin-bottom:18px} .search b{color:var(--pri);font-weight:400}
.rows{list-style:none;margin:0;padding:0}
.row{border-top:1px solid var(--rule);display:flex;gap:24px;justify-content:space-between;padding:16px 0} .row:last-child{border-bottom:1px solid var(--rule)}
.row__t{font-family:var(--disp);font-weight:700;font-size:var(--fs-400);color:var(--h)} .row__e{font-size:var(--fs-300);color:var(--n300);margin-top:4px;font-family:var(--disp);line-height:1.5}
.row__d{font-size:var(--fs-200);color:var(--ink);white-space:nowrap;letter-spacing:.06em}
.foot{margin-top:64px;border:1px solid var(--rule);margin-bottom:48px}
.foot__note{padding:16px 20px;border-bottom:1px solid var(--rule);font-size:var(--fs-200);color:var(--ink);line-height:1.6} .foot__note a{color:var(--h);text-decoration:underline;text-underline-offset:3px}
.foot__grid{display:grid;grid-template-columns:1.2fr 1fr 1fr} .foot__grid > div{padding:22px 20px;border-left:1px solid var(--rule)} .foot__grid > div:first-child{border-left:0}
.foot__logo{width:132px;color:var(--h)} .foot__logo svg{width:100%;height:auto;display:block}
.foot h4{margin:0 0 12px;font-size:var(--fs-100);letter-spacing:.16em;text-transform:uppercase;color:var(--n300);font-weight:400}
.foot ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:var(--fs-200);letter-spacing:.06em}
@media (max-width:720px){
  .nav__brand{gap:14px} .hero{grid-template-columns:1fr} .hero__vis{order:-1;border-left:0;min-height:0;padding:44px 0 16px} .hero__text{padding:20px 0 32px}
  .band{grid-template-columns:1fr} .band > div{border-left:0;border-top:1px solid var(--rule);padding:22px 30px} .band > div:first-child{border-top:0}
  .band-foot{flex-direction:column;gap:6px}
  .lead{grid-template-columns:1fr;gap:18px;margin-top:36px} .cover{order:-1} .recent{grid-template-columns:1fr;gap:14px;margin-top:32px}
  .row{flex-direction:column;gap:6px} .foot__grid{grid-template-columns:1fr} .foot__grid > div{border-left:0;border-top:1px solid var(--rule)} .foot__grid > div:first-child{border-top:0}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`;

// ---------- fragments -----------------------------------------------------
const nav = `<header class="nav wrap">
  <div class="nav__brand"><span>京</span><nav class="nav__links"><a href="#">Home</a><a href="#" class="is-active">Blog</a></nav></div>
  <div class="nav__actions"><span class="nav__lang">EN ▾</span><span class="nav__sep"></span>
    <svg class="nav__ico" viewBox="0 0 16 16"><path d="M8 0a8 8 0 0 0-2.5 15.6c.4 0 .5-.2.5-.4v-1.5c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.3 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.6 7.6 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3.1-1.9 3.8-3.6 4 .3.3.6.8.6 1.5v2.2c0 .2.1.5.6.4A8 8 0 0 0 8 0z"/></svg>
    <svg class="nav__ico" viewBox="0 0 16 16"><path d="M3.6 6h2.3v7.5H3.6zM4.7 2.3a1.3 1.3 0 1 1 0 2.7 1.3 1.3 0 0 1 0-2.7zM7.3 6h2.2v1c.3-.6 1.1-1.2 2.2-1.2 2.4 0 2.8 1.6 2.8 3.6v4.1h-2.3V9.9c0-.9 0-2-1.2-2s-1.4.9-1.4 1.9v3.7H7.3z"/></svg>
  </div></header>`;
const copy = `<h1 class="h1">My Corner of the Web</h1><p class="sub">Hi! My corner of the web: a notebook of notes, ideas and things I learn about GNU/Linux, networking, self-hosting and Org-mode. I use Emacs btw.</p>`;
const N = 36; const gal = galaxyFrames(96, 42, N);
const hero = `<section class="wrap"><div class="hero">
  <div class="hero__text">${copy}</div>
  <div class="hero__vis"><span class="chip">${STATS.files} .org files parsed <span>· ${STATS.kb} KB → HTML</span></span><div class="roll" style="--h:42;--n:${N};--dur:7.2s" aria-hidden="true"><pre>${strip(gal)}</pre></div></div>
</div></section>`;
const tick = `// LAST BUILD <b>${STATS.build}</b> ////// <b>${STATS.files}</b> ARTICLES · ${STATS.en} EN · ${STATS.es} ES ////// <b>${STATS.kb} KB</b> OF .ORG · ${STATS.lines} LINES · ${STATS.headings} HEADINGS ////// <b>${STATS.words}</b> WORDS · ${STATS.minutes} MIN OF READING ////// ENGINE <b>ORG2HTML ${STATS.engine}</b> ////// GATES <b>${STATS.gates}</b> GREEN ////// `;
const ticker = `<section class="wrap"><div class="ticker"><span>${tick}${tick}</span></div></section>`;
const band = `<section class="wrap"><div class="band"><div>${cellParse}</div><div>${cellIntegrate}</div><div>${cellDeploy}</div></div><div class="band-foot"><span>Made with org2html</span><a href="https://github.com/Kyonax/org2html">github.com/Kyonax/org2html ↗</a></div></section>`;

const POSTS = [['08·14', 'Shipping a Static Site That Stays Fast', 4], ['07·17', 'Mathematics at Build Time', 3], ['06·26', 'Embeds That Respect the Reader', 4], ['06·05', 'A Style Book, Not a Framework', 4], ['05·15', 'From Org to AST', 4], ['05·01', 'Why Org Mode Beats Markdown', 6]];
const EX = ['A site is fast on the day you launch it. Keeping it fast is a process problem.', 'Client-side typesetters ship hundreds of kilobytes to render equations the server already knew.', 'A standard YouTube embed costs the reader half a megabyte and a tracking cookie before they decide to watch.', 'The engine ships a stylesheet, not a framework. Here is what that distinction buys.', 'A tour of the two passes that turn an Org document into a tree the renderer can walk.', 'Markdown stops at the paragraph. Org Mode carries structure, metadata, tasks and computation in the same file.'];
const archive = `<section class="wrap">
  <div class="lead"><div><div class="lead__date">Aug 14, 2026</div><h2 class="lead__title">Shipping a Static Site That Stays Fast</h2><p class="lead__ex">A site is fast on the day you launch it. Keeping it fast is a process problem, and the only tool that works is a gate that can actually fail.</p><span class="lead__cta">Read more ›</span></div><div class="cover"></div></div>
  <ul class="recent">${POSTS.slice(1, 4).map((p, i) => `<li class="card"><span class="card__n">${5 - i}</span><span class="card__m">${p[0].replace('·', ' · ')} · ${p[2]} min</span><span class="card__t">${p[1]}</span></li>`).join('')}</ul>
  <div class="all"><div class="sh"><h2>All posts</h2></div><div class="search"><b>/</b> Search posts</div>
  <ul class="rows">${POSTS.map((p, i) => `<li class="row"><div><div class="row__t">${p[1]}</div><div class="row__e">${EX[i]}</div></div><div class="row__d">2026 · ${p[0]}</div></li>`).join('')}</ul></div>
  <footer class="foot"><div class="foot__note">This blog was built by <a href="https://x.com/kyonax_on_tech">@kyonax_on_tech</a> and created with <a href="https://www.gnu.org/software/emacs/">Emacs</a>, <a href="https://orgmode.org/">Org mode</a> and <a href="https://github.com/Kyonax/org2html">org2html</a>.</div>
    <div class="foot__grid"><div><div class="foot__logo">${logo}</div></div><div><h4>Pages</h4><ul><li>Home</li><li>Blog</li><li>Resume</li><li>Privacy policy</li></ul></div><div><h4>Profiles</h4><ul><li>GitHub</li><li>LinkedIn</li><li>X</li><li>YouTube</li></ul></div></div></footer>
</section>`;

const doc = (phone) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet><style>${css}</style></helmet>
<div class="page" style="width:${phone ? '390px' : '1440px'}">
  ${nav}
  <main>${hero}${ticker}${band}${archive}</main>
</div>
</x-dc>
</body>
</html>
`;

const out = new URL('./', import.meta.url);
writeFileSync(new URL('Main.dc.html', out), doc(false));
writeFileSync(new URL('Phone.dc.html', out), doc(true));
const canvas = {
  artboards: [
    { file: 'Main.dc.html', title: 'Blog landing — desktop 1440', x: 0, y: 0, w: 1440, h: 2620 },
    { file: 'Phone.dc.html', title: 'Blog landing — phone 390', x: 1560, y: 0, w: 390, h: 4100 },
  ],
  annotations: [{ id: 'brief-4', x: 0, y: -220, w: 620, text: 'Round four — the Galaxy hero, chosen and refined.\nThe chip now states what was parsed (12 .org files · 67 KB → HTML); nothing blinks. The marquee carries the project\'s own numbers: last build, articles per language, KB / lines / headings of Org, words and reading time, the engine version, the gates.\nThe three drawings tell one story with no words: 1 the .org file feeds the engine (gears turn) and components come out · 2 the components are dragged into their slots on the page · 3 the assembled page ships to the host packet by packet until the check.\nUnder them: made with org2html, linking GitHub. Phone order: animation, title, marquee, drawings. Everything below is the validated archive.' }],
  launch: { view: 'canvas' },
};
writeFileSync(new URL('canvas.json', out), JSON.stringify(canvas, null, 2));
console.log('wrote Main.dc.html, Phone.dc.html + canvas.json');
