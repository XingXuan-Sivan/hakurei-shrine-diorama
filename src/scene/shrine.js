import * as THREE from 'three';
import {
  C,
  M,
  Batcher,
  mesh,
  box,
  rbox,
  cyl,
  toon,
  tex,
  textTexture,
  seeded,
  randRange,
} from '../palette.js';
import { buildRoof, buildGableRoof } from './roof.js';
import { buildRitual, buildSaisenBako, buildShide, buildTorii, buildHangingLantern, buildStoneLantern } from './props.js';

/* ------------------------------------------------------------------ */
/* Small facade helpers                                                */
/* ------------------------------------------------------------------ */

function shoji(parent, opts = {}) {
  const {
    w = 1.0,
    h = 1.6,
    x = 0,
    y = 0,
    z = 0,
    ry = 0,
    cols = 3,
    rows = 5,
    sill = true,
    mat = null,
  } = opts;
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;
  parent.add(group);

  const paperMat =
    mat ||
    toon(C.paper, {
      map: tex('paper.webp'),
      emissive: 0xffa955,
      emissiveIntensity: 0,
      side: THREE.FrontSide,
    });
  mesh(new THREE.PlaneGeometry(w, h), paperMat, { parent: group, z: 0.0, cast: false, receive: false });

  const batch = new Batcher();
  // dark recessed reveal behind the paper, so every window reads as set into
  // the wall instead of a bright panel floating over a post or beam
  batch.box(M.woodDark, w + 0.16, h + 0.14, 0.07, 0, 0, -0.045);
  // outer frame
  batch.box(M.woodDark, w + 0.09, 0.065, 0.055, 0, h / 2 + 0.02, 0.025);
  batch.box(M.woodDark, w + 0.09, 0.075, 0.055, 0, -h / 2 - 0.02, 0.025);
  batch.box(M.woodDark, 0.07, h + 0.1, 0.06, -w / 2 - 0.02, 0, 0.025);
  batch.box(M.woodDark, 0.07, h + 0.1, 0.06, w / 2 + 0.02, 0, 0.025);
  // lattice
  for (let i = 1; i < cols; i++) {
    batch.box(M.woodDeep, 0.025, h, 0.03, -w / 2 + (i * w) / cols, 0, 0.03);
  }
  for (let j = 1; j < rows; j++) {
    batch.box(M.woodDeep, w, 0.022, 0.03, 0, -h / 2 + (j * h) / rows, 0.03);
  }
  if (sill) batch.box(M.woodDark, w + 0.2, 0.08, 0.14, 0, -h / 2 - 0.09, 0.05);
  batch.build(group, { cast: false, receive: true });

  return { group, mat: paperMat };
}

function plasterPanel(parent, w, h, opts = {}) {
  const { x = 0, y = 0, z = 0, mat = M.plaster } = opts;
  return rbox(w, h, 0.18, 0.025, mat, { x, y, z, parent, cast: true, receive: true });
}

function signPlane(parent, texture, w, h, opts = {}) {
  const { x = 0, y = 0, z = 0, ry = 0 } = opts;
  const mat = new THREE.MeshToonMaterial({
    map: texture,
    color: 0xffffff,
    gradientMap: M.red.gradientMap,
    emissive: 0x2a1c0d,
    emissiveIntensity: 0.4,
  });
  return mesh(new THREE.PlaneGeometry(w, h), mat, { x, y, z, ry, parent, cast: false, receive: false });
}

