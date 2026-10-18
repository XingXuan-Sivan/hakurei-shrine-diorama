import * as THREE from 'three';
import { M, toon, seeded, randRange } from '../palette.js';

const YAXIS = new THREE.Vector3(0, 1, 0);

/* ------------------------------------------------------------------ */
/* Soft crown blobs                                                     */
/* ------------------------------------------------------------------ */

function makeBlobGeometry(detail = 2, wobble = 0.055) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n =
      1 +
      Math.sin(v.x * 3.1 + v.y * 2.2) * wobble +
      Math.sin(v.z * 3.7 - v.y * 1.8) * wobble * 0.75 +
      Math.sin((v.x + v.z) * 5.1) * wobble * 0.42;
    v.multiplyScalar(n);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

const crownGeo = makeBlobGeometry(2, 0.06);
const foliageMat = toon(0xffffff);
const trunkMat = toon(0x6b4b37);
const trunkMatDark = toon(0x533a2c);
const mossMat = toon(0x6a824f);

function limb(parent, a, b, r0, r1, mat = trunkMat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, 7, 1);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(YAXIS, dir.normalize());
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function pickPalette(kind) {
  if (kind === 'cherry') return [0xb16d75, 0xcc898c, 0xe2aea3, 0xf0c9bb];
  if (kind === 'amber') return [0x8a5a30, 0xaa743c, 0xc99855, 0xd9ad6c];
  if (kind === 'pine') return [0x354c3d, 0x4b6750, 0x607b57, 0x748b64];
  return [0x3d5742, 0x55724f, 0x6c8a5b, 0x819b6b];
}

/**
 * Reference-style tree: a soft, cloud-like crown built from a small number of
 * large overlapping blobs with a few smaller bumps, no per-leaf cards.
 */
