import * as THREE from 'three';
import {
  M,
  C,
  Batcher,
  mesh,
  rbox,
  box,
  cyl,
  toon,
  textTexture,
  tex,
  seeded,
  randRange,
  gradientMap,
} from '../palette.js';
import { buildGableRoof } from './roof.js';

const YAXIS = new THREE.Vector3(0, 1, 0);

function flatSign(texture, w, h, opts = {}) {
  const { x = 0, y = 0, z = 0, ry = 0, rx = 0, parent, double = false } = opts;
  const mat = new THREE.MeshToonMaterial({
    map: texture,
    color: 0xffffff,
    gradientMap: M.red.gradientMap,
    side: double ? THREE.DoubleSide : THREE.FrontSide,
    emissive: 0x2b1b0d,
    emissiveIntensity: 0.35,
  });
  return mesh(new THREE.PlaneGeometry(w, h), mat, { x, y, z, ry, rx, parent, cast: false, receive: false });
}

/* ------------------------------------------------------------------ */
/* Braided rope                                                        */
/* ------------------------------------------------------------------ */
export function braidedRope(parent, points, radius, opts = {}) {
  const { strands = 3, color = M.rope, core = M.ropeDark, segments = 64, twist = 20, radial = 5 } = opts;
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))));
  const frames = curve.computeFrenetFrames(segments, false);
  const coreGeo = new THREE.TubeGeometry(curve, segments, radius * 0.82, radial + 2, false);
  const coreMesh = mesh(coreGeo, core, { parent, cast: true, receive: true });
  coreMesh.name = 'rope-core';
  for (let s = 0; s < strands; s++) {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = curve.getPointAt(t);
      const n = frames.normals[Math.min(i, segments)];
      const b = frames.binormals[Math.min(i, segments)];
      const a = t * Math.PI * 2 * (twist / 8) + (s / strands) * Math.PI * 2;
      p.addScaledVector(n, Math.cos(a) * radius * 0.34);
      p.addScaledVector(b, Math.sin(a) * radius * 0.34);
      pts.push(p);
    }
    const strandCurve = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.TubeGeometry(strandCurve, segments, radius * 0.4, radial, false);
    mesh(g, color, { parent, cast: true, receive: true });
  }
  return curve;
}

/* ------------------------------------------------------------------ */
/* Shide (folded paper streamers)                                       */
/* ------------------------------------------------------------------ */
export function buildShide(parent, opts = {}) {
  const { x = 0, y = 0, z = 0, scale = 1, phase = 0, ry = 0 } = opts;
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  pivot.rotation.y = ry;
  parent.add(pivot);
  const shape = new THREE.Shape();
  const w = 0.13 * scale;
  const h = 0.62 * scale;
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, -h * 0.26);
  shape.lineTo(-w * 0.28, -h * 0.34);
  shape.lineTo(w / 2, -h * 0.42);
  shape.lineTo(-w * 0.28, -h * 0.52);
  shape.lineTo(w / 2, -h * 0.6);
  shape.lineTo(w / 2, -h * 0.66);
  shape.lineTo(-w / 2, -h * 0.66);
  shape.lineTo(-w / 2, -h * 0.58);
  shape.lineTo(w * 0.05, -h * 0.5);
  shape.lineTo(-w / 2, -h * 0.4);
  shape.lineTo(w * 0.05, -h * 0.3);
  shape.lineTo(-w / 2, -h * 0.2);
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape, 4);
  const mat = toon(0xf6efdd, { side: THREE.DoubleSide, emissive: 0x55483a, emissiveIntensity: 0.25 });
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  pivot.add(m);
  return { pivot, phase, base: 0 };
}