/* ------------------------------------------------------------------ */
/* Main shrine                                                         */
/* ------------------------------------------------------------------ */
export function buildShrine(parent, opts = {}) {
  const { x = 0, y = 0.56, z = -2.6 } = opts;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.name = 'hakurei-shrine';
  parent.add(root);

  const windows = [];
  const batch = new Batcher();

  /* ---- platform ---- */
  const platformW = 8.75;
  const platformD = 8.2;
  const platformZ = -0.55; // deep enough for the hall, rear wall and rear eave
  const platFront = platformZ + platformD / 2;
  const platBack = platformZ - platformD / 2;
  rbox(platformW, 0.5, platformD, 0.09, M.stoneDark, { parent: root, y: 0.25, z: platformZ, cast: true, receive: true });
  batch.box(M.stone, platformW + 0.16, 0.12, platformD + 0.16, 0, 0.5, platformZ);
  batch.box(M.redDark, platformW - 0.2, 0.17, platformD - 0.2, 0, 0.61, platformZ);
  // stone skirt blocks around the platform (a small masonry plinth)
  const skirtRnd = seeded(12);
  for (let i = 0; i < 9; i++) {
    const xx = -platformW / 2 + 0.5 + i * 0.96;
    batch.box(i % 2 ? M.stone : M.stoneLight, 0.82, 0.28, 0.13, xx, 0.2, platFront + 0.02);
    batch.box(i % 3 ? M.stone : M.stoneDark, 0.82, 0.22, 0.13, xx, 0.48, platFront + 0.02);
    batch.box(i % 2 ? M.stoneLight : M.stone, 0.82, 0.28, 0.13, xx, 0.2, platBack - 0.02);
    batch.box(i % 3 ? M.stoneDark : M.stoneLight, 0.82, 0.22, 0.13, xx, 0.48, platBack - 0.02);
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const zz = platBack + 0.5 + i * 1.0;
      batch.box(skirtRnd() > 0.5 ? M.stone : M.stoneLight, 0.13, 0.27, 0.92, s * (platformW / 2 + 0.02), 0.2, zz);
      batch.box(skirtRnd() > 0.5 ? M.stoneLight : M.stoneDark, 0.13, 0.21, 0.92, s * (platformW / 2 + 0.02), 0.48, zz);
    }
  }
  // rear service step and a short stone path under the back eave
  batch.box(M.stoneLight, 2.2, 0.12, 0.7, 0, 0.17, platBack - 0.45);
  batch.box(M.stone, 2.4, 0.1, 0.5, 0, 0.08, platBack - 0.9);

  /* ---- hall floor and veranda ---- */
  const hallW = 7.25;
  const hallD = 4.8;
  batch.box(M.woodDeep, hallW + 0.2, 0.16, hallD + 0.2, 0, 0.7, -1.85);
  // veranda floor planks
  const deckW = 8.15;
  const deckFrontZ = 2.28;
  const deckBackZ = 0.5;
  const plankCount = 10;
  const plankW = deckW / plankCount;
  for (let i = 0; i < plankCount; i++) {
    const xx = -deckW / 2 + plankW / 2 + i * plankW;
    const mat = i % 3 === 0 ? M.wood : M.woodLight;
    batch.box(mat, plankW - 0.025, 0.09, deckFrontZ - deckBackZ, xx, 0.665, (deckFrontZ + deckBackZ) / 2);
  }
  // deck edge beams
  batch.box(M.redDark, deckW + 0.18, 0.2, 0.2, 0, 0.6, deckFrontZ + 0.02);
  for (const s of [-1, 1]) batch.box(M.redDark, 0.18, 0.2, deckFrontZ - deckBackZ, s * (deckW / 2 + 0.02), 0.6, (deckFrontZ + deckBackZ) / 2);
  batch.box(M.woodDark, deckW + 0.14, 0.06, 0.1, 0, 0.73, deckBackZ - 0.02);

  /* ---- walls ---- */
  const wallZ = 0.5;
  const wallTop = 2.9;
  const wallBottom = 0.75;
  const wallH = wallTop - wallBottom;

  // main plaster field, split around the door
  plasterPanel(root, 2.48, 1.62, { x: -2.38, y: 1.95, z: wallZ });
  plasterPanel(root, 2.48, 1.62, { x: 2.38, y: 1.95, z: wallZ });
  // lower red wainscot, split so it runs up to the door reveal on both sides
  batch.box(M.redDark, 2.35, 0.56, 0.22, -2.42, 1.02, wallZ);
  batch.box(M.redDark, 2.35, 0.56, 0.22, 2.42, 1.02, wallZ);
  batch.box(M.woodDark, 7.2, 0.06, 0.26, 0, 1.32, wallZ);
  // transom above the door
  plasterPanel(root, 2.18, 0.34, { x: 0, y: 2.66, z: wallZ });

  // pillars
  for (const px of [-3.6, -1.18, 1.18, 3.6]) {
    batch.box(M.red, 0.2, wallTop - 0.6, 0.26, px, (wallTop + 0.6) / 2, wallZ + 0.02);
    batch.box(M.redDark, 0.28, 0.1, 0.32, px, 0.76, wallZ + 0.02);
    batch.box(M.redDark, 0.27, 0.1, 0.31, px, 2.84, wallZ + 0.02);
  }
  // horizontal beams
  batch.box(M.red, 7.45, 0.2, 0.3, 0, 2.78, wallZ + 0.02);
  batch.box(M.redDark, 7.35, 0.08, 0.34, 0, 2.92, wallZ + 0.02);
  batch.box(M.woodDark, 2.25, 0.13, 0.28, 0, 2.48, wallZ + 0.03);
  // thin vertical studs on the plaster
  for (const px of [-3.05, -1.75, 1.75, 3.05]) {
    batch.box(M.wood, 0.075, 1.58, 0.08, px, 1.95, wallZ + 0.09);
  }
  // carved bracket under the beam
  for (const px of [-3.6, -1.18, 1.18, 3.6]) {
    batch.box(M.woodDark, 0.42, 0.12, 0.34, px, 2.6, wallZ + 0.1);
    batch.box(M.woodLight, 0.28, 0.1, 0.28, px, 2.7, wallZ + 0.1);
  }

  // clerestory / upper frieze: gives the hall a taller, more layered mass
  batch.box(M.plaster, 7.16, 0.46, 0.26, 0, 3.13, wallZ);
  batch.box(M.red, 7.42, 0.16, 0.32, 0, 3.39, wallZ + 0.02);
  for (const px of [-3.6, -1.18, 1.18, 3.6]) {
    batch.box(M.red, 0.2, 0.68, 0.28, px, 3.06, wallZ + 0.02);
    batch.box(M.woodDark, 0.4, 0.1, 0.32, px, 2.98, wallZ + 0.08);
  }
  // ventilation lattice under the eave
  for (const px of [-2.7, -1.7, 1.7, 2.7]) {
    for (let k = 0; k < 5; k++) {
      batch.box(M.woodDark, 0.035, 0.28, 0.05, px - 0.22 + k * 0.11, 3.13, wallZ + 0.15);
    }
    batch.box(M.woodDark, 0.64, 0.05, 0.06, px, 3.28, wallZ + 0.15);
    batch.box(M.woodDark, 0.64, 0.05, 0.06, px, 2.99, wallZ + 0.15);
  }

  /* ---- sliding shoji doors (引分け遣戸) ---- */
  // Two leaves in two grooves. Closed they meet on the centre line; open they
  // slide in behind the jambs, so each leaf still shows ~0.4m at the side
  // instead of the doorway simply going black.
  const DOOR_W = 1.1;
  const DOOR_H = 1.55;
  const DOOR_CY = 1.634;
  const DOOR_CLOSED_X = 0.55;
  const DOOR_OPEN_X = 1.3;
  const DOOR_Z_LEFT = 0.19;
  const DOOR_Z_RIGHT = 0.33;
  const doorState = { open: 1, target: 1 };

  const leftDoor = shoji(root, { w: DOOR_W, h: DOOR_H, x: -DOOR_CLOSED_X, y: DOOR_CY, z: DOOR_Z_LEFT, cols: 5, rows: 6, sill: false });
  const rightDoor = shoji(root, { w: DOOR_W, h: DOOR_H, x: DOOR_CLOSED_X, y: DOOR_CY, z: DOOR_Z_RIGHT, cols: 5, rows: 6, sill: false });
  windows.push(leftDoor.mat, rightDoor.mat);

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  // the right leaf leads by a hair so the stiles never jam against each other
  const applyDoor = (p) => {
    const travel = DOOR_OPEN_X - DOOR_CLOSED_X;
    rightDoor.group.position.x = DOOR_CLOSED_X + travel * easeInOut(clamp01(p * 1.05));
    leftDoor.group.position.x = -DOOR_CLOSED_X - travel * easeInOut(clamp01((p - 0.05) / 0.95));
  };
  applyDoor(doorState.open);

  const setDoor = (open) => {
    doorState.target = open ? 1 : 0;
    return doorState.target;
  };
  const toggleDoor = () => setDoor(doorState.target < 0.5);

  // threshold and head rail carry the two grooves; both stay clear of the leaves
  batch.box(M.woodDeep, 2.28, 0.14, 0.32, 0, 0.73, 0.26);
  batch.box(M.woodDark, 2.28, 0.07, 0.29, 0, 2.499, 0.26);
  // jambs close the reveal between the leaves and the plaster field
  for (const s of [-1, 1]) batch.box(M.woodDark, 0.12, 1.65, 0.26, s * 1.08, 1.635, 0.53);

  // invisible in the scene, but it gives the doorway a tap target in every state
  const doorHit = mesh(
    new THREE.PlaneGeometry(2.14, 1.9),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    { parent: root, y: 1.35, z: 0.38, cast: false, receive: false },
  );

  // the hall behind the leaves: a shallow, warm niche with an altar, so the
  // opening reads as an interior rather than a black rectangle. Everything in
  // here starts behind z≈0.10, clear of the leaves even when they are closed.
  const doorZ = 0.16;
  // side walls and a ceiling close the box, so the niche has corners and shadow
  for (const s of [-1, 1]) batch.box(M.woodDeep, 0.1, 1.92, 0.62, s * 0.66, 1.47, doorZ - 0.31);
  batch.box(M.woodDark, 1.44, 0.08, 0.62, 0, 2.44, doorZ - 0.31);
  batch.box(M.woodDeep, 2.24, 1.9, 0.1, 0, 1.48, doorZ - 0.4);
  batch.box(M.wood, 1.2, 0.1, 0.34, 0, 0.92, doorZ - 0.24);
  batch.box(M.red, 0.64, 0.46, 0.3, 0, 1.18, doorZ - 0.37);
  batch.box(M.brass, 0.72, 0.06, 0.34, 0, 1.42, doorZ - 0.37);
  mesh(new THREE.SphereGeometry(0.11, 10, 8), M.gold, {
    parent: root,
    x: 0,
    y: 1.54,
    z: doorZ - 0.37,
    cast: true,
  });
  // warm lamp card deep in the niche; there is deliberately no flat glow plane
  // at the threshold, so the doorway reads as real interior
  const innerMat = new THREE.MeshBasicMaterial({ color: 0xffc078, transparent: true, opacity: 0.95, toneMapped: false });
  mesh(new THREE.PlaneGeometry(0.9, 1.34), innerMat, {
    parent: root,
    x: 0,
    y: 1.58,
    z: doorZ - 0.34,
    cast: false,
  });

  // front signboard above the door
  const nameTex = textTexture('博麗神社', {
    w: 620,
    h: 180,
    bg: '#2f2620',
    fg: '#e3c98d',
    border: '#b39456',
    borderWidth: 7,
    font: '700 82px "Yu Mincho", "MS Mincho", serif',
    radius: 5,
  });
  batch.box(M.woodDeep, 1.86, 0.5, 0.09, 0, 2.79, wallZ + 0.14);
  batch.build(root);
  signPlane(root, nameTex, 1.7, 0.4, { y: 2.79, z: wallZ + 0.2 });

  /* ---- side walls ---- */
  for (const s of [-1, 1]) {
    const wx = s * 3.63;
    // plaster side wall running along Z
    batch.box(M.plaster, 0.22, 2.1, 4.65, wx, 1.88, -1.85);
    batch.box(M.plaster, 0.23, 0.52, 4.65, wx, 3.14, -1.85);
    batch.box(M.red, 0.25, 0.16, 4.72, wx, 3.42, -1.85);
    batch.box(M.redDark, 0.24, 0.5, 4.1, wx, 1.03, -1.85);
    batch.box(M.woodDark, 0.25, 0.07, 4.15, wx, 1.31, -1.85);
    for (const pz of [-3.9, -1.85, 0.18]) batch.box(M.red, 0.26, 2.92, 0.18, wx, 1.98, pz);
    batch.box(M.red, 0.24, 0.2, 4.2, wx, 3.38, -1.85);
    // two evenly spaced side windows, one centred in each structural bay; both
    // sides are level and symmetrical so the openings never read as crooked
    for (const pz of [-0.84, -2.88]) {
      const win = shoji(root, {
        w: 0.84,
        h: 0.96,
        x: wx + s * 0.15,
        y: 1.92,
        z: pz,
        ry: s > 0 ? Math.PI / 2 : -Math.PI / 2,
        cols: 3,
        rows: 4,
        sill: true,
      });
      windows.push(win.mat);
      // straight timber lintel and sill, both level with the wall posts
      batch.box(M.woodDark, 0.34, 0.1, 1.02, wx + s * 0.17, 1.39, pz);
      batch.box(M.woodDark, 0.32, 0.1, 1.02, wx + s * 0.16, 2.45, pz);
      // a shallow tiled hood sits level above the lintel
      batch.box(M.roofDark, 0.46, 0.06, 1.12, wx + s * 0.2, 2.53, pz);
      batch.box(M.roofLight, 0.48, 0.025, 1.14, wx + s * 0.21, 2.57, pz);
      for (const ez of [-0.42, 0.42]) {
        batch.box(M.woodDark, 0.28, 0.07, 0.07, wx + s * 0.08, 2.42, pz + ez);
      }
    }
  }

  // rear elevation, in the same cream plaster + vermilion timber language as
  // the front and side walls so the building reads as one structure
  batch.box(M.plaster, 7.08, 2.28, 0.16, 0, 2.16, -4.24);
  batch.box(M.woodDark, 7.16, 0.74, 0.22, 0, 1.0, -4.24);
  batch.box(M.redDark, 7.24, 0.18, 0.26, 0, 3.22, -4.24);
  batch.box(M.redDark, 7.2, 0.18, 0.26, 0, 1.35, -4.24);
  for (const px of [-3.46, -1.72, 1.72, 3.46]) {
    batch.box(M.red, 0.17, 2.1, 0.24, px, 2.22, -4.25);
  }
  // rear service door, with a small lit transom above it
  batch.box(M.woodDeep, 1.42, 1.92, 0.12, 0.86, 1.72, -4.35);
  batch.box(M.redDark, 1.58, 0.14, 0.16, 0.86, 2.72, -4.36);
  batch.box(M.redDark, 0.12, 1.96, 0.16, 0.12, 1.72, -4.36);
  batch.box(M.redDark, 0.12, 1.96, 0.16, 1.6, 1.72, -4.36);
  for (let k = 0; k < 4; k++) {
    batch.box(M.woodLight, 1.16, 0.025, 0.04, 0.86, 1.02 + k * 0.42, -4.42);
  }
  // rear gutter and downpipes
  mesh(new THREE.CylinderGeometry(0.055, 0.055, 7.9, 8), M.roofDark, {
    parent: root,
    x: 0,
    y: 3.5,
    z: -4.62,
    rz: Math.PI / 2,
    cast: false,
  });
  for (const s of [-1, 1]) {
    mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.85, 8), M.roofDark, {
      parent: root,
      x: s * 3.78,
      y: 2.1,
      z: -4.38,
      cast: true,
    });
    mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.2, 8), M.roofDark, {
      parent: root,
      x: s * 3.78,
      y: 0.7,
      z: -4.38,
      cast: false,
    });
  }
  // stacked storage crates and firewood at the rear corner
  for (let i = 0; i < 3; i++) {
    batch.box(M.wood, 0.9, 0.58, 0.66, 3.0 + (i % 2) * 0.35, 0.3 + i * 0.6, -4.8);
    batch.box(M.woodDark, 0.94, 0.06, 0.7, 3.0 + (i % 2) * 0.35, 0.6 + i * 0.6, -4.8);
  }
  for (let i = 0; i < 5; i++) {
    mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 7), i % 2 ? M.woodLight : M.wood, {
      parent: root,
      x: 1.9 + i * 0.23,
      y: 0.34 + (i % 3) * 0.18,
      z: -4.92,
      rz: Math.PI / 2,
      cast: true,
    });
  }
  // small shelf and a lantern bracket on the back wall
  batch.box(M.woodDark, 1.1, 0.08, 0.34, -2.4, 1.48, -4.5);
  mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), M.paperCool, { parent: root, x: -2.4, y: 1.72, z: -4.5, cast: true });

  // the side wall keeps only the pair of rear windows; no extra lit side door

  /* ---- railing ---- */
  const railY = 0.74;
  const railTop = 1.52;
  const railSections = [
    { z: deckFrontZ + 0.02, x0: -4.08, x1: -1.92, vertical: false },
    { z: deckFrontZ + 0.02, x0: 1.92, x1: 4.08, vertical: false },
    { x: -4.08, z0: 0.62, z1: deckFrontZ, vertical: true },
    { x: 4.08, z0: 0.62, z1: deckFrontZ, vertical: true },
  ];
  for (const sec of railSections) {
    if (!sec.vertical) {
      const len = sec.x1 - sec.x0;
      const n = Math.max(2, Math.round(len / 0.62));
      for (let i = 0; i <= n; i++) {
        const xx = sec.x0 + (i * len) / n;
        batch.box(M.red, 0.09, 0.86, 0.09, xx, railY + 0.43, sec.z);
        batch.add(new THREE.SphereGeometry(0.07, 8, 6), M.brass, [xx, railY + 0.9, sec.z]);
      }
      batch.box(M.red, len + 0.1, 0.11, 0.19, (sec.x0 + sec.x1) / 2, railTop, sec.z);
      batch.box(M.red, len + 0.05, 0.07, 0.13, (sec.x0 + sec.x1) / 2, railY + 0.38, sec.z);
      batch.box(M.redDark, len + 0.05, 0.06, 0.13, (sec.x0 + sec.x1) / 2, railY + 0.08, sec.z);
    } else {
      const len = sec.z1 - sec.z0;
      const n = Math.max(2, Math.round(len / 0.62));
      for (let i = 0; i <= n; i++) {
        const zz = sec.z0 + (i * len) / n;
        batch.box(M.red, 0.09, 0.86, 0.09, sec.x, railY + 0.43, zz);
        batch.add(new THREE.SphereGeometry(0.07, 8, 6), M.brass, [sec.x, railY + 0.9, zz]);
      }
      batch.box(M.red, 0.19, 0.11, len + 0.1, sec.x, railTop, (sec.z0 + sec.z1) / 2);
      batch.box(M.red, 0.13, 0.07, len + 0.05, sec.x, railY + 0.38, (sec.z0 + sec.z1) / 2);
      batch.box(M.redDark, 0.13, 0.06, len + 0.05, sec.x, railY + 0.08, (sec.z0 + sec.z1) / 2);
    }
  }

  /* ---- steps ---- */
  const stepCount = 5;
  const stepRise = 0.128;
  const stepRun = 0.34;
  const stepW = 3.32;
  for (let i = 0; i < stepCount; i++) {
    const topY = 0.64 - (i + 1) * stepRise;
    const zz = 2.38 + i * stepRun;
    batch.box(i % 2 ? M.stoneLight : M.stone, stepW, 0.105, stepRun + 0.03, 0, topY - 0.052, zz);
    batch.box(M.stoneDark, stepW, 0.08, 0.05, 0, topY - stepRise + 0.02, zz + stepRun / 2);
    // side stringers
    for (const s of [-1, 1]) {
      batch.box(M.redDark, 0.16, 0.16, stepRun + 0.08, s * (stepW / 2 + 0.04), topY - 0.08, zz);
    }
  }
  // bottom stone landing
  batch.box(M.stone, stepW + 1.1, 0.1, 0.75, 0, 0.02, 4.07);
  batch.box(M.stoneDark, stepW + 0.9, 0.08, 0.62, 0, -0.02, 4.27);
  // step handrails
  for (const s of [-1, 1]) {
    const xr = s * (stepW / 2 + 0.12);
    for (const [zz, yy] of [
      [2.45, 0.84],
      [3.94, 0.24],
    ]) {
      batch.box(M.red, 0.1, 1.02, 0.1, xr, yy + 0.5, zz);
      batch.add(new THREE.SphereGeometry(0.075, 8, 6), M.brass, [xr, yy + 1.03, zz]);
    }
    // sloped top rail, built from short segments
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6;
      const zz = 2.45 + t * 1.49;
      const yy = 1.44 - t * 0.6;
      batch.box(M.red, 0.11, 0.11, 0.27, xr, yy, zz, 0, 0, 0);
    }
    batch.box(M.red, 0.1, 0.55, 0.1, xr, 1.12, 2.85);
  }

  /* ---- side storage, barrel, broom ---- */
  const rnd = seeded(44);
  // crate
  batch.box(M.wood, 0.82, 0.58, 0.56, 3.25, 0.32, 2.74);
  batch.box(M.woodLight, 0.86, 0.07, 0.6, 3.25, 0.62, 2.74);
  batch.box(M.woodDark, 0.08, 0.58, 0.6, 2.88, 0.32, 2.74);
  batch.box(M.woodDark, 0.08, 0.58, 0.6, 3.62, 0.32, 2.74);
  batch.box(M.brass, 0.1, 0.06, 0.04, 3.25, 0.42, 3.03);
  // second crate stacked
  batch.box(M.woodLight, 0.62, 0.42, 0.46, 3.22, 0.88, 2.76, 0.08);
  batch.box(M.wood, 0.66, 0.05, 0.5, 3.22, 1.1, 2.76, 0.08);
  // barrel
  const barrel = new THREE.Group();
  barrel.position.set(-3.3, 0.07, 2.86);
  barrel.rotation.y = 0.2;
  root.add(barrel);
  const bmat = M.wood;
  mesh(new THREE.CylinderGeometry(0.29, 0.26, 0.7, 12), bmat, { parent: barrel, y: 0.35, cast: true });
  mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.06, 12), M.woodDark, { parent: barrel, y: 0.7, cast: true });
  for (const yy of [0.14, 0.36, 0.58]) {
    mesh(new THREE.TorusGeometry(0.29, 0.022, 5, 12), M.brass, { parent: barrel, y: yy, rx: Math.PI / 2, cast: false });
  }
  // broom leaning by the crate
  const broom = new THREE.Group();
  broom.position.set(-4.42, 0.02, 2.5);
  broom.rotation.z = -0.22;
  broom.rotation.y = 0.5;
  root.add(broom);
  mesh(new THREE.CylinderGeometry(0.022, 0.026, 1.65, 6), M.woodLight, { parent: broom, y: 0.84, cast: true });
  mesh(new THREE.ConeGeometry(0.13, 0.38, 7), M.rope, { parent: broom, y: 0.2, cast: true });
  mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 6), M.ropeDark, { parent: broom, y: 0.4, cast: false });

  batch.build(root);

  // two lit rear windows flanking the service door, matching the front shoji
  const rearWinL = shoji(root, {
    w: 1.2, h: 1.02, x: -2.56, y: 2.24, z: -4.35, ry: Math.PI, cols: 3, rows: 3, sill: true,
  });
  const rearWinR = shoji(root, {
    w: 1.2, h: 1.02, x: 2.6, y: 2.24, z: -4.35, ry: Math.PI, cols: 3, rows: 3, sill: true,
  });
  windows.push(rearWinL.mat, rearWinR.mat);

  /* ---- main roof ---- */
  const roof = buildRoof(root, {
    width: 9.55,
    depth: 6.35,
    eaveY: 3.62,
    ridgeY: 5.42,
    ridgeLen: 5.0,
    upturn: 0.74,
    position: [0, 0, -1.52],
    rotation: [0, 0, 0],
    cornerStart: 0.55,
    cols: 32,
    rows: 12,
  });
  roof.name = 'main-roof';

  // generous rafters / soffit already in buildRoof; add a red beam under the eave
  batch.box(M.redDark, 8.1, 0.22, 0.26, 0, 3.54, 1.4);
  batch.box(M.plaster, 8.0, 0.2, 0.2, 0, 3.56, 1.28);
  // dark flashing/eave board closes the junction where the porch canopy tucks
  // under the main roof, instead of leaving a thin dark seam.
  batch.box(M.roofDark, 6.95, 0.06, 0.18, 0, 3.58, 1.52);
  mesh(new THREE.CylinderGeometry(0.045, 0.045, 6.6, 7), M.roofDark, {
    parent: root,
    x: 0,
    y: 3.49,
    z: 1.73,
    rz: Math.PI / 2,
    cast: false,
  });
  batch.build(root);

  /* ---- ornamental gable (chidori hafu) on the front roof slope ---- */
  const pediment = new THREE.Group();
  pediment.position.set(0, 4.03, 0.84);
  root.add(pediment);
  const gShape = new THREE.Shape();
  gShape.moveTo(-1.24, 0);
  gShape.lineTo(1.24, 0);
  gShape.lineTo(0, 0.78);
  gShape.closePath();
  const gGeom = new THREE.ShapeGeometry(gShape);
  mesh(gGeom, M.plaster, { parent: pediment, z: -0.02, cast: true, receive: true });
  mesh(gGeom, M.woodDark, { parent: pediment, z: -0.075, cast: true, receive: true });
  const slopeLen = Math.hypot(1.3, 0.82);
  const slopeAng = Math.atan2(0.78, 1.24);
  for (const s of [-1, 1]) {
    mesh(new THREE.BoxGeometry(slopeLen, 0.15, 0.2), M.roofDark, {
      parent: pediment,
      x: s * 0.64,
      y: 0.38,
      z: 0.03,
      rz: -s * slopeAng,
      cast: true,
    });
    mesh(new THREE.BoxGeometry(slopeLen * 0.92, 0.07, 0.1), M.woodLight, {
      parent: pediment,
      x: s * 0.63,
      y: 0.34,
      z: 0.12,
      rz: -s * slopeAng,
      cast: false,
    });
    mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 8), M.brass, {
      parent: pediment,
      x: s * 1.23,
      y: 0.0,
      z: 0.12,
      rx: Math.PI / 2,
      cast: false,
    });
  }
  const orn = mesh(new THREE.OctahedronGeometry(0.17, 0), M.gold, { parent: pediment, y: 0.42, z: 0.12, cast: true });
  orn.scale.set(0.7, 1.2, 0.7);
  mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.07, 8), M.brass, { parent: pediment, y: 0.28, z: 0.12, rx: Math.PI / 2 });
  // tile sill under the ornamental gable hides the seam where it meets the slope
  mesh(new THREE.BoxGeometry(2.72, 0.16, 0.48), M.roofDark, {
    parent: root,
    y: 3.97,
    z: 0.86,
    cast: true,
    receive: true,
  });
  mesh(new THREE.BoxGeometry(2.5, 0.07, 0.12), M.roofLight, {
    parent: root,
    y: 4.06,
    z: 0.94,
    cast: false,
  });
  mesh(new THREE.BoxGeometry(2.55, 0.1, 0.16), M.woodDark, { parent: root, y: 3.99, z: 0.82, cast: true });

  /* ---- ritual objects ---- */
  /* ---- rear rain gutter and downpipes ---- */
  mesh(new THREE.CylinderGeometry(0.075, 0.075, 8.55, 8), M.roofDark, {
    parent: root,
    x: 0,
    y: 3.46,
    z: -4.36,
    rz: Math.PI / 2,
    cast: true,
  });
  for (const s of [-1, 1]) {
    mesh(new THREE.CylinderGeometry(0.058, 0.058, 2.85, 7), M.roofDark, {
      parent: root,
      x: s * 4.08,
      y: 2.02,
      z: -4.34,
      cast: true,
    });
    mesh(new THREE.SphereGeometry(0.09, 8, 6), M.roofDark, {
      parent: root,
      x: s * 4.08,
      y: 3.43,
      z: -4.34,
      cast: false,
    });
    for (let i = 0; i < 3; i++) {
      mesh(new THREE.BoxGeometry(0.16, 0.045, 0.16), M.woodDark, {
        parent: root,
        x: s * 4.08,
        y: 2.55 + i * 0.55,
        z: -4.28,
        cast: false,
      });
    }
  }
  /* ---- projecting porch canopy over the offering steps ---- */
  const porchRoof = buildGableRoof(root, {
    width: 5.4,
    depth: 2.0,
    eaveY: 2.9,
    ridgeY: 3.42,
    upturn: 0.16,
    overhangX: 0.32,
    position: [0, 0, 2.45],
    gableMaterial: M.plaster,
    finials: true,
  });
  porchRoof.name = 'porch-roof';
  batch.build(root);
  for (const s of [-1, 1]) {
    mesh(new THREE.CylinderGeometry(0.085, 0.1, 2.02, 8), M.redDark, {
      parent: root,
      x: s * 2.48,
      y: 2.12,
      z: 2.22,
      cast: true,
      receive: true,
    });
    mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.1, 8), M.brass, {
      parent: root,
      x: s * 2.48,
      y: 3.12,
      z: 2.22,
      cast: true,
    });
  }

  const ritual = buildRitual(root, { eaveY: 2.72, ropeZ: 2.98, bellZ: 3.0, lanternZ: 2.72 });
  const saisen = buildSaisenBako(root, { x: 0, y: 0, z: 4.42, ry: 0 });

  // a wooden offering shelf / box on the veranda
  batch.box(M.woodDark, 1.25, 0.09, 0.55, 0, 0.86, 0.92);
  batch.box(M.wood, 1.1, 0.28, 0.4, 0, 0.68, 0.92);
  for (const s of [-1, 1]) batch.box(M.woodDark, 0.08, 0.7, 0.08, s * 0.56, 0.4, 0.92);
  batch.build(root);

  /* ---- warm interior light ---- */
  const interiorLight = new THREE.PointLight(0xffb066, 0, 6.5, 2);
  interiorLight.position.set(0, 1.75, -0.1);
  root.add(interiorLight);

  // side lantern near the steps, so the entrance reads at night
  const lantern = buildStoneLantern(root, { x: 3.55, y: 0.02, z: 4.0, scale: 0.82, ry: -0.25, withLight: true });

  const update = (t, night, dt = 0) => {
    // slide the leaves toward the requested state; exponential smoothing keeps
    // the motion frame-rate independent and settles without a visible stop
    if (doorState.open !== doorState.target) {
      const step = 1 - Math.exp(-Math.max(0, dt) * 6.5);
      doorState.open += (doorState.target - doorState.open) * step;
      if (Math.abs(doorState.target - doorState.open) < 0.002) doorState.open = doorState.target;
      applyDoor(doorState.open);
    }
    ritual.update(t, night);
    for (const m of windows) m.emissiveIntensity = night * (1.05 + 0.08 * Math.sin(t * 1.7 + m.id));
    interiorLight.intensity = night * 3.6;
    lantern.windows.forEach((m, i) => (m.emissiveIntensity = night * (0.8 + 0.1 * Math.sin(t * 3.1 + i))));
    lantern.glow.material.opacity = night * 0.22;
    if (lantern.point) lantern.point.intensity = night * 1.2;
  };

  root.scale.y = 1.1;

  return {
    group: root,
    windows,
    interiorLight,
    update,
    ritual,
    saisen,
    lantern,
    doors: { left: leftDoor, right: rightDoor },
    doorHit,
    setDoor,
    toggleDoor,
    isDoorOpen: () => doorState.target > 0.5,
  };
}

