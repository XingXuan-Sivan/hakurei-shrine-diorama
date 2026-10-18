/*
 * Tiny WebAudio sound effects — no files, no network.
 *
 * The context is created lazily on the first user gesture (browsers require it)
 * and every sound is a short envelope over oscillators or filtered noise.
 */

let ctx = null;

function audio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function noiseBuffer(ac, seconds) {
  const frames = Math.max(1, Math.floor(ac.sampleRate * seconds));
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function tone(ac, { type = 'sine', from = 440, to = 440, dur = 0.2, gain = 0.08, delay = 0 }) {
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(ac, { dur = 0.2, gain = 0.05, type = 'bandpass', freq = 1200, q = 1, delay = 0 }) {
  const t0 = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, dur + 0.05);
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t0);
  filter.Q.value = q;
  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(amp).connect(ac.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** A five-yen coin hitting the offering box, plus the wooden knock. */
export function playCoin() {
  const ac = audio();
  if (!ac) return;
  tone(ac, { type: 'triangle', from: 2100, to: 1500, dur: 0.11, gain: 0.05 });
  tone(ac, { type: 'triangle', from: 1450, to: 1100, dur: 0.09, gain: 0.035, delay: 0.03 });
  noise(ac, { dur: 0.16, gain: 0.05, type: 'bandpass', freq: 900, q: 1.2 });
  tone(ac, { type: 'sine', from: 180, to: 120, dur: 0.22, gain: 0.05, delay: 0.02 });
}

/** Full-length shoji slide: a soft friction hiss with a wooden knock at the end. */
export function playSlide() {
  const ac = audio();
  if (!ac) return;
  noise(ac, { dur: 0.62, gain: 0.028, type: 'bandpass', freq: 640, q: 0.8 });
  noise(ac, { dur: 0.5, gain: 0.02, type: 'lowpass', freq: 420, delay: 0.06 });
  tone(ac, { type: 'sine', from: 150, to: 90, dur: 0.16, gain: 0.045, delay: 0.66 });
  noise(ac, { dur: 0.07, gain: 0.03, type: 'bandpass', freq: 1500, q: 2, delay: 0.68 });
}

/** Dry paper rustle — used when the fortune slip is pulled out. */
export function playPaper() {
  const ac = audio();
  if (!ac) return;
  noise(ac, { dur: 0.22, gain: 0.045, type: 'highpass', freq: 2400 });
  noise(ac, { dur: 0.14, gain: 0.03, type: 'bandpass', freq: 3200, q: 1.4, delay: 0.08 });
}

/** Hollow wooden clack (bell rope, offering box lid). */
export function playClack() {
  const ac = audio();
  if (!ac) return;
  tone(ac, { type: 'square', from: 420, to: 220, dur: 0.09, gain: 0.035 });
  noise(ac, { dur: 0.09, gain: 0.04, type: 'bandpass', freq: 1100, q: 1.6 });
}