/* ------------------------------------------------------------------ */
/* Torii                                                               */
/* ------------------------------------------------------------------ */
export function buildTorii(parent, opts = {}) {
  const { x = 0, y = 0, z = 0, ry = 0, scale = 1, plaque = true } = opts;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = ry;
  parent.add(root);
  const batch = new Batcher();
  const W = 5.7 * scale;
  const H = 4.35 * scale;
  const colX = W / 2 - 0.45 * scale;
  const pillarR = 0.23 * scale;

  for (const s of [-1, 1]) {
    batch.add(new THREE.CylinderGeometry(pillarR * 0.86, pillarR, H, 14), M.vermilion ?? M.red, [s * colX, H / 2, 0]);
    // black stone foot with a chamfered plinth
    batch.add(new THREE.CylinderGeometry(pillarR * 1.55, pillarR * 1.7, 0.3 * scale, 12), M.stoneDark, [s * colX, 0.15 * scale, 0]);
    batch.add(new THREE.CylinderGeometry(pillarR * 1.3, pillarR * 1.4, 0.16 * scale, 12), M.stone, [s * colX, 0.34 * scale, 0]);
    // subtle base band
    batch.add(new THREE.CylinderGeometry(pillarR * 1.05, pillarR * 1.05, 0.08 * scale, 14), M.redDark, [s * colX, 0.44 * scale, 0]);
  }

  // nuki (lower cross beam)
  batch.box(M.red, W + 0.42 * scale, 0.23 * scale, 0.2 * scale, 0, 3.02 * scale, 0);
  for (const s of [-1, 1]) {
    batch.box(M.redDark, 0.18 * scale, 0.27 * scale, 0.26 * scale, s * (W / 2 + 0.23 * scale), 3.02 * scale, 0);
    // wedge under nuki
    batch.box(M.redDark, 0.16 * scale, 0.45 * scale, 0.17 * scale, s * colX, 3.32 * scale, 0);
  }

  // curved kasagi + shimaki
  const curveBeam = (len, baseY, h, d, upturn, mat, segments = 32) => {
    for (let i = 0; i < segments; i++) {
      const x0 = -len / 2 + (i / segments) * len;
      const x1 = -len / 2 + ((i + 1) / segments) * len;
      const xm = (x0 + x1) / 2;
      const t = Math.abs(xm) / (len / 2);
      const y0 = baseY + Math.pow(t, 2.6) * upturn;
      const y1 = baseY + Math.pow(Math.abs(x1) / (len / 2), 2.6) * upturn;
      const ang = Math.atan2(y1 - y0, x1 - x0);
      batch.box(mat, (len / segments) * 1.02, h, d, xm, (y0 + y1) / 2, 0, 0, 0, ang);
    }
  };
  curveBeam(W + 1.0 * scale, 4.62 * scale, 0.2 * scale, 0.38 * scale, 0.24 * scale, M.redDark);
  curveBeam(W + 0.86 * scale, 4.47 * scale, 0.2 * scale, 0.3 * scale, 0.2 * scale, M.red);
  // dark capping course on top of the kasagi, like the reference gate
  curveBeam(W + 1.0 * scale, 4.75 * scale, 0.075 * scale, 0.2 * scale, 0.24 * scale, M.roofDark, 32);

  // central strut / plaque support
  batch.box(M.red, 0.24 * scale, 1.35 * scale, 0.18 * scale, 0, 3.88 * scale, 0);
  batch.box(M.redDark, 0.5 * scale, 0.12 * scale, 0.24 * scale, 0, 3.55 * scale, 0);

  // little copper caps at the tips
  for (const s of [-1, 1]) {
    batch.add(new THREE.BoxGeometry(0.15 * scale, 0.28 * scale, 0.42 * scale), M.brass, [s * (W / 2 + 0.52 * scale), 4.86 * scale, 0]);
  }

  batch.build(root);

  if (plaque) {
    const t = textTexture(['博', '麗', '神', '社'], {
      w: 220,
      h: 340,
      bg: '#231e19',
      fg: '#efd49a',
      border: '#caaa63',
      borderWidth: 12,
      font: '700 68px "Yu Mincho", "MS Mincho", serif',
      vertical: true,
      radius: 4,
    });
    const board = new THREE.Group();
    // sit proud of the central strut so the face is never swallowed by it
    board.position.set(0, 4.18 * scale, 0.2 * scale);
    board.scale.setScalar(0.82);
    root.add(board);
    const back = box(0.94 * scale, 1.32 * scale, 0.12 * scale, M.woodDeep, { parent: board, cast: true });
    back.position.z = -0.06 * scale;
    // a real lacquered frame, not just a floating texture
    box(1.06 * scale, 0.08 * scale, 0.16 * scale, M.woodDark, { parent: board, y: 0.68 * scale, z: 0.01 * scale, cast: true });
    box(1.06 * scale, 0.08 * scale, 0.16 * scale, M.woodDark, { parent: board, y: -0.68 * scale, z: 0.01 * scale, cast: true });
    for (const s of [-1, 1]) {
      box(0.08 * scale, 1.42 * scale, 0.16 * scale, M.woodDark, {
        parent: board,
        x: s * 0.49 * scale,
        z: 0.01 * scale,
        cast: true,
      });
      box(0.035 * scale, 1.34 * scale, 0.175 * scale, M.brass, {
        parent: board,
        x: s * 0.445 * scale,
        z: 0.02 * scale,
        cast: false,
      });
    }
    box(1.14 * scale, 0.1 * scale, 0.3 * scale, M.roofDark, { parent: board, y: 0.78 * scale, z: 0.0, cast: true });
    const mat = new THREE.MeshToonMaterial({
      map: t,
      color: 0xffffff,
      emissive: 0x2a1d0d,
      emissiveIntensity: 0.3,
      gradientMap: M.red.gradientMap,
    });
    const face = mesh(new THREE.PlaneGeometry(0.82 * scale, 1.24 * scale), mat, {
      parent: board,
      z: 0.075 * scale,
      cast: false,
    });
    face.renderOrder = 2;
    // the back is a plain finished panel rather than an open box
    const backFace = mesh(new THREE.PlaneGeometry(0.82 * scale, 1.24 * scale), M.woodDark, {
      parent: board,
      z: -0.125 * scale,
      ry: Math.PI,
      cast: false,
    });
    backFace.renderOrder = 2;
  }

  // slim shimenawa slung between the pillars, with four folded shide
  const ropeY = 2.82 * scale;
  const ropePts = [
    new THREE.Vector3(-colX + 0.14 * scale, ropeY, -0.04 * scale),
    new THREE.Vector3(-2.25 * scale, ropeY - 0.12 * scale, -0.02 * scale),
    new THREE.Vector3(-1.15 * scale, ropeY - 0.3 * scale, 0.0),
    new THREE.Vector3(0, ropeY - 0.4 * scale, 0.0),
    new THREE.Vector3(1.15 * scale, ropeY - 0.3 * scale, 0.0),
    new THREE.Vector3(2.25 * scale, ropeY - 0.12 * scale, -0.02 * scale),
    new THREE.Vector3(colX - 0.14 * scale, ropeY, -0.04 * scale),
  ];
  braidedRope(root, ropePts, 0.04 * scale, { strands: 3, segments: 52, twist: 26, radial: 5 });
  const shide = [];
  for (let i = 0; i < 4; i++) {
    const sx = (-1.62 + i * 1.08) * scale;
    const yy = ropeY - 0.36 * scale - Math.abs(sx / scale) * 0.035 * scale;
    shide.push(buildShide(root, {
      x: sx,
      y: yy,
      z: -0.03 * scale,
      scale: 0.92 * scale,
      phase: i * 1.7,
      ry: 0,
    }));
  }
  root.userData.shide = shide;

  // small moss at the feet
  const rnd = seeded(31);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), M.moss);
      g.scale.set(1, 0.35, 1);
      g.position.set(s * colX + randRange(rnd, -0.4, 0.4), 0.04, randRange(rnd, -0.35, 0.35));
      g.receiveShadow = true;
      root.add(g);
    }
  }

  return root;
}

