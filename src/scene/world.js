import * as THREE from 'three';
import {
  C,
  M,
  Batcher,
  mesh,
  box,
  rbox,
  rboxGeo,
  toon,
  tex,
  textTexture,
  seeded,
  randRange,
  pick,
  addOutlines,
} from '../palette.js';
import { buildTree } from './trees.js';
import {
  buildTorii,
  buildStoneLantern,
  buildTemizuya,
  buildEmaRack,
  buildOmikujiRack,
  buildNoticeBoard,
  buildHangingLantern,
  braidedRope,
} from './props.js';
import { buildShrine, buildOffice, buildHokora } from './shrine.js';

const BASE = 21.6;
const HALF = BASE / 2;
const FRONT_Y = 0.1;
const TERRACE_Y = 0.55;
const TERRACE_FRONT_Z = 2.2;
const STEP_TOP_Z = 3.0;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------------ */
/* Small landscape pieces                                              */
/* ------------------------------------------------------------------ */

function bush(parent, x, z, y, scale, kind, seed) {
  const rnd = seeded(seed);
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const cols =
    kind === 'pink'
      ? [0xd89997, 0xe7b7ab, 0xc47d86]
      : kind === 'amber'
        ? [0xc08c4b, 0xd9ad65, 0x96683b]
        : [C.leafDark, C.leaf, C.leafLight];
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd();
    const r = (0.18 + rnd() * 0.28) * scale;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), toon(pick(rnd, cols), { flatShading: true }));
    m.position.set(Math.cos(a) * r, (0.18 + rnd() * 0.2) * scale, Math.sin(a) * r * 0.8);
    const s = (0.28 + rnd() * 0.22) * scale;
    m.scale.set(s * (1 + rnd() * 0.3), s * (0.62 + rnd() * 0.22), s * (1 + rnd() * 0.25));
    m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

function rock(parent, x, z, y, scale, seed, dark = false) {
  const rnd = seeded(seed);
  const mat = dark ? M.stoneDark : M.stone;
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat);
  m.position.set(x, y + 0.1 * scale, z);
  m.scale.set((0.28 + rnd() * 0.22) * scale, (0.16 + rnd() * 0.14) * scale, (0.24 + rnd() * 0.2) * scale);
  m.rotation.set(rnd() * 2, rnd() * 6.28, rnd() * 2);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  if (rnd() > 0.35) {
    const moss = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), M.moss);
    moss.position.set(x + (rnd() - 0.5) * 0.12, y + 0.22 * scale, z + (rnd() - 0.5) * 0.12);
    moss.scale.set(0.2 * scale, 0.05 * scale, 0.16 * scale);
    moss.receiveShadow = true;
    parent.add(moss);
  }
  return m;
}

function mossPatch(parent, x, z, y, sx, sz, seed) {
  const rnd = seeded(seed);
  const g = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), rnd() > 0.5 ? M.moss : M.mossLight);
  g.position.set(x, y + 0.012, z);
  g.scale.set(sx, 0.022, sz);
  g.receiveShadow = true;
  parent.add(g);
  return g;
}

function grassTuft(parent, x, z, y, scale, seed, phase) {
  const rnd = seeded(seed);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rnd() * 6.28;
  parent.add(group);
  const batch = new Batcher();
  const blades = 7 + Math.floor(rnd() * 4);
  for (let i = 0; i < blades; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * 0.16 * scale;
    const h = (0.18 + rnd() * 0.24) * scale;
    const g = new THREE.ConeGeometry(0.018 * scale, h, 3);
    batch.add(g, rnd() > 0.55 ? M.moss : M.grass, [Math.cos(a) * r, h / 2, Math.sin(a) * r], [0, a, (rnd() - 0.5) * 0.5]);
    g.dispose();
  }
  batch.build(group, { cast: false, receive: false });
  group.userData.phase = phase;
  return group;
}

function bambooBanner(parent, x, z, y, ry, text) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  mesh(new THREE.CylinderGeometry(0.026, 0.03, 2.8, 6), M.woodDark, { parent: g, y: 1.4, cast: true });
  mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 5), M.woodDark, { parent: g, y: 2.65, rz: Math.PI / 2, cast: true });
  const t = textTexture(text, {
    w: 180,
    h: 560,
    bg: '#f1e7d2',
    fg: '#8e2f22',
    border: '#b9a077',
    borderWidth: 6,
    font: '700 104px "Yu Mincho", serif',
    vertical: true,
    radius: 3,
    padding: 30,
  });
  const mat = toon(0xffffff, { map: t, side: THREE.DoubleSide, transparent: true });
  mat.emissive = new THREE.Color(0x2b1d15);
  mat.emissiveIntensity = 0.3;
  const cloth = mesh(new THREE.PlaneGeometry(0.55, 2.0), mat, { parent: g, x: 0.1, y: 1.65, z: 0.01, cast: true });
  cloth.name = 'banner';
  return { group: g, cloth };
}

/* ------------------------------------------------------------------ */
/* World                                                               */
/* ------------------------------------------------------------------ */

