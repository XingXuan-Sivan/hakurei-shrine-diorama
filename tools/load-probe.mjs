/**
 * Measures how long the page takes to become usable on a phone-like link:
 * 4x CPU throttle plus 1.6 Mbit/s with 150 ms latency. Reports the first frame,
 * when Reimu's atlas is actually decoded, and the per-asset download timeline.
 *
 *   node tools/load-probe.mjs            # dev server on :5199
 *   node tools/load-probe.mjs --fast     # no throttling, for comparison
 */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 9445;
const URL = process.env.PROBE_URL || 'http://127.0.0.1:5199/?debug';
const FAST = process.argv.includes('--fast');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), 'edge-probe-'));
const child = spawn(
  EDGE,
  [
    '--headless=new',
    '--no-first-run',
    '--disable-extensions',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=390,844',
    'about:blank',
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
      target = list.find((t) => t.type === 'page');
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
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed');
    return r.result.value;
  };

  await send('Page.enable');
  await send('Network.enable');
  await send('Runtime.enable');
  if (!FAST) {
    await send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      connectionType: 'cellular3g',
    });
    await send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }

  const t0 = Date.now();
  await send('Page.navigate', { url: URL });

  let firstFrameAt = null;
  let reimuAt = null;
  for (let i = 0; i < 400; i++) {
    await sleep(100);
    const s = await evaluate(`(() => {
      const d = window.__diorama;
      if (!d) return null;
      const canvas = d.renderer.domElement;
      return {
        drawn: d.renderer.info.render.frame > 0,
        reimu: !!(d.reimu && d.reimu.map && d.reimu.map.image),
        now: Math.round(performance.now()),
      };
    })()`);
    if (s && s.drawn && firstFrameAt === null) firstFrameAt = s.now;
    if (s && s.reimu && reimuAt === null) reimuAt = s.now;
    if (reimuAt !== null) break;
  }

  const res = await evaluate(`(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    const list = performance.getEntriesByType('resource')
      .filter((e) => /assets\\//.test(e.name))
      .map((e) => ({
        name: e.name.split('/').pop(),
        kb: Math.round((e.transferSize || 0) / 1024),
        start: Math.round(e.startTime),
        done: Math.round(e.startTime + e.duration),
      }))
      .sort((a, b) => a.start - b.start);
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      loadEvent: Math.round(nav.loadEventEnd || 0),
      fcp: fcp ? Math.round(fcp.startTime) : null,
      totalKb: list.reduce((n, e) => n + e.kb, 0),
      assets: list,
    };
  })()`);

  console.log(JSON.stringify({ throttled: !FAST, wallMs: Date.now() - t0, firstFrameAt, reimuAt, ...res }, null, 2));
} finally {
  ws?.close();
  child.kill();
}