/* ------------------------------------------------------------------ */
/* Stone lantern                                                       */
/* ------------------------------------------------------------------ */
export function buildStoneLantern(parent, opts = {}) {
  const { x = 0, y = 0, z = 0, scale = 1, ry = 0, withLight = false } = opts;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = ry;
  parent.add(root);
  const batch = new Batcher();
  const s = scale;
  const stone = M.stone;
  const stoneDark = M.stoneDark;

  // base
  batch.add(new THREE.CylinderGeometry(0.42 * s, 0.5 * s, 0.16 * s, 6), stoneDark, [0, 0.08 * s, 0], [0, Math.PI / 6, 0]);
  batch.add(new THREE.CylinderGeometry(0.32 * s, 0.4 * s, 0.15 * s, 6), stone, [0, 0.23 * s, 0], [0, Math.PI / 6, 0]);
  // shaft
  batch.add(new THREE.CylinderGeometry(0.115 * s, 0.15 * s, 1.1 * s, 8), stone, [0, 0.85 * s, 0]);
  batch.add(new THREE.CylinderGeometry(0.2 * s, 0.2 * s, 0.08 * s, 8), stoneDark, [0, 1.4 * s, 0]);
  batch.add(new THREE.CylinderGeometry(0.3 * s, 0.25 * s, 0.13 * s, 6), stone, [0, 1.5 * s, 0], [0, Math.PI / 6, 0]);
  // light chamber: six stone corner posts around a glowing core, so the light
  // reads as coming from inside the lantern from every viewing angle
  const chamberY = 1.73 * s;
  // windows: six small glowing openings
  const windowMat = toon(0xf1e2bf, { emissive: 0xffb15c, emissiveIntensity: 0 });
  const core = mesh(new THREE.CylinderGeometry(0.2 * s, 0.21 * s, 0.38 * s, 6), windowMat, {
    y: chamberY,
    parent: root,
    cast: false,
  });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const px = Math.cos(a) * 0.285 * s;
    const pz = Math.sin(a) * 0.285 * s;
    batch.add(new THREE.CylinderGeometry(0.034 * s, 0.04 * s, 0.42 * s, 4), stone, [px, chamberY, pz], [0, -a, 0]);
  }
  // roof: flared hexagonal cap with a ridge
  batch.add(new THREE.ConeGeometry(0.52 * s, 0.3 * s, 6), stoneDark, [0, 2.08 * s, 0], [0, Math.PI / 6, 0]);
  batch.add(new THREE.CylinderGeometry(0.36 * s, 0.42 * s, 0.06 * s, 6), stone, [0, 1.99 * s, 0], [0, Math.PI / 6, 0]);
  batch.add(new THREE.CylinderGeometry(0.06 * s, 0.08 * s, 0.2 * s, 8), stoneDark, [0, 2.28 * s, 0]);
  batch.add(new THREE.IcosahedronGeometry(0.1 * s, 1), stone, [0, 2.4 * s, 0]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const px = Math.cos(a) * 0.48 * s;
    const pz = Math.sin(a) * 0.48 * s;
    batch.box(stoneDark, 0.09 * s, 0.12 * s, 0.18 * s, px, 2.02 * s, pz, -a, 0, 0);
  }

  const windows = [windowMat];
  batch.build(root);

  // little moss
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 * s, 1), M.moss);
    m.scale.set(1.2, 0.32, 1);
    m.position.set(Math.cos(a) * 0.36 * s, 0.02, Math.sin(a) * 0.36 * s);
    m.receiveShadow = true;
    root.add(m);
  }

  // additive glow sprite, switched on at night
  const glowTex = tex('glow.png');
  const glowMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: 0xffc978,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(1.9 * s, 1.9 * s, 1);
  glow.position.y = chamberY;
  root.add(glow);

  let point = null;
  if (withLight) {
    point = new THREE.PointLight(0xffbd75, 0, 7.5, 2);
    point.position.set(0, chamberY, 0);
    point.castShadow = false;
    root.add(point);
  }

  return { group: root, windows, glow, point, chamberY: chamberY + y };
}