export function buildTree(parent, opts = {}) {
  const {
    x = 0,
    z = 0,
    y = 0,
    scale = 1,
    seed = 1,
    kind = 'green',
    phase = 0,
    canopyRadius = 2.1,
    trunkHeight = 3.2,
    lean = 0,
  } = opts;
  const rnd = seeded(seed);
  const root = new THREE.Group();
  root.position.set(x, y, z);
  parent.add(root);
  // everything hangs off `body`, which pivots at the base: shaking the tree
  // tilts the whole thing, trunk included, instead of only wobbling the crown
  const body = new THREE.Group();
  body.rotation.order = 'YXZ';
  root.add(body);

  const palette = pickPalette(kind);
  // what this tree sheds: mid and light tones of its own crown, so a cherry
  // drops petals and a pine drops needles instead of everything dropping the
  // same autumn brown
  const tints = [palette[1], palette[2], palette[3] ?? palette[2]];
  const H = trunkHeight * scale * 1.08;
  const cr = canopyRadius * scale * 1.82;
  const base = new THREE.Vector3(0, 0, 0);
  const dir = new THREE.Vector3(Math.sin(lean) * 0.16, 1, Math.cos(lean) * 0.1).normalize();
  const mid = base.clone().addScaledVector(dir, H * 0.52);
  const top = base.clone().addScaledVector(dir, H);
  top.x += Math.sin(seed * 1.3) * 0.22 * scale;
  top.z += Math.cos(seed * 0.9) * 0.16 * scale;

  limb(body, base, mid, 0.3 * scale, 0.21 * scale);
  limb(body, mid, top, 0.21 * scale, 0.12 * scale);
  const forkY = H * 0.72;
  const forkBase = base.clone().addScaledVector(dir, forkY);
  for (let i = 0; i < 2; i++) {
    const a = seed * 1.9 + i * 2.4;
    const p = new THREE.Vector3(Math.cos(a) * cr * 0.36, forkY + H * 0.13, Math.sin(a) * cr * 0.36);
    limb(body, forkBase, p, 0.11 * scale, 0.055 * scale);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + seed;
    const p = new THREE.Vector3(Math.cos(a) * 0.6 * scale, -0.02, Math.sin(a) * 0.6 * scale);
    limb(body, new THREE.Vector3(0, 0.14, 0), p, 0.15 * scale, 0.035 * scale, trunkMatDark);
  }

  const canopy = new THREE.Group();
  canopy.position.copy(top);
  canopy.rotation.order = 'YXZ';
  body.add(canopy);
  const crownInner = new THREE.Group();
  crownInner.rotation.order = 'YXZ';
  canopy.add(crownInner);

  // a few visible limbs reaching into the crown
  // (kept short so no bare branch can pierce the foliage silhouette)

  /* ---- a small number of soft crown clumps ------------------------ */
  const lobes = [];
  const lobeCount = kind === 'pine' ? 8 : 9;
  for (let l = 0; l < lobeCount; l++) {
    const a = (l / lobeCount) * Math.PI * 2 + seed * 1.7;
    const r = l === 0 ? 0 : cr * (0.14 + rnd() * 0.26);
    const lift = l === 0 ? cr * 0.1 : (rnd() - 0.25) * cr * 0.28;
    lobes.push({
      center: new THREE.Vector3(Math.cos(a) * r, lift, Math.sin(a) * r),
      radius: cr * (l === 0 ? 0.5 : 0.37 + rnd() * 0.08),
      tone: l === 0 ? 1 : Math.floor(rnd() * 3),
    });
  }
  lobes.push({ center: new THREE.Vector3(cr * 0.04, cr * 0.26, -cr * 0.06), radius: cr * 0.38, tone: 2 });
  // a low skirt of foliage fills the underside of the crown and hides the
  // bare fork of the cherry trunk
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + seed * 2.7;
    lobes.push({
      center: new THREE.Vector3(Math.cos(a) * cr * 0.3, -cr * 0.22, Math.sin(a) * cr * 0.26),
      radius: cr * 0.31,
      tone: 1,
    });
  }

  const bigPerLobe = kind === 'pine' ? 2 : 4;
  const midPerLobe = 6;
  const smallPerLobe = 3;
  const count = lobes.length * (bigPerLobe + midPerLobe + smallPerLobe);
  const im = new THREE.InstancedMesh(crownGeo, foliageMat, count);
  im.castShadow = true;
  im.receiveShadow = true;
  im.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  let idx = 0;
  for (const lobe of lobes) {
    for (let j = 0; j < bigPerLobe + midPerLobe + smallPerLobe; j++) {
      const tier = j < bigPerLobe ? 0 : j < bigPerLobe + midPerLobe ? 1 : 2;
      const a = rnd() * Math.PI * 2;
      const rr = lobe.radius * (tier === 0 ? 0.05 + rnd() * 0.22 : tier === 1 ? 0.34 + rnd() * 0.28 : 0.62 + rnd() * 0.24);
      const lift = (rnd() - 0.45) * lobe.radius * (tier === 0 ? 0.58 : 0.68);
      dummy.position.set(
        lobe.center.x + Math.cos(a) * rr,
        lobe.center.y + lift,
        lobe.center.z + Math.sin(a) * rr,
      );
      const s = lobe.radius * (tier === 0 ? 0.42 + rnd() * 0.1 : tier === 1 ? 0.27 + rnd() * 0.07 : 0.13 + rnd() * 0.04);
      dummy.scale.set(s * (1.0 + rnd() * 0.22), s * (0.74 + rnd() * 0.22), s * (1.0 + rnd() * 0.22));
      dummy.rotation.set(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28);
      dummy.updateMatrix();
      im.setMatrixAt(idx, dummy.matrix);
      const hex = palette[Math.min(palette.length - 1, (lobe.tone + (tier === 0 ? 0 : 1)) % palette.length)];
      col.setHex(hex);
      col.offsetHSL((rnd() - 0.5) * 0.012, (rnd() - 0.5) * 0.02, (rnd() - 0.5) * 0.025);
      im.setColorAt(idx, col);
      idx++;
    }
  }
  // The old leaf-card shell has been removed: foliage now reads as layered
  // soft clumps, closer to the reference miniature's painted canopy.

  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  crownInner.add(im);

  // moss around the roots
  for (let i = 0; i < 4; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = 0.5 + rnd() * 0.55;
    const m = new THREE.Mesh(crownGeo, mossMat);
    m.position.set(Math.cos(a) * rr * scale, 0.05, Math.sin(a) * rr * scale);
    m.scale.set(0.32 + rnd() * 0.25, 0.06 + rnd() * 0.05, 0.24 + rnd() * 0.2);
    m.receiveShadow = true;
    body.add(m);
  }

  const basePos = canopy.position.clone();
  let lastT = 0;
  let shakeAt = -1e9;
  let shakeAmp = 0;
  return {
    group: root,
    canopy,
    kind,
    tints,
    radius: cr,
    phase,
    /** Kick the tree: a damped wobble that decays in about two seconds. */
    shake: (strength = 1) => {
      shakeAt = lastT;
      shakeAmp = Math.min(1.35, shakeAmp * 0.55 + strength);
    },
    get shaking() {
      return shakeAmp > 0.01;
    },
    sway: (t, wind = 1) => {
      lastT = t;
      const slow = Math.sin(t * 0.5 * wind + phase);
      const slow2 = Math.sin(t * 0.31 * wind + phase * 1.7);

      let kick = 0;
      let kickX = 0;
      let lift = 0;
      const age = t - shakeAt;
      if (age >= 0 && age < 2.6) {
        const decay = Math.exp(-3.15 * age);
        kick = Math.sin(age * 25.5) * 0.155 * decay * shakeAmp;
        kickX = Math.sin(age * 21.2 + 0.9) * 0.085 * decay * shakeAmp;
        lift = Math.sin(age * 30.5 + 1.4) * 0.045 * decay * shakeAmp;
      } else if (age >= 2.6 && shakeAmp) {
        shakeAmp = 0;
      }

      // wind leans the trunk a touch, the shake swings the whole tree from the
      // base, and the crown lags behind it so the foliage whips a little more
      body.rotation.z = slow * 0.009 + kick * 0.34;
      body.rotation.x = slow2 * 0.006 + kickX * 0.28;

      canopy.rotation.z = slow * 0.034 + Math.sin(t * 1.35 + phase * 2.1) * 0.007 + kick;
      canopy.rotation.x = slow2 * 0.026 + kickX;
      crownInner.rotation.z = Math.sin(t * 1.1 + phase * 2.6) * 0.014 + kick * 0.55;
      crownInner.rotation.x = Math.cos(t * 0.83 + phase * 1.9) * 0.01 + kickX * 0.5;
      canopy.position.x = basePos.x + Math.sin(t * 0.44 + phase) * 0.055 + lift * 0.7;
      canopy.position.z = basePos.z + Math.cos(t * 0.37 + phase * 1.3) * 0.045;
      canopy.position.y = basePos.y + lift * 0.35;
    },
  };
}
