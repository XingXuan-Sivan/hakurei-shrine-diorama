import * as THREE from 'three';

/*
 * Omikuji slip.
 *
 * The card lives in camera space so it is always readable, and it is animated
 * from the rack's projected position into the lower-right of the frame — it
 * reads as the slip being pulled out of the rack and lifted to eye level.
 */

const FORTUNES = [
  { rank: '大吉', poem: '云开见月', note: '所求皆遂' },
  { rank: '中吉', poem: '静待时来', note: '不必争先' },
  { rank: '小吉', poem: '细流成川', note: '积少为多' },
  { rank: '吉', poem: '花发有时', note: '且候春风' },
  { rank: '末吉', poem: '雨过天青', note: '后运渐佳' },
  { rank: '凶', poem: '石上苔滑', note: '行止须慎' },
];

const CARD_W = 256;
const CARD_H = 512;
const DIST = 1.35;
const IN_SECONDS = 0.5;
const OUT_SECONDS = 0.3;

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function vertical(ctx, text, x, y, size, gap = 1.06) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  let yy = y;
  for (const ch of text) {
    ctx.fillText(ch, x, yy);
    yy += size * gap;
  }
}

export class Omikuji {
  constructor(camera) {
    this.camera = camera;

    this.canvas = document.createElement('canvas');
    this.canvas.width = CARD_W;
    this.canvas.height = CARD_H;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;

    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
    this.mesh.renderOrder = 20;
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    this.mesh.position.set(0, 0, -DIST);
    camera.add(this.mesh);

    this.p = 0;
    this.outward = false;
    this.from = new THREE.Vector3(0, 0, -DIST);
    this.to = new THREE.Vector3(0, 0, -DIST);
    this.tilt = 0;

    // one slip per shrine day: the same day always returns the same fortune
    this.day = 0;
    this.drawnDay = -1;
    this.fortune = FORTUNES[0];

    this.draw(this.fortune);
  }

  /** The shrine's day counter, advanced by the clock in main.js. */
  setDay(day) {
    this.day = day;
  }

  get visible() {
    return this.mesh.visible;
  }

  draw(fortune) {
    const ctx = this.ctx;
    const w = CARD_W;
    const h = CARD_H;
    ctx.clearRect(0, 0, w, h);

    // washi paper
    ctx.fillStyle = '#f4ead2';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c9b48a';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.strokeStyle = '#a8342c';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    // faint fibre flecks so the paper does not read as flat
    ctx.fillStyle = 'rgba(150, 122, 78, 0.10)';
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillRect(x, y, 1 + Math.random() * 3, 1);
    }

    // title column, right edge
    ctx.fillStyle = '#7d2b24';
    ctx.font = '700 26px "Yu Mincho", "Songti SC", serif';
    vertical(ctx, '御神籤', w - 52, 44, 26, 1.16);

    // rank
    ctx.fillStyle = fortune.rank === '凶' ? '#3a3a3a' : '#a8342c';
    ctx.font = '700 74px "Yu Mincho", "Songti SC", serif';
    vertical(ctx, fortune.rank, w / 2 - 22, 96, 72, 1.08);

    // poem, two columns
    ctx.fillStyle = '#3a2f24';
    ctx.font = '600 30px "Yu Mincho", "Songti SC", serif';
    vertical(ctx, fortune.poem, w / 2 + 4, 300, 30, 1.12);

    ctx.fillStyle = '#5b4b36';
    ctx.font = '500 22px "Yu Mincho", "Songti SC", serif';
    vertical(ctx, fortune.note, w / 2 + 62, 306, 22, 1.14);

    // footer
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#8a7355';
    ctx.font = '500 18px "Yu Mincho", "Songti SC", serif';
    ctx.fillText('博麗神社', w / 2, h - 46);

    this.texture.needsUpdate = true;
  }

  /** Start at the rack's screen position, then lift into the corner. */
  show(rackWorld) {
    const aspect = this.camera.aspect;
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * DIST;
    const halfW = halfH * aspect;

    const ndc = rackWorld.clone().project(this.camera);
    this.from.set(ndc.x * halfW, ndc.y * halfH, -DIST);
    // never start further out than the frame edge, or the slip flies in from nowhere
    this.from.x = THREE.MathUtils.clamp(this.from.x, -halfW * 0.94, halfW * 0.94);
    this.from.y = THREE.MathUtils.clamp(this.from.y, -halfH * 0.94, halfH * 0.94);

    this.tilt = (Math.random() - 0.5) * 0.16;
    this.p = 0;
    this.outward = true;
    this.mesh.visible = true;
    // a draw is kept for the rest of the shrine day, so tapping again shows the
    // exact same slip instead of rerolling it
    if (this.drawnDay !== this.day) {
      this.drawnDay = this.day;
      this.fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    }
    this.draw(this.fortune);
  }

  dismiss() {
    if (!this.mesh.visible || !this.outward) return;
    this.outward = false;
  }

  update(dt) {
    if (!this.mesh.visible) return;
    const step = this.outward ? dt / IN_SECONDS : -dt / OUT_SECONDS;
    this.p = clamp01(this.p + step);
    if (!this.outward && this.p <= 0) {
      this.mesh.visible = false;
      return;
    }

    const aspect = this.camera.aspect;
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * DIST;
    const halfW = halfH * aspect;
    const narrow = aspect < 0.92;
    const size = narrow ? 0.78 : 1;
    const cardH = halfH * (narrow ? 0.76 : 0.9) * size;
    const cardW = cardH * 0.5;

    this.to.set(halfW * 0.62, -halfH * 0.1, -DIST);
    this.mesh.scale.set(cardW, cardH, 1);

    const e = easeOut(this.p);
    this.mesh.position.lerpVectors(this.from, this.to, e);
    this.mesh.rotation.z = THREE.MathUtils.lerp(0.42, this.tilt, e);
    this.material.opacity = Math.min(1, this.p * 3.2);
  }
}