/* ------------------------------------------------------------------ */
/* Temizuya (purification pavilion)                                    */
/* ------------------------------------------------------------------ */
export function buildTemizuya(parent, opts = {}) {
  const { x = 0, y = 0, z = 0, ry = 0 } = opts;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = ry;
  parent.add(root);
  const batch = new Batcher();

  const W = 3.0;
  const D = 2.2;
  const postH = 2.15;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      batch.add(new THREE.CylinderGeometry(0.1, 0.12, postH, 8), M.woodDark, [sx * (W / 2 - 0.16), postH / 2, sz * (D / 2 - 0.16)]);
      batch.add(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 8), M.stoneDark, [sx * (W / 2 - 0.16), 0.05, sz * (D / 2 - 0.16)]);
    }
  }
  batch.box(M.woodDark, W - 0.2, 0.14, 0.16, 0, postH - 0.12, D / 2 - 0.16);
  batch.box(M.woodDark, W - 0.2, 0.14, 0.16, 0, postH - 0.12, -D / 2 + 0.16);
  batch.box(M.woodDark, 0.16, 0.14, D - 0.2, W / 2 - 0.16, postH - 0.12, 0);
  batch.box(M.woodDark, 0.16, 0.14, D - 0.2, -W / 2 + 0.16, postH - 0.12, 0);

  // basin
  const basinY = 0.62;
  batch.add(new THREE.BoxGeometry(1.75, 0.5, 0.95), M.stoneDark, [0, 0.31, 0.08]);
  batch.box(M.stone, 1.85, 0.12, 1.05, 0, 0.58, 0.08);
  batch.box(M.stone, 1.85, 0.12, 0.12, 0, 0.6, 0.56);
  batch.box(M.stone, 1.85, 0.12, 0.12, 0, 0.6, -0.4);
  batch.box(M.stone, 0.12, 0.12, 0.96, -0.86, 0.6, 0.08);
  batch.box(M.stone, 0.12, 0.12, 0.96, 0.86, 0.6, 0.08);
  // rim stones / legs
  for (const sx of [-1, 1]) {
    batch.add(new THREE.BoxGeometry(0.22, 0.3, 0.7), M.stone, [sx * 0.72, 0.15, 0.08]);
  }

  // water surface
  const waterMat = new THREE.MeshPhongMaterial({
    color: 0x7fb3b0,
    specular: 0xd8ffff,
    shininess: 100,
    transparent: true,
    opacity: 0.88,
  });
  const water = mesh(new THREE.PlaneGeometry(1.6, 0.78), waterMat, {
    x: 0,
    y: 0.65,
    z: 0.08,
    rx: -Math.PI / 2,
    parent: root,
    cast: false,
  });
  water.name = 'temizu-water';

  // bamboo spout and supports
  batch.add(new THREE.CylinderGeometry(0.06, 0.06, 1.25, 8), M.woodLight, [-0.55, 0.9, -0.72], [0, 0, 0]);
  batch.add(new THREE.CylinderGeometry(0.045, 0.045, 0.9, 8), M.stoneDark, [-0.55, 0.5, -0.72]);
  const spoutMat = toon(0x9b9b63);
  const spout = new THREE.Group();
  spout.position.set(-0.55, 1.28, -0.72);
  root.add(spout);
  const p1 = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.55, 8), spoutMat, { parent: spout, cast: true });
  p1.rotation.z = Math.PI / 2;
  p1.position.x = 0.24;
  const p2 = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), spoutMat, { parent: spout, x: 0.51, y: -0.14, cast: true });
  p2.rotation.z = 0.22;

  // thin falling water
  const streamMat = new THREE.MeshBasicMaterial({ color: 0xbfe2de, transparent: true, opacity: 0.45 });
  const stream = mesh(new THREE.PlaneGeometry(0.05, 0.55), streamMat, {
    parent: root,
    x: 0.56,
    y: 0.95,
    z: -0.66,
    cast: false,
  });
  stream.name = 'temizu-stream';

  // ladle resting on the basin
  const ladle = new THREE.Group();
  ladle.position.set(0.5, 0.72, 0.3);
  ladle.rotation.y = 0.4;
  root.add(ladle);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 6), spoutMat, { parent: ladle, y: 0.06, rz: Math.PI / 2, cast: false });
  mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.09, 10), spoutMat, { parent: ladle, x: 0.27, y: 0.06, cast: false });

  // bamboo fence at the back
  for (let i = 0; i < 11; i++) {
    batch.add(new THREE.CylinderGeometry(0.04, 0.04, 1.55, 6), spoutMat, [-1.1 + i * 0.22, 0.86, -0.93]);
  }
  batch.box(M.woodDark, 2.45, 0.06, 0.07, 0, 1.4, -0.9);
  batch.box(M.woodDark, 2.45, 0.06, 0.07, 0, 0.6, -0.9);

  // small sign
  const signTex = textTexture(['手', '水', '舎'], {
    w: 180,
    h: 300,
    bg: '#3a2d22',
    fg: '#e4d4ab',
    border: '#9b7f4d',
    borderWidth: 8,
    font: '700 62px "Yu Mincho", "MS Mincho", serif',
    vertical: true,
    radius: 6,
  });
  batch.box(M.woodDeep, 0.62, 1.02, 0.06, 0, 1.62, 0.92);
  batch.build(root);
  flatSign(signTex, 0.5, 0.86, { y: 1.62, z: 0.955, parent: root });

  const roof = buildGableRoof(root, {
    width: W + 0.1,
    depth: D + 0.2,
    eaveY: postH + 0.16,
    ridgeY: postH + 1.02,
    position: [0, 0, 0],
    upturn: 0.17,
    gableMaterial: M.woodLight,
    overhangX: 0.08,
  });
  roof.name = 'temizuya-roof';

  // short bracket blocks close the gap between the post tops and the lifted eave
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      mesh(new THREE.BoxGeometry(0.15, 0.14, 0.15), M.woodDark, {
        parent: root,
        x: sx * (W / 2 - 0.16),
        y: postH + 0.05,
        z: sz * (D / 2 - 0.16),
        cast: true,
      });
    }
  }
  for (const sz of [-1, 1]) {
    mesh(new THREE.BoxGeometry(W - 0.28, 0.08, 0.12), M.woodDark, {
      parent: root,
      y: postH + 0.11,
      z: sz * (D / 2 - 0.16),
      cast: true,
    });
  }

  return { group: root, water, stream };
}

