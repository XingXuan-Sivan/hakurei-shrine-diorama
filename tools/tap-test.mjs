/*
 * Drives the running diorama through the Chrome DevTools Protocol and checks
 * that each tap does what it should, capturing screenshots of the result.
 *
 *   npx vite --port 5199
 *   node tools/tap-test.mjs http://127.0.0.1:5199/?debug
 *
 * It launches headless Edge itself, so nothing has to be open first. The
 * screenshots land in shots/.
 */

import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const url = process.argv[2] || 'http://127.0.0.1:5199/?debug';
const PORT = 9333;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SHOTS = join(process.cwd(), 'shots');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = spawn(
  EDGE,
  [
    '--headless=new',
    '--no-first-run',
    '--disable-extensions',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${process.env.TEMP}\\edge-tap-test`,
    '--window-size=1280,860',
    url,
  ],
  { stdio: 'ignore' },
);

async function findPage() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page' && t.url.startsWith('http'));
      if (page) return page;
    } catch {
      /* still starting */
    }
    await sleep(250);
  }
  throw new Error('devtools endpoint never came up');
}

const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});

let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};

function send(method, params = {}) {
  const mid = ++id;
  return new Promise((resolve) => {
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (res.result?.exceptionDetails) throw new Error(JSON.stringify(res.result.exceptionDetails));
  return res.result?.result?.value;
}

async function shot(name) {
  await mkdir(SHOTS, { recursive: true });
  const res = await send('Page.captureScreenshot', { format: 'png' });
  const data = res.result?.data;
  if (!data) throw new Error('screenshot failed: ' + JSON.stringify(res).slice(0, 300));
  await writeFile(join(SHOTS, name), Buffer.from(data, 'base64'));
  return name;
}

// wait for the scene
let ready = false;
for (let i = 0; i < 100; i++) {
  ready = await evaluate('Boolean(window.__diorama && window.__diorama.world)');
  if (ready) break;
  await sleep(250);
}
if (!ready) throw new Error('scene never booted');

// shared helpers inside the page
await evaluate(`(() => {
  const d = window.__diorama;
  d.tapTest = {
    at(obj, dy = 0) {
      const v = d.camera.position.clone();
      obj.getWorldPosition(v);
      v.y += dy;
      v.project(d.camera);
      // use the canvas rect, exactly like Interaction._pick does: innerWidth
      // includes the scrollbar, and a few pixels of skew was enough to miss her
      const r = d.renderer.domElement.getBoundingClientRect();
      return [r.left + (v.x * 0.5 + 0.5) * r.width, r.top + (-v.y * 0.5 + 0.5) * r.height];
    },
    tap(x, y) {
      const c = d.renderer.domElement;
      const base = { clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, bubbles: true, cancelable: true };
      c.dispatchEvent(new PointerEvent('pointerdown', { ...base, buttons: 1 }));
      c.dispatchEvent(new PointerEvent('pointerup', { ...base, buttons: 0 }));
    },
    move(x, y) {
      const c = d.renderer.domElement;
      c.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true, bubbles: true }));
    },
    settle(seconds) {
      // headless throttles rAF, so push the animations along by hand
      const step = 1 / 30;
      for (let i = 0; i < seconds / step; i++) {
        d.world.update(0, 0, step);
        d.omikuji.update(step);
        d.coins.update(step);
        d.bubble.update(step, d.camera, (v) => d.reimu.headWorld(v));
      }
      d.renderer.render(d.scene, d.camera);
    },
    wake() {
      // one real frame, so billboards face the camera before we aim at them
      d.reimu.update(1 / 60, 0, 0);
      d.world.update(0, 0, 1 / 60);
      d.renderer.render(d.scene, d.camera);
    },
  };
  return true;
})()`);

const report = {};

// 1. tap the offering box, then the door
report.coins = await evaluate(`(() => {
  const t = window.__diorama.tapTest, d = window.__diorama;
  t.tap(...t.at(d.world.shrine.saisen.group, 0.8));
  t.settle(0.2);
  return d.coins.items.filter((i) => i.active).length;
})()`);

report.door = await evaluate(`(() => {
  const t = window.__diorama.tapTest, d = window.__diorama;
  const before = d.world.shrine.isDoorOpen();
  t.tap(...t.at(d.world.shrine.doorHit, 0.2));
  t.settle(0.6);
  return { before, after: d.world.shrine.isDoorOpen() };
})()`);

// 2. poke Reimu and capture the bubble
// headless starves rAF, so her billboard can be a frame stale and a throw can
// graze her outline; a person would simply tap again, so retry a few times.
report.reimu = await evaluate(`(() => {
  const t = window.__diorama.tapTest, d = window.__diorama;
  const before = { text: d.bubble.text, life: d.bubble.life, op: d.bubble.el.style.opacity };
  let attempts = 0;
  let hit = 'no';
  for (let i = 0; i < 4; i++) {
    attempts++;
    t.wake();
    const p = t.at(d.reimu.sprite, 0);
    if (!d.interaction._pick(p[0], p[1])) continue;
    hit = 'yes';
    t.tap(...p);
    break;
  }
  const justAfter = { text: d.bubble.text, life: d.bubble.life, op: d.bubble.el.style.opacity };
  t.settle(0.1);
  const settled = { text: d.bubble.text, life: d.bubble.life, op: d.bubble.el.style.opacity };
  return { hit, attempts, before, justAfter, settled, state: d.reimu.state };
})()`);
report.shotReimu = await shot('tap-reimu.png');

// 3. pull a slip from the omikuji rack and capture the card
report.omikuji = await evaluate(`(() => {
  const t = window.__diorama.tapTest, d = window.__diorama;
  t.wake();
  t.tap(...t.at(d.world.omikuji.group, 1.25));
  t.settle(0.9);
  const m = d.omikuji.mesh;
  return { visible: m.visible, p: +d.omikuji.p.toFixed(2), z: +m.position.z.toFixed(2), scale: +m.scale.y.toFixed(2) };
})()`);
report.shotOmikuji = await shot('tap-omikuji.png');

// 4. tapping empty ground puts the slip away again
report.dismiss = await evaluate(`(() => {
  const t = window.__diorama.tapTest, d = window.__diorama;
  t.wake();
  t.tap(40, 520);
  t.settle(0.8);
  return { visible: d.omikuji.mesh.visible };
})()`);

// 5. hover gives the pointer cursor over something interactive
report.hover = await evaluate(`(() => {
  const t = window.__diorama.tapTest, d = window.__diorama;
  const p = t.at(d.world.shrine.saisen.group, 0.8);
  t.move(p[0], p[1]);
  return new Promise((resolve) => setTimeout(() => {
    d.interaction.update();
    resolve(d.renderer.domElement.style.cursor);
  }, 140));
})()`);

// 6. double tap empty space re-frames the camera
report.doubleTap = await evaluate(`(() => {
  const t = window.__diorama.tapTest, d = window.__diorama;
  d.camera.position.set(6, 5, 12);
  d.controls.update();
  t.tap(60, 300);
  t.tap(62, 301);
  t.settle(0.05);
  return { dist: +d.camera.position.distanceTo(d.controls.target).toFixed(1) };
})()`);

console.log(JSON.stringify(report, null, 2));

ws.close();
browser.kill();