/* ------------------------------------------------------------------ */
/* Shrine office (shamusho)                                            */
/* ------------------------------------------------------------------ */
export function buildOffice(parent, opts = {}) {
  const { x = 6.9, y = 0.56, z = -2.0, ry = 0 } = opts;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = ry;
  root.name = 'shrine-office';
  parent.add(root);
  const batch = new Batcher();
  const windows = [];

  // base + floor: runs back under the veranda so nothing floats
  batch.box(M.stoneDark, 4.15, 0.26, 5.1, 0, 0.13, 0.45);
  batch.box(M.stone, 4.28, 0.08, 5.22, 0, 0.28, 0.45);
  batch.box(M.woodDeep, 3.75, 0.1, 3.35, 0, 0.31, 0);
  for (let i = 0; i < 7; i++) {
    batch.box(i % 2 ? M.wood : M.woodLight, 0.52, 0.04, 3.2, -1.53 + i * 0.51, 0.38, 0);
  }
  // stone facing at the front and sides of the plinth
  for (let i = 0; i < 5; i++) {
    batch.box(i % 2 ? M.stone : M.stoneLight, 0.78, 0.2, 0.08, -1.56 + i * 0.78, 0.14, 3.01);
    batch.box(i % 3 ? M.stoneLight : M.stoneDark, 0.78, 0.14, 0.08, -1.56 + i * 0.78, 0.29, 3.01);
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      batch.box(i % 2 ? M.stone : M.stoneLight, 0.08, 0.22, 0.84, s * 2.08, 0.15, -1.5 + i * 0.95);
    }
  }

  const wallH = 2.62;
  const baseY = 0.4;
  // side walls
  for (const s of [-1, 1]) {
    batch.box(M.plaster, 0.16, wallH, 3.1, s * 1.8, baseY + wallH / 2, 0);
    batch.box(M.woodDark, 0.2, 0.36, 3.15, s * 1.8, baseY + 0.18, 0);
    for (const pz of [-1.45, 0, 1.45]) batch.box(M.woodDark, 0.22, wallH, 0.1, s * 1.8, baseY + wallH / 2, pz);
    // side lattice window centred between the structural posts
    const w = shoji(root, {
      w: 0.9,
      h: 0.9,
      x: s * 1.9,
      y: 1.62,
      z: -0.76,
      ry: s > 0 ? Math.PI / 2 : -Math.PI / 2,
      cols: 3,
      rows: 3,
    });
    windows.push(w.mat);
    batch.box(M.roofDark, 0.42, 0.05, 1.18, s * 2.0, 2.18, -0.76, 0, 0, s * 0.12);
  }
  // front wall: door opening on the left, window on the right
  batch.box(M.plaster, 3.1, wallH, 0.18, 0, baseY + wallH / 2, 1.55);
  // cut the door by layering the wall around it (a dark opening reads as an open door)
  batch.box(M.woodDeep, 0.94, 1.7, 0.2, -1.0, 1.25, 1.56);
  batch.box(M.woodDeep, 0.94, 0.1, 0.22, -1.0, 0.4, 1.56);
  // sliding paper door pushed to the right of the opening
  const od = shoji(root, { w: 0.62, h: 1.62, x: -0.28, y: 1.24, z: 1.68, cols: 3, rows: 5, sill: false });
  windows.push(od.mat);
  batch.box(M.woodDark, 0.66, 1.76, 0.08, -0.28, 1.24, 1.62);
  // window right of door
  const ow = shoji(root, { w: 0.82, h: 0.88, x: 1.1, y: 1.7, z: 1.66, cols: 3, rows: 3 });
  windows.push(ow.mat);
  // front red base band and posts
  batch.box(M.woodDark, 3.6, 0.34, 0.24, 0, 0.57, 1.6);
  for (const px of [-1.68, 1.68]) batch.box(M.woodDark, 0.16, 2.55, 0.2, px, 1.66, 1.62);
  batch.box(M.woodDark, 3.5, 0.16, 0.22, 0, 2.78, 1.6);
  // upper frieze and a transom window above the office entrance
  batch.box(M.plaster, 3.1, 0.4, 0.2, 0, 2.82, 1.55);
  batch.box(M.woodDark, 3.24, 0.07, 0.24, 0, 2.62, 1.58);
  // rear wall closes the service side
  batch.box(M.plaster, 3.1, wallH, 0.18, 0, baseY + wallH / 2, -1.55);
  batch.box(M.woodDark, 3.2, 0.4, 0.22, 0, 0.6, -1.56);
  batch.box(M.woodDark, 3.2, 0.14, 0.22, 0, 2.96, -1.56);
  for (const px of [-1.55, -0.1, 1.55]) batch.box(M.woodDark, 0.14, wallH, 0.2, px, baseY + wallH / 2, -1.57);
  const rearDoor = shoji(root, { w: 0.9, h: 1.72, x: -0.82, y: 1.48, z: -1.66, ry: Math.PI, cols: 3, rows: 5, sill: false });
  windows.push(rearDoor.mat);
  const rearWin = shoji(root, { w: 0.86, h: 0.8, x: 0.86, y: 2.12, z: -1.66, ry: Math.PI, cols: 3, rows: 3, sill: true });
  windows.push(rearWin.mat);
  // rear rainwater pipe and a service shelf
  mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), M.roofDark, {
    parent: root,
    x: 1.62,
    y: 1.85,
    z: -1.73,
    cast: true,
  });
  batch.box(M.woodDark, 0.9, 0.08, 0.3, 0.75, 1.35, -1.72);
  batch.box(M.wood, 0.28, 0.36, 0.26, 0.55, 1.55, -1.72);
  // firewood and a crate tucked behind the office
  for (let i = 0; i < 4; i++) {
    mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.7, 7), i % 2 ? M.woodLight : M.wood, {
      parent: root,
      x: -1.35 + i * 0.21,
      y: 0.28 + (i % 2) * 0.16,
      z: -1.94,
      rz: Math.PI / 2,
      cast: true,
    });
  }
  batch.box(M.wood, 0.62, 0.5, 0.48, 1.25, 0.26, -1.98);

  // veranda
  const deck = new THREE.Group();
  root.add(deck);
  for (let i = 0; i < 6; i++) {
    batch.box(i % 2 ? M.woodLight : M.wood, 0.6, 0.07, 0.82, -1.5 + i * 0.6, 0.43, 2.0);
  }
  batch.box(M.woodDark, 3.7, 0.12, 0.12, 0, 0.36, 2.4);
  for (const s of [-1, 1]) batch.box(M.woodDark, 0.12, 0.42, 0.12, s * 1.7, 0.16, 2.3);
  // step
  batch.box(M.woodLight, 1.5, 0.12, 0.42, 0, 0.3, 2.62);
  batch.box(M.stone, 1.7, 0.18, 0.55, 0, 0.12, 2.64);

  // interior glimpse: desk, cushion, tea set, warm light
  batch.box(M.woodDeep, 2.4, 0.06, 2.2, 0, 0.42, 0.0);
  batch.box(M.wood, 1.25, 0.62, 0.6, -0.25, 0.75, 0.55);
  batch.box(M.woodLight, 1.35, 0.06, 0.7, -0.25, 1.08, 0.55);
  batch.box(M.red, 0.55, 0.07, 0.5, -0.2, 0.47, 1.02);
  mesh(new THREE.SphereGeometry(0.12, 10, 8), M.paperCool, { parent: root, x: 0.1, y: 1.14, z: 0.55, cast: false });
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8), M.paperCool, { parent: root, x: 0.34, y: 1.12, z: 0.55, cast: false });
  // scroll on the back wall
  batch.box(M.paperCool, 0.42, 0.95, 0.02, 0.6, 1.7, -1.42);
  batch.box(M.woodDark, 0.48, 0.05, 0.04, 0.6, 2.19, -1.41);
  batch.box(M.ink, 0.22, 0.45, 0.012, 0.6, 1.74, -1.4);

  // office sign
  const signTex = textTexture('社務所', {
    w: 420,
    h: 150,
    bg: '#33271f',
    fg: '#e0c590',
    border: '#a98b55',
    borderWidth: 6,
    font: '700 68px "Yu Mincho", serif',
    radius: 4,
  });
  batch.box(M.woodDeep, 1.68, 0.52, 0.08, 0, 2.53, 1.7);
  batch.build(root);
  mesh(new THREE.BoxGeometry(1.7, 0.54, 0.1), M.woodDeep, { parent: root, y: 2.63, z: 1.72, cast: true });
  signPlane(root, signTex, 1.54, 0.42, { y: 2.63, z: 1.78 });

  // roof, gable facing front; extended to cover the veranda
  const roof = buildGableRoof(root, {
    width: 5.2,
    depth: 4.3,
    eaveY: 3.0,
    ridgeY: 3.92,
    upturn: 0.18,
    position: [0, 0, 0.35],
    rotation: [0, Math.PI / 2, 0],
    gableMaterial: M.plaster,
    overhangX: 0.22,
    finials: true,
  });
  roof.name = 'office-roof';
  mesh(new THREE.OctahedronGeometry(0.11, 0), M.gold, { parent: root, x: 0, y: 3.48, z: 2.02, cast: true });

  // hanging lantern + broom + storage
  // the lantern hangs from a short bracket off the office wall, so it no
  // longer floats in front of the doorway
  mesh(new THREE.BoxGeometry(0.08, 0.08, 0.62), M.woodDark, { parent: root, x: -1.25, y: 2.55, z: 1.78, cast: true });
  mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), M.woodDark, {
    parent: root,
    x: -1.25,
    y: 2.42,
    z: 1.82,
    rx: 0,
    ry: 0,
    rz: 0.72,
    cast: true,
  });
  const lan = buildHangingLantern(root, { x: -1.25, y: 2.45, z: 1.95, scale: 0.85 });
  const broom = new THREE.Group();
  broom.position.set(1.55, 0.1, 2.38);
  broom.rotation.z = 0.2;
  root.add(broom);
  mesh(new THREE.CylinderGeometry(0.02, 0.024, 1.45, 6), M.woodLight, { parent: broom, y: 0.75, cast: true });
  mesh(new THREE.ConeGeometry(0.11, 0.32, 7), M.rope, { parent: broom, y: 0.18, cast: true });

  // small barrel at the side
  const barrel = mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.62, 12), M.wood, { parent: root, x: -1.55, y: 0.35, z: 2.3, cast: true });
  for (const yy of [0.18, 0.34, 0.5]) {
    mesh(new THREE.TorusGeometry(0.255, 0.02, 5, 12), M.brass, { parent: root, x: -1.55, y: yy, z: 2.3, rx: Math.PI / 2, cast: false });
  }

  const light = new THREE.PointLight(0xffb066, 0, 5.5, 2);
  light.position.set(0, 1.7, 0.5);
  root.add(light);

  const update = (t, night) => {
    for (const m of windows) m.emissiveIntensity = night * 0.7;
    light.intensity = night * 1.6;
    lan.update(t, night);
  };

  return { group: root, windows, light, update };
}