/* ------------------------------------------------------------------ */
/* Ema plaques                                                         */
/* ------------------------------------------------------------------ */
function emaTexture(variant = 0) {
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 192;
  const g = c.getContext('2d');
  g.fillStyle = variant === 1 ? '#d2b17b' : variant === 2 ? '#c9a873' : '#d8bd8c';
  g.fillRect(0, 0, 160, 192);
  // wood grain
  for (let i = 0; i < 18; i++) {
    g.strokeStyle = `rgba(120,83,51,${0.10 + Math.random() * 0.08})`;
    g.lineWidth = 1;
    g.beginPath();
    const y = Math.random() * 192;
    g.moveTo(0, y);
    g.bezierCurveTo(50, y + 4, 100, y - 5, 160, y + 3);
    g.stroke();
  }
  g.strokeStyle = '#6e4a2e';
  g.lineWidth = 7;
  g.strokeRect(5, 5, 150, 182);
  g.strokeStyle = 'rgba(255,244,214,.35)';
  g.lineWidth = 2;
  g.strokeRect(11, 11, 138, 170);
  g.fillStyle = '#a63c30';
  g.strokeStyle = '#7a2e27';
  g.lineWidth = 4;
  if (variant === 0) {
    // little torii
    g.fillRect(38, 38, 84, 10);
    g.fillRect(48, 52, 10, 58);
    g.fillRect(102, 52, 10, 58);
    g.fillRect(42, 66, 76, 7);
    g.font = '700 24px "Yu Mincho", serif';
    g.fillText('願', 66, 156);
  } else if (variant === 1) {
    g.font = '700 84px "Yu Mincho", serif';
    g.fillText('福', 38, 120);
  } else {
    // chrysanthemum-ish flower
    g.fillStyle = '#8f3b2f';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.beginPath();
      g.ellipse(80 + Math.cos(a) * 24, 76 + Math.sin(a) * 24, 10, 22, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#d7b45e';
    g.beginPath();
    g.arc(80, 76, 12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#8f3b2f';
    g.font = '700 20px "Yu Mincho", serif';
    g.fillText('奉納', 52, 158);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const emaMats = [0, 1, 2].map((i) =>
  new THREE.MeshToonMaterial({ map: emaTexture(i), side: THREE.DoubleSide, gradientMap }),
);

function emaShapeGeo(w = 0.26, h = 0.34) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -h / 2);
  shape.lineTo(w / 2, -h / 2);
  shape.lineTo(w / 2, h * 0.22);
  shape.lineTo(0, h / 2);
  shape.lineTo(-w / 2, h * 0.22);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

export function buildEmaRack(parent, opts = {}) {
  const { x = 0, y = 0, z = 0, ry = 0 } = opts;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = ry;
  parent.add(root);
  const batch = new Batcher();
  const W = 2.7;
  const H = 2.0;
  for (const s of [-1, 1]) {
    batch.box(M.woodDark, 0.11, H, 0.11, (s * W) / 2, H / 2, 0);
    batch.box(M.wood, 0.18, 0.08, 0.22, (s * W) / 2, 0.05, 0);
  }
  batch.box(M.woodDark, W + 0.3, 0.08, 0.08, 0, H - 0.06, 0);
  batch.box(M.woodDark, W + 0.2, 0.08, 0.08, 0, 1.08, 0);
  batch.box(M.woodDark, W + 0.2, 0.07, 0.07, 0, 1.32, 0);
  // tiny roof plank
  batch.box(M.roofDark, W + 0.5, 0.08, 0.44, 0, H + 0.08, 0);
  batch.box(M.roof, W + 0.5, 0.04, 0.5, 0, H + 0.13, 0);
  // side braces
  for (const s of [-1, 1]) {
    batch.box(M.wood, 0.06, 0.7, 0.06, s * (W / 2 - 0.22), H - 0.35, 0.12, 0, 0, s * 0.4);
  }
  batch.build(root);

  const plaques = [];
  const rnd = seeded(77);
  const geo = emaShapeGeo();
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 5; i++) {
      const x0 = -W / 2 + 0.32 + i * ((W - 0.64) / 4) + (rnd() - 0.5) * 0.06;
      const barY = row === 0 ? 1.32 : 1.08;
      const pivot = new THREE.Group();
      pivot.position.set(x0, barY - 0.02, 0.12);
      root.add(pivot);
      const string = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 4), M.ropeDark, { parent: pivot, y: -0.05, cast: false });
      const plaque = new THREE.Mesh(geo, emaMats[Math.floor(rnd() * 3)]);
      plaque.position.y = -0.23;
      plaque.rotation.y = (rnd() - 0.5) * 0.15;
      plaque.rotation.z = (rnd() - 0.5) * 0.18;
      plaque.castShadow = true;
      pivot.add(plaque);
      plaques.push({ pivot, phase: rnd() * 6.28, baseZ: plaque.rotation.z });
    }
  }

  const signTex = textTexture(['絵', '馬'], {
    w: 150,
    h: 230,
    bg: '#3a2c21',
    fg: '#dfc796',
    border: '#a78954',
    borderWidth: 7,
    font: '700 58px "Yu Mincho", serif',
    vertical: true,
    radius: 5,
  });
  box(0.3, 0.44, 0.05, M.woodDeep, { parent: root, x: W / 2 + 0.12, y: 1.38, z: 0.07, cast: true });
  box(0.28, 0.05, 0.06, M.woodDark, { parent: root, x: W / 2 + 0.03, y: 1.56, z: 0.07, cast: true });
  box(0.28, 0.05, 0.06, M.woodDark, { parent: root, x: W / 2 + 0.03, y: 1.2, z: 0.07, cast: true });
  flatSign(signTex, 0.24, 0.38, { x: W / 2 + 0.12, y: 1.38, z: 0.098, parent: root });

  return { group: root, plaques };
}

