/**
 * Painted backdrop: a soft anime gradient, distant hills, slow water bands,
 * drifting clouds, a travelling sun and moon. Drawn to a 2D canvas behind the
 * WebGL diorama so the model feels like it is floating in a quiet painting.
 *
 * The sun and moon ride a shared east-west arc driven by the caller's celestial
 * state, so dragging the time slider moves them the way a time-lapse would.
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
// pushed in at sunrise and sunset, strongest right on the horizon
const DUSK = {
  top: hexToRgb('#4b4468'),
  mid: hexToRgb('#8d5f66'),
  low: hexToRgb('#d9834f'),
  hills: [hexToRgb('#6b464a'), hexToRgb('#5b3d46'), hexToRgb('#7c5450')],
  water: [hexToRgb('#6a4644'), hexToRgb('#8a584a'), hexToRgb('#4b363c')],
  haze: hexToRgb('#ffbb80'),
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
    this.cel = { u: 0.5, v: 0.5, isDay: 1, alt: 1, warm: 0 };
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

  update(time, day, cel) {
    this.day = day;
    if (cel) this.cel = cel;
    if (time - this.lastDraw < 1 / 30) return;
    this.lastDraw = time;
    this._draw(time, day);
  }

  _draw(time, day) {
    const { ctx, w, h } = this;
    const night = 1 - day;
    const cel = this.cel;
    const warm = cel.warm || 0;
    // base mood, then the dusk wash on top of it
    const c = (a, b) => mixRgb(a, b, night);
    const cw = (a, b, dusk) => mixRgb(c(a, b), dusk, warm * 0.72);

    // base gradient
    const grad = ctx.createLinearGradient(0, 0, w * 0.15, h);
    grad.addColorStop(0, rgba(cw(DAY.top, NIGHT.top, DUSK.top), 1));
    grad.addColorStop(0.46, rgba(cw(DAY.mid, NIGHT.mid, DUSK.mid), 1));
    grad.addColorStop(0.8, rgba(cw(DAY.low, NIGHT.low, DUSK.low), 1));
    grad.addColorStop(1, rgba(cw(DAY.water[0], NIGHT.water[0], DUSK.water[0]), 1));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const horizonY = h * 0.62;
    const sunX = lerp(0.08, 0.92, clamp(cel.u, 0, 1)) * w;
    const sunY = horizonY - Math.sin(Math.PI * clamp(cel.u, 0, 1)) * h * 0.47;
    const moonX = lerp(0.08, 0.92, clamp(cel.v, 0, 1)) * w;
    const moonY = horizonY - Math.sin(Math.PI * clamp(cel.v, 0, 1)) * h * 0.47;

    // horizon wash: the band that makes sunset read as sunset
    const washX = cel.isDay ? sunX : moonX;
    const wash = ctx.createRadialGradient(washX, horizonY, 0, washX, horizonY, Math.max(w, h) * 0.62);
    wash.addColorStop(0, rgba(DUSK.haze, 0.5 * warm));
    wash.addColorStop(0.35, rgba(DUSK.haze, 0.2 * warm));
    wash.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);

    // warm/cool atmospheric bloom behind the diorama
    const bx = w * 0.54;
    const by = h * 0.54;
    const bloom = ctx.createRadialGradient(bx, by, 10, bx, by, Math.max(w, h) * 0.5);
    const hazeCol = cw(DAY.haze, NIGHT.haze, DUSK.haze);
    bloom.addColorStop(0, rgba(hazeCol, (0.32 * day + 0.18 * night) * (1 + warm * 0.4)));
    bloom.addColorStop(0.55, rgba(hazeCol, (0.1 * day + 0.05 * night) * (1 + warm * 0.4)));
    bloom.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, w, h);

    // stars
    const starA = smoothstep(0.12, 0.72, night) * (1 - warm * 0.55);
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

    // sun: white gold overhead, orange and flattened at the horizon
    const sunA = clamp(day * 1.25, 0, 1);
    if (sunA > 0.01) {
      const sunR = Math.min(w, h) * (0.036 + 0.016 * (1 - cel.alt));
      const low = 1 - cel.alt;
      const disc = mixRgb(hexToRgb('#fff6dc'), hexToRgb('#ff9c46'), low * 0.85);
      const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.4, sunX, sunY, sunR * 7);
      halo.addColorStop(0, rgba(disc, 0.42 * sunA));
      halo.addColorStop(0.18, rgba(mixRgb(disc, hexToRgb('#ffb066'), 0.5), 0.2 * sunA));
      halo.addColorStop(1, 'rgba(255,180,120,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 7, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = rgba(disc, 0.97 * sunA);
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = rgba(hexToRgb('#ffffff'), 0.3 * sunA);
      ctx.beginPath();
      ctx.arc(sunX - sunR * 0.16, sunY - sunR * 0.2, sunR * 0.5, 0, 6.2832);
      ctx.fill();
    }

    // moon
    const moonA = smoothstep(0.05, 0.55, night) * (1 - warm * 0.4);
    if (moonA > 0.01) {
      const mr = Math.min(w, h) * 0.048;
      const glow = ctx.createRadialGradient(moonX, moonY, mr * 0.3, moonX, moonY, mr * 5.2);
      glow.addColorStop(0, `rgba(255,249,225,${0.28 * moonA})`);
      glow.addColorStop(0.22, `rgba(240,238,214,${0.13 * moonA})`);
      glow.addColorStop(1, 'rgba(230,238,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, mr * 5.2, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = `rgba(250,246,226,${0.96 * moonA})`;
      ctx.beginPath();
      ctx.arc(moonX, moonY, mr, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = `rgba(226,222,203,${0.28 * moonA})`;
      ctx.beginPath();
      ctx.arc(moonX - mr * 0.24, moonY - mr * 0.16, mr * 0.16, 0, 6.2832);
      ctx.arc(moonX + mr * 0.26, moonY + mr * 0.2, mr * 0.1, 0, 6.2832);
      ctx.arc(moonX + mr * 0.16, moonY - mr * 0.32, mr * 0.07, 0, 6.2832);
      ctx.fill();
    }

    // thin drifting clouds, lit from the horizon side
    const cloudCol = mixRgb(cw(DAY.haze, NIGHT.haze, DUSK.haze), hexToRgb('#ffcf9a'), warm * 0.5);
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
        cg.addColorStop(0, rgba(cloudCol, (0.16 * day + 0.055 * night) * 0.9 + 0.05 * warm));
        cg.addColorStop(0.55, rgba(cloudCol, 0.07 * day + 0.025 * night + 0.02 * warm));
        cg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(ox, oy, rr, 0, 6.2832);
        ctx.fill();
      }
      ctx.restore();
    }

    // distant layered hills
    this._hill(0, h * 0.585, h * 0.12, 0.0, cw(DAY.hills[0], NIGHT.hills[0], DUSK.hills[0]), 0.9);
    this._hill(1, h * 0.635, h * 0.11, 1.7, cw(DAY.hills[1], NIGHT.hills[1], DUSK.hills[1]), 1);
    this._hill(2, h * 0.69, h * 0.09, 3.1, cw(DAY.hills[2], NIGHT.hills[2], DUSK.hills[2]), 1);

    // still water + slow wave bands
    const waterY = h * 0.70;
    const wg = ctx.createLinearGradient(0, waterY, 0, h);
    wg.addColorStop(0, rgba(cw(DAY.water[0], NIGHT.water[0], DUSK.water[0]), 1));
    wg.addColorStop(0.45, rgba(cw(DAY.water[1], NIGHT.water[1], DUSK.water[1]), 1));
    wg.addColorStop(1, rgba(cw(DAY.water[2], NIGHT.water[2], DUSK.water[2]), 1));
    ctx.fillStyle = wg;
    ctx.fillRect(0, waterY, w, h - waterY);

    // the sun or moon lays a broken column of light on the water
    const glint = ctx.createLinearGradient(0, waterY, 0, h);
    glint.addColorStop(0, rgba(DUSK.haze, 0.34 * (warm + 0.25 * day)));
    glint.addColorStop(0.45, rgba(DUSK.haze, 0.12 * (warm + 0.2 * day)));
    glint.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glint;
    const glintW = Math.min(w, h) * 0.16;
    ctx.beginPath();
    ctx.moveTo(washX - glintW * 0.25, waterY);
    ctx.lineTo(washX + glintW * 0.25, waterY);
    ctx.lineTo(washX + glintW, h);
    ctx.lineTo(washX - glintW, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

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
      const shade = i % 2 === 0 ? cw(DAY.water[1], NIGHT.water[1], DUSK.water[1]) : cw(DAY.water[0], NIGHT.water[0], DUSK.water[0]);
      ctx.fillStyle = rgba(shade, i % 2 === 0 ? 0.34 : 0.26);
      ctx.fill();
      ctx.beginPath();
      for (let x = 0; x <= w + 8; x += 8) {
        const y = yy + Math.sin(x * (0.0042 + i * 0.0008) + drift) * amp + Math.sin(x * 0.011 - drift * 0.7) * amp * 0.3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(hazeCol, (0.11 + day * 0.05) * (1 - i * 0.14));
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