export class World {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);

    this.trees = [];
    this.grass = [];
    this.lanterns = [];
    this.motes = [];
    this.floatingPetals = [];
    this.debris = [];
    this.banners = [];
    this.pools = [];
    this.fireflyLights = [];

    this.rnd = seeded(20241018);

    this.buildBase();
    this.buildGround();
    this.buildFence();
    this.buildPath();
    this.buildPaving();
    this.buildGardens();
    this.buildBuildings();
    this.buildFixtures();
    this.buildParticles();
    this.buildShadow();
  }

  /* ---------------- base ---------------- */
  buildBase() {
    const g = new THREE.Group();
    g.position.y = 0;
    this.root.add(g);
    this.baseGroup = g;

    // dark wooden plinth with a soft rounded edge
    rbox(BASE, 0.48, BASE, 0.16, M.woodDeep, { parent: g, y: -1.27, cast: true, receive: true });
    rbox(BASE - 0.06, 0.12, BASE - 0.06, 0.12, M.wood, { parent: g, y: -0.97, cast: true, receive: true });
    // main stone body
    const stoneBody = rbox(BASE - 0.1, 0.82, BASE - 0.1, 0.13, M.stoneMortar, { parent: g, y: -0.51, cast: true, receive: true });
    stoneBody.name = 'base-stone';
    // carved stone courses on four faces
    const batch = new Batcher();
    const faceRows = [-0.7, -0.36];
    const blockW = 1.55;
    const n = 13;
    for (let row = 0; row < faceRows.length; row++) {
      for (let i = 0; i < n; i++) {
        const off = row === 0 ? 0 : blockW * 0.5;
        const x = -HALF + 0.55 + off + i * blockW;
        if (x > HALF - 0.4) continue;
        const w = blockW - 0.085;
        const h = 0.29;
        const y = faceRows[row];
        const mat = [M.stone, M.stoneLight, M.stone, M.stoneDark][(i + row * 3) % 4];
        // front and back
        batch.add(rboxGeo(w, h, 0.12, 0.02), mat, [x, y, HALF - 0.03]);
        batch.add(rboxGeo(w, h, 0.12, 0.02), mat, [x, y, -HALF + 0.03]);
        // sides
        batch.add(rboxGeo(w, h, 0.12, 0.02), mat, [HALF - 0.03, y, x], [0, Math.PI / 2, 0]);
        batch.add(rboxGeo(w, h, 0.12, 0.02), mat, [-HALF + 0.03, y, x], [0, Math.PI / 2, 0]);
      }
    }
    // corner quoins
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          batch.add(rboxGeo(0.48, 0.3, 0.48, 0.03), i % 2 ? M.stoneLight : M.stone, [
            sx * (HALF - 0.26),
            faceRows[i],
            sz * (HALF - 0.26),
          ]);
        }
        // dark metal corner strap
        batch.box(M.woodDark, 0.18, 0.76, 0.18, sx * (HALF - 0.12), -0.54, sz * (HALF - 0.12));
        batch.add(new THREE.CylinderGeometry(0.06, 0.06, 0.09, 8), M.brass, [sx * (HALF - 0.12), -0.12, sz * (HALF - 0.12)]);
      }
    }
    batch.build(g);

    // pale wooden cap and dark trim under the soil
    rbox(BASE - 0.02, 0.1, BASE - 0.02, 0.1, M.wood, { parent: g, y: -0.055, cast: true, receive: true });
    rbox(BASE + 0.02, 0.06, BASE + 0.02, 0.08, M.woodDark, { parent: g, y: 0.0, cast: true, receive: true });
    // thin brass corner caps
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const cap = box(0.18, 0.08, 0.18, M.brass, {
          parent: g,
          x: sx * (HALF - 0.09),
          y: 0.045,
          z: sz * (HALF - 0.09),
          cast: false,
        });
        cap.rotation.y = Math.PI / 4;
      }
    }
  }

  /* ---------------- ground ---------------- */
  buildGround() {
    const gravel = toon(0xfff5e2, { map: tex('gravel.webp', { repeat: [10, 10] }) });
    const terraceMat = toon(0xfff9ea, { map: tex('gravel.webp', { repeat: [9, 9] }) });
    const mossGround = toon(0x829566, { map: tex('gravel.webp', { repeat: [4, 4] }) });

    // front courtyard
    const front = box(BASE - 0.34, 0.09, HALF - TERRACE_FRONT_Z + 0.2, gravel, {
      parent: this.root,
      y: FRONT_Y - 0.045,
      z: (TERRACE_FRONT_Z + HALF) / 2 - 0.05,
      receive: true,
      cast: false,
    });
    front.name = 'front-yard';
    // rear terrace
    const rear = box(BASE - 0.34, 0.45, HALF + TERRACE_FRONT_Z, terraceMat, {
      parent: this.root,
      y: TERRACE_Y - 0.225,
      z: (-HALF + TERRACE_FRONT_Z) / 2,
      receive: true,
      cast: false,
    });
    rear.name = 'rear-terrace';

    // mossy edges: thin irregular mats along the fence and tree lines
    for (let i = 0; i < 16; i++) {
      const side = i % 4;
      const t = randRange(this.rnd, -9.5, 9.5);
      let x, z, y;
      if (side === 0) {
        x = t;
        z = -9.75;
        y = TERRACE_Y;
      } else if (side === 1) {
        x = t;
        z = 9.7;
        y = FRONT_Y;
      } else if (side === 2) {
        x = -9.7;
        z = t;
        y = t < TERRACE_FRONT_Z ? TERRACE_Y : FRONT_Y;
      } else {
        x = 9.7;
        z = t;
        y = t < TERRACE_FRONT_Z ? TERRACE_Y : FRONT_Y;
      }
      mossPatch(this.root, x + randRange(this.rnd, -0.4, 0.4), z, y, randRange(this.rnd, 0.5, 1.4), randRange(this.rnd, 0.3, 0.7), 90 + i);
    }

    // retaining wall between terrace and courtyard
    const wall = new Batcher();
    for (const seg of [
      [-HALF + 0.35, -2.85],
      [2.85, HALF - 0.35],
    ]) {
      const x0 = seg[0];
      const x1 = seg[1];
      const count = Math.ceil((x1 - x0) / 1.05);
      for (let i = 0; i < count; i++) {
        const xx = x0 + (i + 0.5) * ((x1 - x0) / count);
        wall.add(rboxGeo((x1 - x0) / count - 0.035, 0.22, 0.22, 0.02), i % 2 ? M.stone : M.stoneLight, [xx, 0.22, TERRACE_FRONT_Z + 0.07]);
        wall.add(rboxGeo((x1 - x0) / count - 0.035, 0.22, 0.22, 0.02), i % 3 ? M.stoneLight : M.stoneDark, [xx, 0.435, TERRACE_FRONT_Z + 0.07]);
      }
      wall.box(M.stoneDark, x1 - x0, 0.08, 0.3, (x0 + x1) / 2, 0.56, TERRACE_FRONT_Z + 0.02);
    }
    // central stair cheeks
    for (const s of [-1, 1]) {
      wall.box(M.stone, 0.55, 0.46, 0.85, s * 2.9, 0.33, TERRACE_FRONT_Z + 0.15);
      wall.box(M.stoneDark, 0.62, 0.08, 0.95, s * 2.9, 0.56, TERRACE_FRONT_Z + 0.15);
    }
    // three broad stone steps
    for (let i = 0; i < 3; i++) {
      const top = TERRACE_Y - i * 0.15;
      const zz = TERRACE_FRONT_Z + 0.12 + i * 0.27;
      wall.box(i % 2 ? M.stone : M.stoneLight, 5.65, top - FRONT_Y + 0.02, 0.31, 0, FRONT_Y + (top - FRONT_Y) / 2, zz);
    }
    wall.build(this.root);

    // worn patch in the courtyard
    const worn = new THREE.Mesh(new THREE.CircleGeometry(1, 22), toon(0xb4a488, { transparent: true, opacity: 0.55, depthWrite: false }));
    worn.rotation.x = -Math.PI / 2;
    worn.scale.set(2.2, 1.15, 1);
    worn.position.set(1.0, FRONT_Y + 0.006, 5.35);
    worn.receiveShadow = true;
    this.root.add(worn);
    const worn2 = worn.clone();
    worn2.scale.set(1.2, 0.75, 1);
    worn2.position.set(-1.7, FRONT_Y + 0.007, 6.9);
    this.root.add(worn2);

    // stone gutter / border along the terrace front, left and right of steps
    const borderMat = M.stoneDark;
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -HALF + 0.5 : 3.3;
      const x1 = s < 0 ? -3.3 : HALF - 0.5;
      box(x1 - x0, 0.05, 0.24, borderMat, {
        parent: this.root,
        x: (x0 + x1) / 2,
        y: FRONT_Y + 0.02,
        z: STEP_TOP_Z + 0.18,
        cast: false,
      });
    }

    this.groundMat = gravel;
    this.terraceMat = terraceMat;
    this.mossGround = mossGround;
  }

  /* ---------------- fence ---------------- */
  buildFence() {
    const batch = new Batcher();
    const post = (x, z, y, h = 0.82) => {
      batch.box(M.stone, 0.21, 0.16, 0.21, x, y + 0.08, z);
      batch.box(M.stoneLight, 0.23, 0.035, 0.23, x, y + 0.17, z);
      batch.box(M.woodDark, 0.095, h, 0.095, x, y + 0.16 + h / 2, z);
      batch.box(M.wood, 0.12, 0.06, 0.12, x, y + 0.16 + h + 0.02, z);
    };
    const railX = (x0, x1, z, y) => {
      batch.box(M.wood, Math.abs(x1 - x0), 0.07, 0.06, (x0 + x1) / 2, y + 0.74, z);
      batch.box(M.wood, Math.abs(x1 - x0), 0.055, 0.05, (x0 + x1) / 2, y + 0.46, z);
    };
    const railZ = (z0, z1, x, y) => {
      batch.box(M.wood, 0.06, 0.07, Math.abs(z1 - z0), x, y + 0.74, (z0 + z1) / 2);
      batch.box(M.wood, 0.05, 0.055, Math.abs(z1 - z0), x, y + 0.46, (z0 + z1) / 2);
    };
    const runX = (x0, x1, z, y) => {
      const n = Math.max(2, Math.ceil(Math.abs(x1 - x0) / 1.35));
      for (let i = 0; i <= n; i++) post(x0 + (i * (x1 - x0)) / n, z, y);
      railX(x0, x1, z, y);
      for (let i = 0; i < n; i += 3) {
        const xa = x0 + (i * (x1 - x0)) / n;
        const xb = x0 + (Math.min(i + 1, n) * (x1 - x0)) / n;
        batch.box(M.woodDark, Math.abs(xb - xa) * 1.05, 0.035, 0.035, (xa + xb) / 2, y + 0.48, z, 0, 0, 0);
      }
    };
    const runZ = (z0, z1, x, y) => {
      const n = Math.max(2, Math.ceil(Math.abs(z1 - z0) / 1.35));
      for (let i = 0; i <= n; i++) post(x, z0 + (i * (z1 - z0)) / n, y);
      railZ(z0, z1, x, y);
    };

    // front, with a gateway at the path
    runX(-HALF + 0.28, -1.85, HALF - 0.24, FRONT_Y);
    runX(1.85, HALF - 0.28, HALF - 0.24, FRONT_Y);
    // back
    runX(-HALF + 0.28, HALF - 0.28, -HALF + 0.24, TERRACE_Y);
    // sides split at the terrace edge
    runZ(-HALF + 0.28, TERRACE_FRONT_Z, -HALF + 0.24, TERRACE_Y);
    runZ(TERRACE_FRONT_Z, HALF - 0.28, -HALF + 0.24, FRONT_Y);
    runZ(-HALF + 0.28, TERRACE_FRONT_Z, HALF - 0.24, TERRACE_Y);
    runZ(TERRACE_FRONT_Z, HALF - 0.28, HALF - 0.24, FRONT_Y);

    // gateway posts
    for (const s of [-1, 1]) {
      post(s * 1.9, HALF - 0.24, FRONT_Y, 1.16);
      batch.add(new THREE.SphereGeometry(0.1, 8, 6), M.brass, [s * 1.9, FRONT_Y + 1.28, HALF - 0.24]);
      batch.box(M.stone, 0.34, 0.24, 0.34, s * 1.9, FRONT_Y + 0.08, HALF - 0.24);
    }
    // a couple of stone stubs along the path
    for (const s of [-1, 1]) {
      batch.box(M.stoneDark, 0.2, 0.28, 0.2, s * 1.62, FRONT_Y + 0.14, HALF - 0.65);
      batch.box(M.stone, 0.16, 0.1, 0.16, s * 1.62, FRONT_Y + 0.32, HALF - 0.65);
    }
    batch.build(this.root);
  }

  /* ---------------- path ---------------- */
  buildPath() {
    const batch = new Batcher();
    const rnd = seeded(5);
    const pathMat = toon(0xc2c5b8, { map: tex('stone.webp') });
    const pathMatLight = toon(0xd4d4c6, { map: tex('stone.webp') });
    // broad stone landing at the foot of the shrine steps
    for (let row = 0; row < 2; row++) {
      for (let col = -2; col <= 2; col++) {
        const mat = [pathMatLight, pathMat, pathMat, M.stoneDark][(row * 3 + col + 8) % 4];
        batch.add(rboxGeo(0.98, 0.06, 0.62, 0.015), mat, [col * 0.94 + (row % 2) * 0.25, FRONT_Y + 0.03, 2.45 + row * 0.63], [0, 0.02, 0]);
      }
    }
    // the main sando runs straight down the shrine axis, through the torii
    for (let i = 0; i < 17; i++) {
      const z = 3.15 + i * 0.46;
      const cx = Math.sin((z - 3.0) * 0.35) * 0.09;
      const w = 1.92 + Math.sin(i * 1.7) * 0.26 + rnd() * 0.2;
      const d = 0.43 + rnd() * 0.08;
      const mat = [pathMatLight, pathMat, pathMatLight, M.stoneDark][i % 4];
      batch.add(rboxGeo(w, 0.055, d, 0.012), mat, [cx + (rnd() - 0.5) * 0.08, FRONT_Y + 0.028, z], [0, (rnd() - 0.5) * 0.04, 0]);
      for (const s of [-1, 1]) {
        batch.add(rboxGeo(0.16, 0.09, d * 0.92, 0.02), i % 2 ? M.stoneDark : pathMat, [cx + s * (w / 2 + 0.1), FRONT_Y + 0.026, z], [0, 0.02, 0]);
      }
      if (i % 3 === 0) {
        // a split half-slab beside the main one, like a repaired path
        batch.add(rboxGeo(w * 0.36, 0.05, d * 0.9, 0.01), M.stone, [cx + w * 0.7, FRONT_Y + 0.026, z + 0.02], [0, 0.06, 0]);
      }
    }
    // path to the temizuya, branching left
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const x = -2.4 - t * 3.0;
      const z = 4.2 + t * 0.7;
      batch.add(rboxGeo(0.55, 0.05, 0.72, 0.012), M.stone, [x, FRONT_Y + 0.026, z], [0, 0.18, 0]);
    }
    // path to ema / omikuji on the right
    for (let i = 0; i < 4; i++) {
      const x = 2.6 + i * 0.8;
      const z = 3.5 + i * 0.35;
      batch.add(rboxGeo(0.7, 0.05, 0.56, 0.01), M.stoneLight, [x, FRONT_Y + 0.026, z], [0, -0.15, 0]);
    }
    // path from the office to the terrace
    for (let i = 0; i < 5; i++) {
      batch.add(rboxGeo(0.72, 0.05, 0.46, 0.01), M.stone, [4.6 + i * 0.55, TERRACE_Y + 0.026, 0.2 + i * 0.32], [0, 0.1, 0]);
    }
    batch.build(this.root);

    // gravel shoulder lines
    for (const s of [-1, 1]) {
      const strip = box(0.22, 0.03, 6.7, toon(0xc1b296), {
        parent: this.root,
        x: s * 1.45,
        y: FRONT_Y + 0.016,
        z: 6.55,
        cast: false,
        receive: true,
      });
      strip.rotation.y = 0.01;
    }
  }

  /* ---------------- terrace paving ---------------- */
  buildPaving() {
    const batch = new Batcher();
    // large stone apron in front of the shrine
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 9; col++) {
        const x = -5.2 + col * 1.3 + (row % 2) * 0.15;
        const z = -0.55 + row * 0.57;
        if (Math.abs(x) > 6.0) continue;
        const mat = [M.stoneLight, M.stone, M.stone, M.stoneDark][(row * 3 + col) % 4];
        batch.add(rboxGeo(1.2, 0.045, 0.5, 0.012), mat, [x, TERRACE_Y + 0.027, z], [0, 0.01 * (row - col), 0]);
      }
    }
    // side strip to the office
    for (let i = 0; i < 4; i++) {
      batch.add(rboxGeo(0.9, 0.045, 0.7, 0.01), i % 2 ? M.stone : M.stoneLight, [6.7, TERRACE_Y + 0.027, -0.9 + i * 0.75], [0, 0.04, 0]);
    }
    // edging stones
    for (const s of [-1, 1]) {
      for (let i = 0; i < 8; i++) {
        batch.add(rboxGeo(0.38, 0.1, 0.44, 0.02), M.stoneDark, [s * 5.95, TERRACE_Y + 0.04, -0.6 + i * 0.42], [0, 0.02, 0]);
      }
    }
    batch.build(this.root);

    // moss between some paving stones
    mossPatch(this.root, -4.3, 0.3, TERRACE_Y, 0.5, 0.18, 71);
    mossPatch(this.root, 4.7, -0.1, TERRACE_Y, 0.45, 0.15, 72);
  }

  /* ---------------- planting ---------------- */
  buildGardens() {
    const rnd = seeded(321);

    const trees = [
      { x: -7.3, z: -8.3, y: TERRACE_Y, scale: 1.38, seed: 3, kind: 'cherry', canopyCount: 44, canopyRadius: 2.45, trunkHeight: 4.0, lean: 0.18, phase: 0.2 },
      { x: -8.6, z: -0.4, y: TERRACE_Y, scale: 0.86, seed: 11, kind: 'green', canopyCount: 24, canopyRadius: 1.9, trunkHeight: 3.1, lean: -0.2, phase: 1.2 },
      { x: 8.1, z: -6.4, y: TERRACE_Y, scale: 0.8, seed: 8, kind: 'amber', canopyCount: 32, canopyRadius: 1.85, trunkHeight: 3.45, lean: 0.1, phase: 2.4 },
      { x: -2.0, z: -9.2, y: TERRACE_Y, scale: 0.92, seed: 17, kind: 'pine', canopyCount: 21, canopyRadius: 1.9, trunkHeight: 3.3, lean: 0.05, phase: 3.1 },
      { x: -5.3, z: 3.6, y: FRONT_Y, scale: 0.88, seed: 6, kind: 'cherry', canopyCount: 27, canopyRadius: 2.1, trunkHeight: 2.9, lean: -0.16, phase: 4.2 },
      { x: 6.2, z: 6.9, y: FRONT_Y, scale: 0.66, seed: 14, kind: 'cherry', canopyCount: 23, canopyRadius: 1.7, trunkHeight: 2.7, lean: 0.24, phase: 0.7 },
      { x: 9.0, z: 1.3, y: FRONT_Y, scale: 0.68, seed: 21, kind: 'green', canopyCount: 18, canopyRadius: 1.5, trunkHeight: 2.4, lean: 0.1, phase: 5.0 },
      { x: -8.7, z: 1.8, y: FRONT_Y, scale: 0.72, seed: 25, kind: 'pine', canopyCount: 17, canopyRadius: 1.5, trunkHeight: 2.5, lean: -0.2, phase: 2.9 },
    ];
    for (const t of trees) {
      const tree = buildTree(this.root, t);
      this.trees.push(tree);
    }

    // bushes along the fence, path, and building corners
    const bushes = [
      [-9.2, 6.9, FRONT_Y, 0.75, 'green'],
      [-9.1, 5.2, FRONT_Y, 0.55, 'pink'],
      [8.8, 6.8, FRONT_Y, 0.8, 'green'],
      [7.9, 2.4, FRONT_Y, 0.55, 'pink'],
      [-8.0, 3.3, FRONT_Y, 0.62, 'green'],
      [-4.7, 8.8, FRONT_Y, 0.5, 'green'],
      [4.6, 8.9, FRONT_Y, 0.55, 'pink'],
      [6.0, -0.7, TERRACE_Y, 0.55, 'green'],
      [4.5, -1.4, TERRACE_Y, 0.45, 'green'],
      [-4.8, -1.6, TERRACE_Y, 0.5, 'green'],
      [-8.6, -2.4, TERRACE_Y, 0.6, 'green'],
      [-7.6, -7.0, TERRACE_Y, 0.5, 'pink'],
      [7.7, -3.8, TERRACE_Y, 0.55, 'green'],
      [2.5, -8.7, TERRACE_Y, 0.5, 'green'],
      [-3.8, -6.6, TERRACE_Y, 0.42, 'green'],
      [9.3, 4.9, FRONT_Y, 0.48, 'amber'],
      [-9.6, 9.2, FRONT_Y, 0.7, 'green'],
      [9.6, 9.4, FRONT_Y, 0.65, 'green'],
      [-9.8, 7.9, FRONT_Y, 0.5, 'pink'],
      [9.7, 7.6, FRONT_Y, 0.55, 'green'],
    ];
    bushes.forEach((b, i) => bush(this.root, b[0], b[1], b[2], b[3], b[4], 500 + i));

    // rocks at path edges, corners, and around the trees
    const rocks = [
      [-2.15, 4.35, FRONT_Y, 1.0, 1],
      [2.2, 3.35, FRONT_Y, 0.9, 2],
      [2.05, 7.6, FRONT_Y, 0.75, 3],
      [-3.1, 7.75, FRONT_Y, 0.8, 4],
      [-9.45, 7.8, FRONT_Y, 1.2, 5],
      [9.5, 7.7, FRONT_Y, 1.15, 6],
      [-8.9, 2.5, FRONT_Y, 0.9, 7],
      [7.9, -1.7, TERRACE_Y, 1.0, 8],
      [5.3, -3.7, TERRACE_Y, 0.8, 9],
      [-5.5, -3.2, TERRACE_Y, 1.1, 10],
      [-9.0, -6.0, TERRACE_Y, 1.0, 11],
      [4.0, 8.3, FRONT_Y, 0.65, 12],
      [-1.4, 9.15, FRONT_Y, 0.6, 13],
      [1.35, 9.5, FRONT_Y, 0.55, 14],
    ];
    rocks.forEach((r) => rock(this.root, r[0], r[1], r[2], r[3], 700 + r[4], r[4] % 3 === 0));

    // small rock clusters at the base corners
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      rock(this.root, Math.cos(a) * 9.8, Math.sin(a) * 9.5 + 0.5, FRONT_Y, 0.6, 900 + i, i % 2 === 0);
    }

    // grass tufts: courtyard edges and terrace corners
    const grassSpots = [
      [-2.0, 4.0, FRONT_Y], [2.25, 4.2, FRONT_Y], [-1.8, 5.2, FRONT_Y], [1.6, 6.1, FRONT_Y],
      [-2.55, 6.9, FRONT_Y], [2.7, 7.1, FRONT_Y], [-4.2, 7.7, FRONT_Y], [4.1, 7.9, FRONT_Y],
      [-8.6, 5.6, FRONT_Y], [8.7, 5.7, FRONT_Y], [-9.4, 4.0, FRONT_Y], [9.4, 3.4, FRONT_Y],
      [-3.6, 9.4, FRONT_Y], [3.3, 9.5, FRONT_Y], [6.8, 6.2, FRONT_Y], [-7.2, 6.5, FRONT_Y],
      [-5.2, -0.8, TERRACE_Y], [5.1, -0.4, TERRACE_Y], [-9.2, -3.1, TERRACE_Y], [9.2, -3.6, TERRACE_Y],
      [-4.0, -8.6, TERRACE_Y], [3.8, -8.9, TERRACE_Y], [7.8, -8.6, TERRACE_Y], [-8.7, -8.2, TERRACE_Y],
      // a second, closer ring of tufts that softens the path and fence edges
      [-1.45, 3.5, FRONT_Y], [1.9, 5.35, FRONT_Y], [-2.35, 8.2, FRONT_Y], [2.45, 8.55, FRONT_Y],
      [-6.4, 6.1, FRONT_Y], [5.5, 6.7, FRONT_Y], [-8.2, 8.3, FRONT_Y], [8.3, 8.4, FRONT_Y],
      [-9.8, 6.3, FRONT_Y], [9.6, 6.4, FRONT_Y], [-4.6, 2.65, FRONT_Y], [4.8, 3.15, FRONT_Y],
      [0.5, 9.55, FRONT_Y], [-0.9, 9.35, FRONT_Y], [3.9, 2.3, FRONT_Y], [-3.4, 2.4, FRONT_Y],
    ];
    grassSpots.forEach((s, i) => {
      const g = grassTuft(this.root, s[0], s[1], s[2], 1.35 + rnd() * 0.75, 1100 + i, rnd() * 6.28);
      this.grass.push(g);
    });

    // dry little moss seams between stones and along the fence foot
    const mossSpots = [
      [-2.7, 3.4, 0.5, 0.26], [2.4, 6.3, 0.62, 0.3], [-4.3, 5.4, 0.45, 0.23],
      [1.9, 8.0, 0.52, 0.24], [-6.5, 4.4, 0.56, 0.28], [6.5, 5.1, 0.5, 0.25],
      [-8.3, 7.3, 0.6, 0.3], [8.1, 7.4, 0.58, 0.3], [-0.8, 8.8, 0.4, 0.2],
      [4.4, 2.6, 0.46, 0.22], [-4.9, 2.4, 0.48, 0.22],
    ];
    mossSpots.forEach((m, i) => mossPatch(this.root, m[0], m[1], FRONT_Y, m[2], m[3], 1300 + i));

    // scattered pebbles at the courtyard margins and around the stone piles
    const pebbles = new Batcher();
    const pebbleGeo = new THREE.DodecahedronGeometry(1, 0);
    for (let i = 0; i < 58; i++) {
      const x = randRange(rnd, -9.7, 9.7);
      const z = randRange(rnd, 2.9, 9.9);
      if (Math.abs(x) < 1.5 && z > 3.1 && z < 9.2) continue;
      const s = 0.045 + rnd() * 0.075;
      pebbles.add(pebbleGeo, rnd() > 0.35 ? M.stone : M.stoneDark, [x, FRONT_Y + s * 0.55, z], [rnd() * 3, rnd() * 6.28, rnd() * 3], [s, s * 0.65, s * 1.1]);
    }
    pebbles.build(this.root, { cast: false, receive: true });

    // small tied stone piles where the gravel meets the fence
    const pileSpots = [[-3.65, 8.9], [5.55, 7.55], [-8.3, 3.4]];
    pileSpots.forEach((p, pi) => {
      for (let i = 0; i < 4; i++) {
        rock(this.root, p[0] + (rnd() - 0.5) * 0.55, p[1] + (rnd() - 0.5) * 0.4, FRONT_Y, 0.3 + rnd() * 0.18, 1700 + pi * 7 + i, i % 3 === 0);
      }
    });

    // tiny flowers
    const flowerCols = [0xf1cfc2, 0xf5e4bb, 0xe9b7b1, 0xf4efe2];
    for (let i = 0; i < 28; i++) {
      const x = randRange(rnd, -9.3, 9.3);
      const z = randRange(rnd, 2.6, 9.7);
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), toon(pick(rnd, flowerCols)));
      m.position.set(x, FRONT_Y + 0.045, z);
      m.scale.y = 0.6;
      this.root.add(m);
    }
  }

  /* ---------------- buildings and fixtures ---------------- */
  buildBuildings() {
    this.shrine = buildShrine(this.root, { x: 0, y: 0.56, z: -2.6 });
    this.office = buildOffice(this.root, { x: 8.0, y: 0.56, z: -2.0 });
    this.hokora = buildHokora(this.root, { x: -8.2, y: 0.56, z: -4.6 });
    addOutlines(this.shrine.group, { width: 0.014 });
    addOutlines(this.office.group, { width: 0.012 });
    addOutlines(this.hokora.group, { width: 0.01 });
  }

  buildFixtures() {
    // torii
    this.torii = buildTorii(this.root, { x: 0, y: FRONT_Y, z: 6.25, scale: 1.06, ry: 0, plaque: true });
    addOutlines(this.torii, { width: 0.016 });

    // temizuya in the quiet left corner of the courtyard
    this.temizuya = buildTemizuya(this.root, { x: -8.05, y: FRONT_Y, z: 7.15, ry: 0.2 });

    // ema and omikuji on the right
    this.ema = buildEmaRack(this.root, { x: 8.25, y: FRONT_Y, z: 4.9, ry: -0.62 });
    this.omikuji = buildOmikujiRack(this.root, { x: 7.75, y: FRONT_Y, z: 8.15, ry: -0.38 });
    // the hanging strips are thin and full of gaps, so the whole rack gets one
    // generous, invisible tap target
    this.omikuji.hit = mesh(
      new THREE.PlaneGeometry(1.95, 1.8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
      { parent: this.omikuji.group, y: 0.95, z: 0.14, cast: false, receive: false },
    );
    this.notice = buildNoticeBoard(this.root, { x: -5.35, y: FRONT_Y, z: 6.75, ry: 0.25 });

    // stone lanterns, flanking the path and the terrace
    const lanternDefs = [
      { x: -2.95, z: 4.6, y: FRONT_Y, scale: 1.02, withLight: true, ry: 0.2 },
      { x: 2.95, z: 4.6, y: FRONT_Y, scale: 1.02, withLight: true, ry: -0.2 },
      { x: -4.55, z: 1.45, y: TERRACE_Y, scale: 0.78, withLight: false, ry: 0.1 },
      { x: 4.55, z: 1.45, y: TERRACE_Y, scale: 0.78, withLight: false, ry: -0.1 },
      { x: -7.9, z: 4.25, y: FRONT_Y, scale: 0.72, withLight: false, ry: 0.4 },
      { x: 5.2, z: 9.35, y: FRONT_Y, scale: 0.68, withLight: false, ry: -0.3 },
      { x: -5.0, z: 9.15, y: FRONT_Y, scale: 0.62, withLight: false, ry: 0.25 },
    ];
    for (const d of lanternDefs) {
      const l = buildStoneLantern(this.root, d);
      this.lanterns.push(l);
      const pool = this.makeLightPool(d.x, d.y + 0.02, d.z, d.scale);
      this.pools.push(pool);
      if (d.withLight) this.fireflyLights.push(l.point);
    }

    // hanging festival lanterns on a rope beside the path
    const postA = new THREE.Vector3(4.15, FRONT_Y, 4.5);
    const postB = new THREE.Vector3(4.9, FRONT_Y, 5.9);
    const ropeGroup = new THREE.Group();
    this.root.add(ropeGroup);
    for (const p of [postA, postB]) {
      mesh(new THREE.CylinderGeometry(0.055, 0.06, 2.75, 6), M.woodDark, { parent: ropeGroup, x: p.x, y: p.y + 1.375, z: p.z, cast: true });
      mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 6), M.stone, { parent: ropeGroup, x: p.x, y: p.y + 0.05, z: p.z, cast: false });
    }
    const a = new THREE.Vector3(postA.x, postA.y + 2.68, postA.z);
    const b = new THREE.Vector3(postB.x, postB.y + 2.68, postB.z);
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.25, 0));
    braidedRope(ropeGroup, [a, mid, b], 0.018, { strands: 2, twist: 12, segments: 28 });
    this.stringLanterns = [];
    for (const t of [0.18, 0.5, 0.82]) {
      const p = new THREE.Vector3().lerpVectors(a, mid, t * 2);
      if (t > 0.5) p.lerpVectors(mid, b, (t - 0.5) * 2);
      const l = buildHangingLantern(ropeGroup, { x: p.x, y: p.y - 0.02, z: p.z, scale: 0.55 });
      this.stringLanterns.push(l);
    }

    // small wooden signpost at the walk edge (no cloth banners: they read as
    // modern festoon flags rather than part of this quiet shrine courtyard)
    this.banners = [];

    // small wooden bench on the terrace edge
    const bench = new THREE.Group();
    bench.position.set(-5.9, TERRACE_Y, 1.8);
    bench.rotation.y = 0.35;
    this.root.add(bench);
    for (let i = 0; i < 3; i++) {
      mesh(new THREE.BoxGeometry(1.3, 0.06, 0.16), M.wood, { parent: bench, x: 0, y: 0.4, z: -0.22 + i * 0.2, cast: true });
    }
    for (const s of [-1, 1]) {
      mesh(new THREE.BoxGeometry(0.1, 0.38, 0.55), M.woodDark, { parent: bench, x: s * 0.55, y: 0.2, z: 0, cast: true });
    }
  }

  makeLightPool(x, y, z, scale = 1) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex('glow.webp'),
      color: 0xffc477,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const m = mesh(new THREE.PlaneGeometry(2.6 * scale, 2.6 * scale), mat, {
      parent: this.root,
      x,
      y: y + 0.05,
      z,
      rx: -Math.PI / 2,
      cast: false,
      receive: false,
    });
    return m;
  }

  /* ---------------- particles ---------------- */
  buildParticles() {
    const petalCols = [0xe8b6ad, 0xdca09e, 0xf1cdc0, 0xd9b08d, 0xc89583, 0xbc8a4c, 0x94a06a];
    const petalGeo = new THREE.PlaneGeometry(0.14, 0.095);
    const petalMats = petalCols.map((c) => toon(c, { side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
    // fallen debris that Reimu can sweep around; thicker under the cherry trees
    for (let i = 0; i < 56; i++) {
      const underCherry = i % 3 === 0;
      const cx = i % 2 ? -7.5 : 6.7;
      const cz = i % 2 ? 4.7 : 4.1;
      const x = underCherry ? cx + randRange(this.rnd, -2.2, 2.2) : randRange(this.rnd, -4.2, 4.2);
      const z = underCherry ? cz + randRange(this.rnd, -1.7, 1.7) : randRange(this.rnd, 2.9, 8.8);
      const m = mesh(petalGeo, petalMats[i % petalMats.length], {
        parent: this.root,
        x,
        y: this.groundY(x, z) + 0.018,
        z,
        rx: -Math.PI / 2,
        ry: this.rnd() * 6.28,
        cast: false,
        receive: false,
      });
      m.scale.setScalar(0.8 + this.rnd() * 0.8);
      this.debris.push({ mesh: m, vx: 0, vz: 0, baseY: FRONT_Y + 0.022 });
    }

    // a few drifts where Reimu works, so her broom visibly moves something
    const drifts = [
      [1.9, 7.6], [1.2, 7.4], [2.3, 6.9], [1.5, 6.7], [2.4, 7.9],
      [0.9, 7.9], [2.8, 7.2], [1.0, 6.6], [2.0, 8.2], [1.4, 8.0],
      [-1.9, 8.3], [-2.4, 7.8], [-1.4, 7.7],
    ];
    drifts.forEach(([x, z], i) => {
      const m = mesh(petalGeo, petalMats[i % petalMats.length], {
        parent: this.root,
        x,
        y: this.groundY(x, z) + 0.018,
        z,
        rx: -Math.PI / 2,
        ry: this.rnd() * 6.28,
        cast: false,
        receive: false,
      });
      m.scale.setScalar(0.85 + this.rnd() * 0.5);
      this.debris.push({ mesh: m, vx: 0, vz: 0, baseY: FRONT_Y + 0.022 });
    });

    // visible drifting petals and leaves. Every particle is born at the
    // canopy of a real tree, so nothing appears to grow out of the roof/air.
    const petalMap = tex('petal.webp');
    const leafMap = tex('leaf.webp');
    const petalMat = new THREE.MeshBasicMaterial({
      map: petalMap,
      transparent: true,
      opacity: 0.9,
      alphaTest: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const leafMat = new THREE.MeshBasicMaterial({
      map: leafMap,
      transparent: true,
      opacity: 0.86,
      alphaTest: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const fallPetalGeo = new THREE.PlaneGeometry(0.62, 0.52);
    const fallLeafGeo = new THREE.PlaneGeometry(0.56, 0.44);
    const petalTints = [0xf3c9c0, 0xe7b1aa, 0xf8ddd2, 0xdca09e, 0xeac5b2];
    const leafTints = [0xb4813e, 0xc39853, 0x9b7248, 0xd0a75c];
    const pineTints = [0x5b704b, 0x6f8558, 0x4c6244];

    this.root.updateMatrixWorld(true);
    const centers = this.trees.map((tr) => {
      const c = new THREE.Vector3();
      tr.canopy.getWorldPosition(c);
      return c;
    });
    const petalData = [];
    const leafData = [];
    for (let i = 0; i < 128; i++) {
      const ti = i % this.trees.length;
      const tr = this.trees[ti];
      const c = centers[ti];
      const spread = Math.max(1.1, (tr.radius || 2.2) * 0.55);
      const isLeaf = tr.kind !== 'cherry';
      const px = c.x + randRange(this.rnd, -spread, spread);
      const pz = c.z + randRange(this.rnd, -spread, spread);
      const yTop = Math.max(0.85, c.y - 0.25 - this.rnd() * 1.0);
      const d = {
        x0: Math.max(-10.15, Math.min(10.15, px)),
        z0: Math.max(-10.15, Math.min(10.15, pz)),
        yTop,
        fallDist: Math.max(0.9, yTop - 0.6),
        phase: this.rnd(),
        // ~5 seconds from crown to ground: the old 0.03–0.06 rate took 20s+
        // and read as leaves hanging in the air
        fall: 0.14 + this.rnd() * 0.1,
        radius: 0.34 + this.rnd() * 0.52,
        swayFreq: 1.15 + this.rnd() * 0.95,
        flutter: 0.05 + this.rnd() * 0.08,
        flutterFreq: 1.7 + this.rnd() * 1.5,
        spinA: this.rnd() * 1.6,
        spinB: this.rnd() * 1.2,
        scale: isLeaf ? 0.75 + this.rnd() * 0.45 : 0.9 + this.rnd() * 0.5,
        isLeaf,
      };
      if (isLeaf) {
        const tints = tr.kind === 'pine' ? pineTints : leafTints;
        leafData.push({ d, tint: tints[i % tints.length] });
      } else {
        petalData.push({ d, tint: petalTints[i % petalTints.length] });
      }
    }

    const petalIM = new THREE.InstancedMesh(fallPetalGeo, petalMat, petalData.length);
    const leafIM = new THREE.InstancedMesh(fallLeafGeo, leafMat, leafData.length);
    petalIM.frustumCulled = false;
    leafIM.frustumCulled = false;
    petalIM.renderOrder = 4;
    leafIM.renderOrder = 4;
    const seedDummy = new THREE.Object3D();
    const fill = (list, im) => {
      list.forEach(({ d, tint }, k) => {
        seedDummy.position.set(d.x0, d.yTop, d.z0);
        seedDummy.rotation.set(d.phase * 6, d.phase * 3, 0);
        seedDummy.scale.setScalar(d.scale);
        seedDummy.updateMatrix();
        im.setMatrixAt(k, seedDummy.matrix);
        im.setColorAt(k, new THREE.Color(tint));
      });
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    };
    fill(petalData, petalIM);
    fill(leafData, leafIM);
    this.falling = {
      petalIM,
      leafIM,
      data: [...petalData.map((x) => x.d), ...leafData.map((x) => x.d)],
    };
    this.root.add(petalIM, leafIM);

    /* ---- one-shot burst pool: shaken trees shed leaves through this ---- */
    const burstIM = new THREE.InstancedMesh(fallLeafGeo, leafMat, 48);
    burstIM.frustumCulled = false;
    burstIM.renderOrder = 4;
    burstIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const burstTints = [0xb4813e, 0xc39853, 0xd0a75c, 0x9b7248, 0x8a9a63, 0xdba86a];
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < 48; i++) {
      burstIM.setColorAt(i, new THREE.Color(burstTints[i % burstTints.length]));
      burstIM.setMatrixAt(i, hidden);
    }
    if (burstIM.instanceColor) burstIM.instanceColor.needsUpdate = true;
    this.root.add(burstIM);
    this.burst = { im: burstIM, parts: [] };

    const spawnFrom = new THREE.Vector3();
    this.burstLeaves = (tree, count = 16) => {
      if (!this.burst) return;
      tree.canopy.getWorldPosition(spawnFrom);
      const spread = Math.max(0.5, (tree.radius || 2) * 0.42);
      for (let n = 0; n < count; n++) {
        if (this.burst.parts.length >= 48) {
          // recycle the oldest burst leaf once the pool is full
          this.burst.parts.shift();
        }
        const a = this.rnd() * Math.PI * 2;
        const rr = spread * (0.15 + this.rnd() * 0.85);
        this.burst.parts.push({
          x: spawnFrom.x + Math.cos(a) * rr,
          y: spawnFrom.y + (this.rnd() - 0.45) * spread * 0.8,
          z: spawnFrom.z + Math.sin(a) * rr,
          vx: Math.cos(a) * (0.5 + this.rnd() * 0.9),
          vy: 0.15 + this.rnd() * 0.55,
          vz: Math.sin(a) * (0.5 + this.rnd() * 0.9),
          rx: this.rnd() * 6.28,
          ry: this.rnd() * 6.28,
          rz: this.rnd() * 6.28,
          spin: 2.2 + this.rnd() * 3.4,
          life: 0,
          max: 2.1 + this.rnd() * 1.1,
          scale: 0.7 + this.rnd() * 0.45,
        });
      }
    };

    // faint spirit motes
    const moteMatBase = new THREE.SpriteMaterial({
      map: tex('glow.webp'),
      color: 0xfff0c8,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 24; i++) {
      const mat = moteMatBase.clone();
      const s = new THREE.Sprite(mat);
      s.scale.setScalar(0.1 + this.rnd() * 0.16);
      const x = randRange(this.rnd, -8, 8);
      const z = randRange(this.rnd, -6, 9);
      s.position.set(x, randRange(this.rnd, 0.4, 4.2), z);
      this.root.add(s);
      this.motes.push({
        sprite: s,
        mat,
        x,
        z,
        y: s.position.y,
        phase: this.rnd() * 6.28,
        speed: 0.08 + this.rnd() * 0.14,
      });
    }
  }

  buildShadow() {
    const mat = new THREE.MeshBasicMaterial({
      map: tex('soft-shadow.webp'),
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      color: 0x1d2a24,
    });
    const plane = mesh(new THREE.PlaneGeometry(1, 1), mat, {
      parent: this.root,
      y: -1.55,
      rx: -Math.PI / 2,
      cast: false,
      receive: false,
    });
    plane.scale.set(27, 27, 1);
    plane.renderOrder = -2;
    this.baseShadow = plane;
  }

  /* ---------------- queries ---------------- */
  groundY(x, z) {
    if (z < TERRACE_FRONT_Z - 0.02 && Math.abs(x) < HALF - 0.2) return TERRACE_Y;
    if (z < STEP_TOP_Z) {
      // stone steps down from the terrace
      if (Math.abs(x) < 2.85) return 0.1 + Math.max(0, (STEP_TOP_Z - z) / (STEP_TOP_Z - TERRACE_FRONT_Z)) * 0.45;
      return FRONT_Y;
    }
    // the path slabs sit a few centimetres above the gravel
    if (z > 2.35 && z < 10.6) {
      const cx = Math.sin((z - 3.0) * 0.35) * 0.09;
      // main slabs plus the occasional split half-slab at the edge
      if (Math.abs(x - cx) < 1.16) return FRONT_Y + 0.056;
    }
    return FRONT_Y;
  }

  pushDebris(x, z, dirX, dirZ, strength = 1.2, radius = 1.9) {
    for (const d of this.debris) {
      const dx = d.mesh.position.x - x;
      const dz = d.mesh.position.z - z;
      const dist = Math.hypot(dx, dz);
      if (dist > radius) continue;
      const f = (1 - dist / radius) * strength;
      const nx = dist > 0.001 ? dx / dist : 0.3;
      const nz = dist > 0.001 ? dz / dist : 0.3;
      d.vx += dirX * f + nx * f * 0.34;
      d.vz += dirZ * f + nz * f * 0.34;
    }
  }

  update(t, night, dt) {
    const clamped = Math.min(dt, 0.05);
    for (const tr of this.trees) tr.sway(t, 1);
    // the paper streamers on the gate move independently in the same breeze
    if (this.torii?.userData?.shide) {
      for (const s of this.torii.userData.shide) {
        s.pivot.rotation.z = Math.sin(t * 1.35 + s.phase) * 0.2;
        s.pivot.rotation.x = Math.sin(t * 1.02 + s.phase * 1.7) * 0.12;
      }
    }
    this.shrine.update(t, night, dt);
    this.office.update(t, night);
    this.hokora.update(t, night);

    for (const g of this.grass) {
      g.rotation.z = Math.sin(t * 1.2 + g.userData.phase) * 0.09;
      g.rotation.x = Math.sin(t * 0.9 + g.userData.phase * 1.7) * 0.05;
    }
    // wishing plaques breathe in the same breeze as the shide
    for (const p of this.ema.plaques) {
      p.pivot.rotation.x = Math.sin(t * 1.22 + p.phase) * 0.13;
      p.pivot.rotation.z = Math.sin(t * 0.86 + p.phase * 1.7) * 0.09;
    }

    // lanterns / windows / ground pools
    for (const l of this.lanterns) {
      const flick = 0.86 + 0.14 * Math.sin(t * 3.7 + l.chamberY * 7.1) * Math.sin(t * 1.3 + 2.2);
      l.windows.forEach((m) => (m.emissiveIntensity = night * 0.95 * flick));
      l.glow.material.opacity = night * 0.24 * flick;
      if (l.point) l.point.intensity = night * 1.15 * flick;
    }
    for (const p of this.pools) p.material.opacity = night * 0.2;
    for (const l of this.stringLanterns) l.update(t, night);
    this.temizuya.water.material.opacity = 0.82 + Math.sin(t * 0.8) * 0.03;

    if (this.falling) {
      const dummy = this._fallDummy || (this._fallDummy = new THREE.Object3D());
      let pi = 0;
      let li = 0;
      for (const d of this.falling.data) {
        const drop = ((t * d.fall + d.phase) % 1 + 1) % 1;
        // fade in under the crown and out just above the ground, so a leaf never
        // pops when its loop restarts
        const edge = Math.min(1, drop / 0.1) * Math.min(1, (1 - drop) / 0.12);
        const swayX = Math.sin(t * d.swayFreq + d.phase * 6.28) * d.radius * (0.55 + drop * 0.45);
        const swayZ = Math.cos(t * d.swayFreq * 0.78 + d.phase * 5.1) * d.radius * 0.62;
        dummy.position.set(
          d.x0 + swayX,
          d.yTop - drop * d.fallDist + Math.sin(t * d.flutterFreq + d.phase * 4.4) * d.flutter,
          d.z0 + swayZ,
        );
        dummy.rotation.set(
          d.phase * 6 + t * d.spinA * 2.2,
          d.phase * 3 + t * d.spinB * 1.8,
          Math.sin(t * 1.5 + d.phase * 4) * 1.05,
        );
        dummy.scale.setScalar(d.scale * Math.max(0, Math.min(1, edge * 1.35)));
        dummy.updateMatrix();
        if (d.isLeaf) {
          this.falling.leafIM.setMatrixAt(li++, dummy.matrix);
        } else {
          this.falling.petalIM.setMatrixAt(pi++, dummy.matrix);
        }
      }
      this.falling.petalIM.instanceMatrix.needsUpdate = true;
      this.falling.leafIM.instanceMatrix.needsUpdate = true;
    }

    // leaves knocked loose by a shaken tree
    if (this.burst) {
      const dummy = this._fallDummy || (this._fallDummy = new THREE.Object3D());
      const im = this.burst.im;
      const keep = [];
      for (const p of this.burst.parts) {
        p.life += dt;
        if (p.life >= p.max) continue;
        p.vy -= 4.2 * dt;
        const drag = Math.exp(-dt * 1.15);
        p.vx *= drag;
        p.vz *= drag;
        p.x += p.vx * dt + Math.sin(p.life * 5.5 + p.ry) * 0.3 * dt;
        p.z += p.vz * dt + Math.cos(p.life * 4.5 + p.rx) * 0.3 * dt;
        p.y += p.vy * dt;
        p.rx += p.spin * dt;
        p.rz += p.spin * 0.65 * dt;
        if (p.y < 0.62) {
          p.y = 0.62;
          p.vy *= -0.12;
          p.vx *= 0.8;
          p.vz *= 0.8;
        }
        keep.push(p);
      }
      this.burst.parts = keep;
      for (let i = 0; i < 48; i++) {
        const p = keep[i];
        if (!p) {
          dummy.position.set(0, -99, 0);
          dummy.scale.setScalar(0.0001);
          dummy.rotation.set(0, 0, 0);
        } else {
          const k = p.life / p.max;
          const edge = Math.min(1, p.life / 0.12) * Math.min(1, (1 - k) / 0.18);
          dummy.position.set(p.x, p.y, p.z);
          dummy.rotation.set(p.rx, p.ry, p.rz);
          dummy.scale.setScalar(p.scale * Math.max(0, edge));
        }
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    }

    for (const m of this.motes) {
      m.sprite.position.x = m.x + Math.sin(t * 0.17 + m.phase) * 0.55;
      m.sprite.position.z = m.z + Math.cos(t * 0.13 + m.phase * 1.7) * 0.55;
      m.sprite.position.y = m.y + Math.sin(t * 0.24 + m.phase * 2.1) * 0.28;
      m.mat.opacity = night * (0.24 + 0.12 * Math.sin(t * 0.9 + m.phase)) + 0.035;
    }

    // debris physics
    for (const d of this.debris) {
      if (Math.abs(d.vx) > 0.001 || Math.abs(d.vz) > 0.001) {
        d.mesh.position.x += d.vx * clamped;
        d.mesh.position.z += d.vz * clamped;
        d.mesh.position.x = THREE.MathUtils.clamp(d.mesh.position.x, -9.6, 9.6);
        d.mesh.position.z = THREE.MathUtils.clamp(d.mesh.position.z, 2.4, 9.9);
        d.mesh.position.y = this.groundY(d.mesh.position.x, d.mesh.position.z) + 0.018;
        d.mesh.rotation.z += Math.hypot(d.vx, d.vz) * clamped * 0.8;
        const damp = Math.pow(0.015, clamped);
        d.vx *= damp;
        d.vz *= damp;
        if (Math.hypot(d.vx, d.vz) < 0.012) {
          d.vx = 0;
          d.vz = 0;
        }
      }
    }
  }
}