/* ------------------------------------------------------------------ */
/* Omikuji rack                                                        */
/* ------------------------------------------------------------------ */
export function buildOmikujiRack(parent, opts = {}) {
  const { x = 0, y = 0, z = 0, ry = 0 } = opts;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = ry;
  parent.add(root);
  const batch = new Batcher();
  const W = 1.7;
  const H = 1.55;
  for (const s of [-1, 1]) {
    batch.box(M.woodDark, 0.09, H, 0.09, (s * W) / 2, H / 2, 0);
    batch.box(M.wood, 0.16, 0.08, 0.2, (s * W) / 2, 0.04, 0);
  }
  for (const yy of [1.42, 1.17, 0.92]) batch.box(M.woodDark, W + 0.1, 0.055, 0.055, 0, yy, 0);
  batch.box(M.roofDark, W + 0.36, 0.07, 0.38, 0, H + 0.06, 0);
  batch.box(M.roof, W + 0.34, 0.03, 0.42, 0, H + 0.11, 0);
  batch.build(root);

  const count = 26;
  const rnd = seeded(18);
  const geo = new THREE.PlaneGeometry(0.075, 0.3);
  const mat = toon(0xf1e7cf, { side: THREE.DoubleSide });
  const strips = new THREE.InstancedMesh(geo, mat, count);
  strips.castShadow = false;
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const row = i % 3;
    const slot = Math.floor(i / 3) % 9;
    const xx = -W / 2 + 0.18 + slot * ((W - 0.36) / 8) + (rnd() - 0.5) * 0.04;
    const yy = [1.42, 1.17, 0.92][row] - 0.19;
    dummy.position.set(xx, yy, 0.06 + rnd() * 0.05);
    dummy.rotation.set(0, (rnd() - 0.5) * 0.2, (rnd() - 0.5) * 0.12);
    dummy.updateMatrix();
    strips.setMatrixAt(i, dummy.matrix);
    col.setHex(rnd() > 0.7 ? 0xe9c4b0 : 0xf3ead6);
    strips.setColorAt(i, col);
  }
  strips.instanceMatrix.needsUpdate = true;
  if (strips.instanceColor) strips.instanceColor.needsUpdate = true;
  root.add(strips);

  const signTex = textTexture(['御', '神', '籤'], {
    w: 150,
    h: 240,
    bg: '#38443b',
    fg: '#e6d7b1',
    border: '#8e9a72',
    borderWidth: 7,
    font: '700 56px "Yu Mincho", serif',
    vertical: true,
    radius: 5,
  });
  box(0.28, 0.46, 0.05, M.woodDeep, { parent: root, x: W / 2 + 0.12, y: 1.4, z: 0.07, cast: true });
  box(0.28, 0.05, 0.06, M.woodDark, { parent: root, x: W / 2 + 0.03, y: 1.58, z: 0.07, cast: true });
  box(0.28, 0.05, 0.06, M.woodDark, { parent: root, x: W / 2 + 0.03, y: 1.22, z: 0.07, cast: true });
  flatSign(signTex, 0.24, 0.4, { x: W / 2 + 0.12, y: 1.4, z: 0.098, parent: root });

  return { group: root, strips };
}

