// Google Play store screenshots (M9.3). Drives the game in a headless
// browser against the Vite DEV server (needs the dev-only window.__game
// hook in src/main.ts) and writes 1920x1080 PNGs to docs/store/<lang>/.
//
//   npx vite --port 5173 &
//   node tools/store/capture.cjs tr     # or: en
//
// Then `python3 tools/store/feature_graphic.py` builds the 1024x500 banner.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LANG = process.argv[2] === 'en' ? 'en' : 'tr';
const BASE = process.env.PF_URL || 'http://localhost:5173/platform-football/';
const OUT = path.join(__dirname, '..', '..', 'docs', 'store', LANG);
const W = 960, H = 540; // logical game size; deviceScaleFactor 2 -> 1920x1080

const wait = (p, ms) => p.waitForTimeout(ms);
const shot = (p, name) => p.screenshot({ path: path.join(OUT, name) }).then(() => console.log('wrote', LANG + '/' + name));

async function start(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, locale: LANG === 'en' ? 'en-US' : 'tr-TR' });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
  p.on('pageerror', (e) => console.log('page error:', e.message));
  // Touch device (hides the PC key footer, like a phone); skip the tutorial.
  await p.addInitScript(() => {
    localStorage.setItem('pf.tutorial.seen', '1');
    localStorage.setItem('pf.tutorial.done', '1');
  });
  await p.goto(BASE);
  await p.waitForFunction(() => window.__game && window.__game.scene.isActive('Menu'), null, { timeout: 30000 });
  await wait(p, 800);
  return p;
}

/** Walk the human toward the loose ball until they control it. */
async function takeBall(p) {
  for (let i = 0; i < 120; i++) {
    const s = await p.evaluate(() => {
      const m = window.__game.scene.getScene('Match');
      return { px: m.player.x, pz: m.player.z, bx: m.ball.x, bz: m.ball.z, c: m.ball.controller };
    });
    if (s.c === 'left') { for (const k of ['w', 'a', 's', 'd']) await p.keyboard.up(k); return true; }
    const dx = s.bx - s.px, dz = s.bz - s.pz;
    await p.keyboard[dx > 4 ? 'down' : 'up']('d');
    await p.keyboard[dx < -4 ? 'down' : 'up']('a');
    await p.keyboard[dz > 4 ? 'down' : 'up']('w');
    await p.keyboard[dz < -4 ? 'down' : 'up']('s');
    await wait(p, 80);
  }
  return false;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  // 1) Main menu
  let p = await start(browser);
  await shot(p, '03_menu.png');
  // 2) League ladder
  await p.mouse.click(410, 500); // LİG
  await wait(p, 900);
  await shot(p, '04_league.png');
  await p.context().close();
  // 3) Stadium select
  p = await start(browser);
  await p.mouse.click(725, 500); // OYNA
  await wait(p, 900);
  await shot(p, '05_stadiums.png');
  await p.context().close();

  // 4) Match on the standard grass pitch: charging a power shot, then the cut-in.
  p = await start(browser);
  await p.mouse.click(725, 500); // OYNA
  await wait(p, 900);
  await p.mouse.click(785, 495); // MAÇA BAŞLA
  await p.waitForFunction(() => window.__game.scene.isActive('Match'), null, { timeout: 10000 });
  await wait(p, 2500);
  if (!(await takeBall(p))) throw new Error('could not take the ball');
  await p.evaluate(() => {
    const m = window.__game.scene.getScene('Match');
    m.player.powerSegments = 3;
    m.opponent && m.opponent.character && (m.opponent.character.powerSegments = 2);
  });
  await p.keyboard.down('d');
  await p.keyboard.down('j');
  await wait(p, 900);
  await shot(p, '01_power_charge.png');
  await p.keyboard.up('j');
  await p.keyboard.up('d');
  await wait(p, 260);
  await shot(p, '02_power_cutin.png');
  await p.context().close();
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
