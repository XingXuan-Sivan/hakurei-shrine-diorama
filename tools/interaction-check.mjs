/**
 * Headless smoke test for the time slider, the tree shake and the once-a-day
 * omikuji. Drives the real page over CDP, so it exercises the same event paths
 * a person would.
 *
 *   node tools/interaction-check.mjs            # dev server on :5199
 */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 9444;
const URL = process.env.CHECK_URL || 'http://127.0.0.1:5199/?debug';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), 'edge-check-'));
const child = spawn(
  EDGE,
  [
    '--headless=new',
    '--no-first-run',
    '--disable-extensions',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=CalculateNativeWinOcclusion',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1280,800',
    URL,
  ],
  { stdio: 'ignore' },
);

let ws;
try {
  let target = null;
  for (let i = 0; i < 80 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page' && t.url.startsWith('http'));
    } catch {
      /* not up yet */
    }
  }
  if (!target) throw new Error('no devtools target');

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });

  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const mid = ++id;
      pending.set(mid, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result)));
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed');
    return r.result.value;
  };

  await send('Runtime.enable');
  for (let i = 0; i < 40; i++) {
    const ready = await evaluate('!!(window.__diorama && window.__diorama.time)');
    if (ready) break;
    await sleep(250);
  }

  const result = await evaluate(`(async () => {
    const d = window.__diorama;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const canvas = d.renderer.domElement;
    const out = {};

    const tap = (obj, dy = 0) => {
      const box = new d.THREE.Box3().setFromObject(obj);
      const c = box.getCenter(new d.THREE.Vector3());
      c.y += dy;
      c.project(d.camera);
      const r = canvas.getBoundingClientRect();
      const x = r.left + (c.x * 0.5 + 0.5) * r.width;
      const y = r.top + (-c.y * 0.5 + 0.5) * r.height;
      const at = { clientX: x, clientY: y, pointerId: 1, bubbles: true, pointerType: 'mouse' };
      canvas.dispatchEvent(new PointerEvent('pointerdown', at));
      canvas.dispatchEvent(new PointerEvent('pointerup', at));
      return { x: Math.round(x), y: Math.round(y) };
    };

    // --- tree shake ---
    const tree = d.world.trees[0];
    out.treeAt = tap(tree.canopy, 0.2);
    await sleep(120);
    out.burstParts = d.world.burst.parts.length;
    out.treeShaking = !!tree.shaking;

    // --- slider ---
    const range = document.getElementById('clock-range');
    out.autoBefore = d.time.auto;
    range.value = '520';
    range.dispatchEvent(new Event('input', { bubbles: true }));
    out.autoAfter = d.time.auto;
    out.target = +d.time.target.toFixed(3);
    out.thumbLeft = document.getElementById('clock-thumb').style.left;

    // --- omikuji: one slot per shrine day, a new slot the next day ---
    const rack = d.world.omikuji.group.getWorldPosition(new d.THREE.Vector3());
    rack.y += 1.2;
    const p = rack.clone().project(d.camera);
    const rr = canvas.getBoundingClientRect();
    const px = rr.left + (p.x * 0.5 + 0.5) * rr.width;
    const py = rr.top + (-p.y * 0.5 + 0.5) * rr.height;
    const tapAt = () => {
      const ev = { clientX: px, clientY: py, pointerId: 1, bubbles: true, pointerType: 'mouse' };
      canvas.dispatchEvent(new PointerEvent('pointerdown', ev));
      canvas.dispatchEvent(new PointerEvent('pointerup', ev));
    };

    d.omikuji.setDay(2);
    tapAt();
    await sleep(120);
    out.slip1 = d.omikuji.fortune.rank;
    out.visible1 = d.omikuji.visible;
    tapAt();
    await sleep(120);
    out.slip2 = d.omikuji.fortune.rank;
    out.sameSlip = out.slip1 === out.slip2;

    const ranks = new Set([out.slip1]);
    for (let day = 3; day <= 10; day++) {
      d.omikuji.setDay(day);
      tapAt();
      await sleep(90);
      ranks.add(d.omikuji.fortune.rank);
    }
    out.distinctRanks = ranks.size;

    // --- is the render loop alive in this browser? ---
    document.getElementById('clock-auto').click();
    const a0 = d.time.tod;
    await sleep(700);
    out.loopAlive = d.time.tod !== a0;
    if (out.loopAlive) {
      d.time.tod = 0.9992;
      await sleep(1400);
      out.shrineDayAfterWrap = d.time.shrineDay;
    }
    return out;
  })()`);

  console.log(JSON.stringify(result, null, 2));

  const fail = [];
  if (!(result.burstParts > 0)) fail.push('tree shake produced no burst leaves');
  if (!result.treeShaking) fail.push('tree not shaking');
  if (result.autoBefore !== true || result.autoAfter !== false) fail.push('auto flag not cleared by slider');
  if (Math.abs(result.target - 0.52) > 0.01) fail.push('slider did not retarget the clock');
  if (!result.sameSlip) fail.push('omikuji changed within one shrine day');
  if (!(result.distinctRanks > 1)) fail.push('omikuji never rerolled across shrine days');
  if (result.loopAlive && result.shrineDayAfterWrap === 0) fail.push('shrine day did not advance at sunrise');

  if (fail.length) {
    console.error('\nFAILED:\n - ' + fail.join('\n - '));
    process.exitCode = 1;
  } else {
    console.log('\nall interaction checks passed');
  }
} finally {
  ws?.close();
  child.kill();
}