/* ------------------------------------------------------------------ */
/* Notice board                                                        */
/* ------------------------------------------------------------------ */
export function buildNoticeBoard(parent, opts = {}) {
  const { x = 0, y = 0, z = 0, ry = 0 } = opts;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = ry;
  parent.add(root);
  const batch = new Batcher();
  const W = 1.55;
  const H = 1.5;
  for (const s of [-1, 1]) batch.box(M.woodDark, 0.1, H, 0.1, (s * W) / 2, H / 2, 0);
  batch.box(M.wood, 0.18, 0.08, 0.3, -W / 2, 0.04, 0);
  batch.box(M.wood, 0.18, 0.08, 0.3, W / 2, 0.04, 0);
  batch.box(M.woodDeep, W + 0.12, 0.92, 0.08, 0, 1.03, 0);
  batch.box(M.roofDark, W + 0.42, 0.08, 0.5, 0, H + 0.06, 0.02, 0, 0.08, 0);
  batch.box(M.roof, W + 0.42, 0.035, 0.54, 0, H + 0.11, 0.02, 0, 0.08, 0);
  // aged wooden notice panel: dark board and cream engraved lettering instead
  // of bright paper sheets that read as modern flyers
  batch.box(M.wood, 1.3, 0.78, 0.018, 0, 1.03, 0.055);
  batch.box(M.woodDark, 1.38, 0.06, 0.04, 0, 1.45, 0.06);
  batch.box(M.woodDark, 1.38, 0.06, 0.04, 0, 0.61, 0.06);
  batch.build(root);

  const titleTex = textTexture('境内案内', {
    w: 440,
    h: 140,
    bg: '#35281d',
    fg: '#e6c98d',
    border: '#9d7c4c',
    borderWidth: 5,
    font: '700 58px "Yu Mincho", serif',
    transparent: false,
    radius: 3,
  });
  flatSign(titleTex, 0.96, 0.26, { y: 1.3, z: 0.067, parent: root });
  const linesTex = textTexture(['・手水舎で心身を清め', '・参道の中央は神様の道'], {
    w: 520,
    h: 190,
    bg: '#3b2c20',
    fg: '#d8c094',
    border: 'rgba(0,0,0,0)',
    borderWidth: 0,
    font: '500 34px "Yu Mincho", serif',
    radius: 0,
    lineGap: 22,
  });
  flatSign(linesTex, 0.78, 0.34, { y: 0.93, z: 0.068, parent: root });

  return { group: root };
}

/* ------------------------------------------------------------------ */
/* Offering box                                                        */
/* ------------------------------------------------------------------ */
export function buildSaisenBako(parent, opts = {}) {
  const { x = 0, y = 0, z = 0, ry = 0 } = opts;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = ry;
  parent.add(root);
  const batch = new Batcher();
  const W = 1.65;
  const H = 0.68;
  const D = 0.78;
  batch.box(M.woodDark, W, H, D, 0, H / 2, 0);
  batch.box(M.wood, W + 0.08, 0.07, D + 0.08, 0, H + 0.02, 0);
  batch.box(M.woodDark, W - 0.1, 0.05, D - 0.08, 0, H + 0.055, 0, 0, 0, 0.02);
  // slats
  for (let i = 0; i < 7; i++) {
    const x0 = -W / 2 + 0.16 + i * ((W - 0.32) / 6);
    batch.box(M.woodLight, 0.055, 0.06, D - 0.02, x0, H + 0.1, 0);
  }
  // front panel and gold trim
  batch.box(M.wood, W - 0.12, H - 0.16, 0.05, 0, H / 2 + 0.02, D / 2 + 0.02);
  batch.box(M.woodLight, W - 0.02, 0.05, 0.05, 0, 0.08, D / 2 + 0.03);
  batch.box(M.woodLight, W - 0.02, 0.05, 0.05, 0, H - 0.13, D / 2 + 0.03);
  for (const s of [-1, 1]) {
    batch.box(M.brass, 0.06, 0.16, 0.04, s * (W / 2 - 0.12), 0.24, D / 2 + 0.06);
  }
  // little lock / hasp
  batch.box(M.brass, 0.16, 0.12, 0.035, 0, 0.4, D / 2 + 0.06);
  batch.build(root);

  const tex1 = textTexture(['奉', '納'], {
    w: 190,
    h: 230,
    bg: '#3b2a1f',
    fg: '#dcc08b',
    border: '#a9874f',
    borderWidth: 6,
    font: '700 58px "Yu Mincho", serif',
    vertical: true,
    radius: 4,
  });
  box(0.28, 0.36, 0.03, M.woodDeep, { parent: root, y: 0.48, z: D / 2 + 0.06, cast: true });
  flatSign(tex1, 0.24, 0.32, { y: 0.49, z: D / 2 + 0.085, parent: root });

  // coins on top
  const rnd = seeded(9);
  for (let i = 0; i < 5; i++) {
    const c = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 8), M.brass, {
      parent: root,
      x: randRange(rnd, -0.6, 0.6),
      y: H + 0.135,
      z: randRange(rnd, -0.22, 0.22),
      cast: false,
    });
    c.rotation.y = rnd() * 3;
  }

  return { group: root };
}

