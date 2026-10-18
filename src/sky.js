/**
 * Painted backdrop: a soft anime gradient, distant hills, slow water bands,
 * drifting clouds, stars and a moon. Drawn to a 2D canvas behind the WebGL
 * diorama so the model feels like it is floating in a quiet painting.
 */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function hexToRgb(hex) {
  const n = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixRgb(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
function rgba(c, a) {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
}

const DAY = {
  top: hexToRgb('#7fa9ab'),
  mid: hexToRgb('#71999a'),
  low: hexToRgb('#3e7773'),
  hills: [hexToRgb('#3a716b'), hexToRgb('#326763'), hexToRgb('#4b857c')],
  water: [hexToRgb('#356e68'), hexToRgb('#3f7c73'), hexToRgb('#2d625f')],
  haze: hexToRgb('#d9e5da'),
};
const NIGHT = {
  top: hexToRgb('#050d22'),
  mid: hexToRgb('#0a1930'),
  low: hexToRgb('#0b2931'),
  hills: [hexToRgb('#081e27'), hexToRgb('#0a2630'), hexToRgb('#0c3038')],
  water: [hexToRgb('#081f26'), hexToRgb('#0a2830'), hexToRgb('#071b22')],
  haze: hexToRgb('#263c59'),
};

export class SkyBackdrop {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 1;
    this.h = 1;
    this.dpr = 1;
    this.lastDraw = -1;
    this.day = 1;
    this.stars = [];
    this.clouds = [];
    this.rnd = mulberry(84513);
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: this.rnd(),
        y: this.rnd() * 0.62,
        r: 0.5 + this.rnd() * 1.25,
        phase: this.rnd() * Math.PI * 2,
        speed: 0.25 + this.rnd() * 0.8,
        big: this.rnd() > 0.9,
      });
    }
    for (let i = 0; i < 4; i++) {
      this.clouds.push({
        x: this.rnd(),
        y: 0.14 + this.rnd() * 0.26,
        s: 0.7 + this.rnd() * 0.8,
        speed: 0.0015 + this.rnd() * 0.0022,
        phase: this.rnd() * 6.28,
      });
    }
    this.resize();
  }

  resize() {
    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._draw(0, this.day);
  }

  update(time, day) {
    this.day = day;
    if (time - this.lastDraw < 1 / 30) return;
    this.lastDraw = time;
    this._draw(time, day);
  }

  _draw(time, day) {
    const { ctx, w, h } = this;
    const night = 1 - day;
    const c = (a, b) => mixRgb(a, b, night);

    // base gradient
    const grad = ctx.createLinearGradient(0, 0, w * 0.15, h);
    grad.addColorStop(0, rgba(c(DAY.top, NIGHT.top), 1));
    grad.addColorStop(0.46, rgba(c(DAY.mid, NIGHT.mid), 1));
    grad.addColorStop(0.8, rgba(c(DAY.low, NIGHT.low), 1));
    grad.addColorStop(1, rgba(c(DAY.water[0], NIGHT.water[0]), 1));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // warm/cool atmospheric bloom behind the diorama
    const bx = w * 0.54;
    const by = h * 0.54;
    const bloom = ctx.createRadialGradient(bx, by, 10, bx, by, Math.max(w, h) * 0.5);
    bloom.addColorStop(0, rgba(c(DAY.haze, NIGHT.haze), day > 0.5 ? 0.32 : 0.18));
    bloom.addColorStop(0.55, rgba(c(DAY.haze, NIGHT.haze), day > 0.5 ? 0.1 : 0.05));
    bloom.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, w, h);

    // stars
    const starA = smoothstep(0.12, 0.72, night);
    if (starA > 0.01) {
      ctx.save();
      for (const s of this.stars) {
        const tw = 0.55 + 0.45 * Math.sin(time * s.speed + s.phase);
        const a = starA * (0.22 + 0.7 * tw);
        const x = s.x * w;
        const y = s.y * h;
        const r = s.big ? s.r * 1.5 : s.r;
        ctx.fillStyle = `rgba(238,242,255,${a})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 6.2832);
        ctx.fill();
        if (s.big) {
          ctx.fillStyle = `rgba(220,232,255,${a * 0.28})`;
          ctx.beginPath();
          ctx.arc(x, y, r * 3.2, 0, 6.2832);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // moon
    const moonA = smoothstep(0.05, 0.55, night);
    if (moonA > 0.01) {
      const mx = w * 0.82;
      const my = h * 0.185;
      const mr = Math.min(w, h) * 0.054;
      const glow = ctx.createRadialGradient(mx, my, mr * 0.3, mx, my, mr * 5.2);
      glow.addColorStop(0, `rgba(255,249,225,${0.28 * moonA})`);
      glow.addColorStop(0.22, `rgba(240,238,214,${0.13 * moonA})`);
      glow.addColorStop(1, 'rgba(230,238,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(mx, my, mr * 5.2, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = `rgba(250,246,226,${0.96 * moonA})`;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = `rgba(226,222,203,${0.28 * moonA})`;
      ctx.beginPath();
      ctx.arc(mx - mr * 0.24, my - mr * 0.16, mr * 0.16, 0, 6.2832);
      ctx.arc(mx + mr * 0.26, my + mr * 0.2, mr * 0.1, 0, 6.2832);
      ctx.arc(mx + mr * 0.16, my - mr * 0.32, mr * 0.07, 0, 6.2832);
      ctx.fill();
    }

    // thin drifting clouds
    for (const cl of this.clouds) {
      const cx = ((cl.x + time * cl.speed) % 1.36 - 0.18) * w;
      const cy = cl.y * h + Math.sin(time * 0.08 + cl.phase) * 4;
      const scale = cl.s * Math.min(w, h) * 0.11;
      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < 4; i++) {
        const ox = (i - 1.5) * scale * 1.1;
        const oy = Math.sin(i * 1.7 + cl.phase) * scale * 0.14;
        const rr = scale * (0.7 + (i % 2) * 0.32);
        const cg = ctx.createRadialGradient(ox, oy, 0, ox, oy, rr);
        cg.addColorStop(0, rgba(c(DAY.haze, NIGHT.haze), (day > 0.5 ? 0.16 : 0.055) * 0.9));
        cg.addColorStop(0.55, rgba(c(DAY.haze, NIGHT.haze), (day > 0.5 ? 0.07 : 0.025)));
        cg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(ox, oy, rr, 0, 6.2832);
        ctx.fill();
      }
      ctx.restore();
    }

    // distant layered hills
    this._hill(0, h * 0.585, h * 0.12, 0.0, c(DAY.hills[0], NIGHT.hills[0]), 0.9);
    this._hill(1, h * 0.635, h * 0.11, 1.7, c(DAY.hills[1], NIGHT.hills[1]), 1);
    this._hill(2, h * 0.69, h * 0.09, 3.1, c(DAY.hills[2], NIGHT.hills[2]), 1);

    // still water + slow wave bands
    const waterY = h * 0.70;
    const wg = ctx.createLinearGradient(0, waterY, 0, h);
    wg.addColorStop(0, rgba(c(DAY.water[0], NIGHT.water[0]), 1));
    wg.addColorStop(0.45, rgba(c(DAY.water[1], NIGHT.water[1]), 1));
    wg.addColorStop(1, rgba(c(DAY.water[2], NIGHT.water[2]), 1));
    ctx.fillStyle = wg;
    ctx.fillRect(0, waterY, w, h - waterY);

    for (let i = 0; i < 4; i++) {
      const yy = waterY + (h - waterY) * (0.18 + i * 0.2);
      const amp = (4 + i * 2.5) * (1 + night * 0.2);
      const drift = time * (0.018 + i * 0.006) + i * 1.9;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      for (let x = 0; x <= w + 8; x += 8) {
        const y = yy + Math.sin(x * (0.0042 + i * 0.0008) + drift) * amp + Math.sin(x * 0.011 - drift * 0.7) * amp * 0.3;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const shade = i % 2 === 0 ? c(DAY.water[1], NIGHT.water[1]) : c(DAY.water[0], NIGHT.water[0]);
      ctx.fillStyle = rgba(shade, i % 2 === 0 ? 0.34 : 0.26);
      ctx.fill();
      ctx.beginPath();
      for (let x = 0; x <= w + 8; x += 8) {
        const y = yy + Math.sin(x * (0.0042 + i * 0.0008) + drift) * amp + Math.sin(x * 0.011 - drift * 0.7) * amp * 0.3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(c(DAY.haze, NIGHT.haze), (0.11 + day * 0.05) * (1 - i * 0.14));
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // soft shadow / grounding haze under the floating island
    const sh = ctx.createRadialGradient(w * 0.5, h * 0.77, 10, w * 0.5, h * 0.77, w * 0.32);
    sh.addColorStop(0, `rgba(8,18,20,${0.18 - night * 0.05})`);
    sh.addColorStop(0.6, `rgba(8,18,20,${0.07 - night * 0.02})`);
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, 0, w, h);

    // vignette
    const vg = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.28, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(3,10,12,${0.2 + night * 0.18})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    // fine paper grain
    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 140; i++) {
      const x = (i * 173.3) % w;
      const y = (i * 97.7) % h;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();
  }

  _hill(i, baseY, amp, phase, color, alpha) {
    const { ctx, w } = this;
    ctx.beginPath();
    ctx.moveTo(0, baseY + amp * 0.7);
    for (let x = 0; x <= w + 10; x += 10) {
      const n = Math.sin(x * 0.0017 + phase) * 0.7 + Math.sin(x * 0.0041 + phase * 1.7) * 0.26 + Math.sin(x * 0.0008 + phase * 2.3) * 0.5;
      ctx.lineTo(x, baseY + n * amp);
    }
    ctx.lineTo(w, baseY + amp * 2);
    ctx.lineTo(0, baseY + amp * 2);
    ctx.closePath();
    ctx.fillStyle = rgba(color, alpha);
    ctx.fill();
  }
}

function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