/* ------------------------------------------------------------------ */
/* Small auxiliary shrine (hokora)                                     */
/* ------------------------------------------------------------------ */
export function buildHokora(parent, opts = {}) {
  const { x = -7.2, y = 0.56, z = -6.2, ry = 0.25 } = opts;
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = ry;
  root.name = 'hokora';
  parent.add(root);
  const batch = new Batcher();
  const windows = [];

  // stone base and steps
  batch.box(M.stoneDark, 1.9, 0.26, 1.65, 0, 0.13, 0);
  batch.box(M.stone, 1.75, 0.1, 1.5, 0, 0.31, 0);
  for (let i = 0; i < 3; i++) {
    batch.box(M.stoneLight, 0.95, 0.08, 0.3, 0, 0.22 - i * 0.07, 0.95 + i * 0.24);
  }
  // body
  batch.box(M.plaster, 1.28, 1.05, 0.88, 0, 0.9, 0);
  batch.box(M.redDark, 1.36, 0.35, 0.96, 0, 0.5, 0);
  for (const s of [-1, 1]) {
    for (const zz of [-0.4, 0.4]) batch.box(M.red, 0.12, 1.16, 0.12, s * 0.66, 1.0, zz);
    batch.box(M.red, 0.12, 0.12, 0.9, s * 0.66, 1.56, 0);
  }
  batch.box(M.red, 1.45, 0.13, 0.96, 0, 1.51, 0);
  // little doors
  const hd = shoji(root, { w: 0.52, h: 0.76, x: 0, y: 0.95, z: 0.46, cols: 2, rows: 4, sill: false });
  windows.push(hd.mat);
  batch.box(M.gold, 0.05, 0.08, 0.03, -0.16, 1.0, 0.49);
  batch.box(M.gold, 0.05, 0.08, 0.03, 0.16, 1.0, 0.49);
  // tiny offering box
  batch.box(M.woodDark, 0.45, 0.22, 0.26, 0, 0.42, 0.85);
  batch.box(M.wood, 0.5, 0.05, 0.32, 0, 0.55, 0.85);

  const roof = buildGableRoof(root, {
    width: 1.85,
    depth: 2.15,
    eaveY: 1.56,
    ridgeY: 2.15,
    upturn: 0.12,
    position: [0, 0, -0.05],
    rotation: [0, Math.PI / 2, 0],
    gableMaterial: M.plaster,
    overhangX: 0.16,
    finials: true,
  });
  roof.name = 'hokora-roof';
  mesh(new THREE.OctahedronGeometry(0.08, 0), M.gold, { parent: root, x: 0, y: 1.91, z: 1.03, cast: true });

  const shide = buildShide(root, { x: 0, y: 1.48, z: 0.52, scale: 0.65, phase: 0.5 });
  // small stone lanterns at the sides
  const l1 = buildStoneLantern(root, { x: -1.25, y: 0, z: 0.3, scale: 0.42, ry: 0 });
  const l2 = buildStoneLantern(root, { x: 1.25, y: 0, z: 0.3, scale: 0.42, ry: 0 });

  buildTorii(root, { x: 0, y: 0, z: 1.95, scale: 0.34, plaque: false });
  batch.build(root);

  const update = (t, night) => {
    shide.pivot.rotation.z = Math.sin(t * 1.4) * 0.12;
    for (const m of windows) m.emissiveIntensity = night * 0.55;
    for (const l of [l1, l2]) {
      l.windows.forEach((m) => (m.emissiveIntensity = night * 0.7));
      l.glow.material.opacity = night * 0.18;
    }
  };
  return { group: root, windows, update };
}