/* ------------------------------------------------------------------ */
/* Big shimenawa + bell rope for the shrine front                      */
/* ------------------------------------------------------------------ */
export function buildRitual(parent, opts = {}) {
  const { x = 0, y = 0, z = 0, eaveY = 3.58, ropeZ = -0.55, bellZ = 0.35, lanternZ = 0.32 } = opts;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  parent.add(root);

  // shimenawa stretched under the porch eave
  const points = [
    new THREE.Vector3(-2.85, eaveY, ropeZ),
    new THREE.Vector3(-2.1, eaveY - 0.12, ropeZ),
    new THREE.Vector3(-1.1, eaveY - 0.34, ropeZ),
    new THREE.Vector3(0, eaveY - 0.44, ropeZ),
    new THREE.Vector3(1.1, eaveY - 0.34, ropeZ),
    new THREE.Vector3(2.1, eaveY - 0.12, ropeZ),
    new THREE.Vector3(2.85, eaveY, ropeZ),
  ];
  const rope = new THREE.Group();
  root.add(rope);
  braidedRope(rope, points, 0.085, { strands: 4, twist: 26, segments: 70 });
  // straw tassels at the ends
  for (const s of [-1, 1]) {
    const t = mesh(new THREE.ConeGeometry(0.13, 0.44, 7), M.rope, {
      parent: rope,
      x: s * 2.9,
      y: eaveY - 0.28,
      z: ropeZ,
      cast: true,
    });
    t.rotation.z = s * 0.12;
  }

  const shide = [];
  for (let i = 0; i < 4; i++) {
    const xx = -2.05 + i * 1.36;
    const yy = eaveY - 0.28 - Math.abs(xx) * 0.05;
    shide.push(buildShide(rope, { x: xx, y: yy, z: ropeZ + 0.06, scale: 1.02, phase: i * 1.3, ry: 0.08 }));
  }

  // bell + braided rope
  const bellGroup = new THREE.Group();
  bellGroup.position.set(0, eaveY, bellZ);
  root.add(bellGroup);
  const pivot = new THREE.Group();
  bellGroup.add(pivot);
  // pivot at the eave, rope hangs down
  const ropePts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    ropePts.push(new THREE.Vector3(Math.sin(t * 3.1) * 0.015, -t * 1.55, 0.02 + Math.sin(t * Math.PI) * 0.03));
  }
  const bellRope = new THREE.Group();
  bellRope.position.set(0, 0, 0);
  pivot.add(bellRope);
  braidedRope(bellRope, ropePts, 0.068, { strands: 3, twist: 34, segments: 48 });
  // bell
  const bell = mesh(new THREE.SphereGeometry(0.24, 16, 12), M.brassLight, {
    parent: bellRope,
    x: 0,
    y: -0.58,
    z: 0.02,
    cast: true,
  });
  bell.scale.set(1, 0.88, 1);
  mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 10), M.brass, { parent: bellRope, x: 0, y: -0.33, z: 0.02 });
  mesh(new THREE.TorusGeometry(0.085, 0.02, 6, 12), M.brass, { parent: bellRope, x: 0, y: -0.23, z: 0.02, rx: Math.PI / 2 });
  // red-white wrapped grip
  for (let i = 0; i < 5; i++) {
    const ring = mesh(new THREE.TorusGeometry(0.064, 0.018, 5, 10), i % 2 ? M.white : M.red, {
      parent: bellRope,
      x: 0,
      y: -1.22 + i * 0.055,
      z: 0.04,
      rx: Math.PI / 2,
      cast: false,
    });
    ring.rotation.z = 0.2;
  }
  mesh(new THREE.CylinderGeometry(0.045, 0.09, 0.26, 8), M.woodDark, { parent: bellRope, x: 0, y: -1.4, z: 0.04 });

  // hanging side lanterns under the porch
  const lanterns = [];
  for (const s of [-1, 1]) {
    const l = buildHangingLantern(root, { x: s * 2.25, y: eaveY - 0.1, z: lanternZ, scale: 1 });
    lanterns.push(l);
  }

  const update = (t, flicker) => {
    rope.rotation.z = Math.sin(t * 0.7) * 0.012;
    for (const s of shide) {
      s.pivot.rotation.z = Math.sin(t * 1.15 + s.phase) * 0.24;
      s.pivot.rotation.x = Math.sin(t * 0.87 + s.phase * 1.7) * 0.14;
    }
    pivot.rotation.z = Math.sin(t * 0.82) * 0.2;
    pivot.rotation.x = Math.sin(t * 0.53 + 1) * 0.09;
    for (const l of lanterns) l.update(t, flicker);
  };

  return { group: root, update, lanterns };
}

/* ------------------------------------------------------------------ */
/* Hanging paper lantern                                               */
/* ------------------------------------------------------------------ */
export function buildHangingLantern(parent, opts = {}) {
  const { x = 0, y = 0, z = 0, scale = 1 } = opts;
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  parent.add(pivot);
  const s = scale;
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3 * s, 5), M.ink, { parent: pivot, y: -0.15 * s, cast: false });
  const paperMat = toon(0xffe1ad, { emissive: 0xffa94e, emissiveIntensity: 0 });
  const body = mesh(new THREE.CylinderGeometry(0.17 * s, 0.17 * s, 0.42 * s, 12), paperMat, {
    parent: pivot,
    y: -0.5 * s,
    cast: true,
  });
  mesh(new THREE.CylinderGeometry(0.18 * s, 0.18 * s, 0.04 * s, 12), M.woodDark, { parent: pivot, y: -0.29 * s, cast: false });
  mesh(new THREE.CylinderGeometry(0.18 * s, 0.18 * s, 0.04 * s, 12), M.woodDark, { parent: pivot, y: -0.71 * s, cast: false });
  // red bands and a simple kanji plaque
  mesh(new THREE.CylinderGeometry(0.174 * s, 0.174 * s, 0.035 * s, 12), M.red, { parent: pivot, y: -0.38 * s, cast: false });
  const glowTexture = tex('glow.png');
  const glowMat = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xffb35c,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(1.0 * s, 1.0 * s, 1);
  glow.position.y = -0.5 * s;
  pivot.add(glow);

  return {
    group: pivot,
    update: (t, flicker = 0) => {
      pivot.rotation.z = Math.sin(t * 1.02 + x) * 0.085;
      pivot.rotation.x = Math.cos(t * 0.73 + z) * 0.045;
      const f = 0.82 + 0.18 * Math.sin(t * 5.1 + x * 3.1) * Math.sin(t * 2.3 + z);
      paperMat.emissiveIntensity = flicker * 1.15 * f;
      glowMat.opacity = flicker * 0.22 * f;
    },
    paperMat,
  };
}
