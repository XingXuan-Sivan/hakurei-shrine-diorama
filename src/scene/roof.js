import * as THREE from 'three';
import { M, Batcher, mesh, rbox, tex, C } from '../palette.js';

/* ------------------------------------------------------------------ */
/* Small geometry utilities                                            */
/* ------------------------------------------------------------------ */
function surface(fn, cols, rows, uvFn) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const u = i / cols;
      const v = j / rows;
      const p = fn(u, v);
      pos.push(p.x, p.y, p.z);
      const q = uvFn ? uvFn(u, v, p) : [u, v];
      uv.push(q[0], q[1]);
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const b = a + 1;
      const c = a + cols + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function orient(g, expected) {
  g.computeVertexNormals();
  const n = g.attributes.normal;
  const e = new THREE.Vector3(expected[0], expected[1], expected[2]);
  let dot = 0;
  for (let i = 0; i < n.count; i++) {
    dot += n.getX(i) * e.x + n.getY(i) * e.y + n.getZ(i) * e.z;
  }
  if (dot < 0) {
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1];
      idx[i + 1] = idx[i + 2];
      idx[i + 2] = t;
    }
    g.index.needsUpdate = true;
    g.computeVertexNormals();
  }
  return g;
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Japanese hip roof with a gently concave slope and upturned corners.
 * Ridge runs along X. Front is +Z.
 */
export function buildRoof(parent, opts = {}) {
  const {
    width = 10,
    depth = 8,
    eaveY = 4.1,
    ridgeY = 6.3,
    ridgeLen = width * 0.55,
    upturn = 0.26,
    cornerStart = 0.58,
    cols = 26,
    rows = 8,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    ridgeCap = true,
    fascia = true,
    rafters = true,
    finials = true,
  } = opts;

  const W = width;
  const D = depth;
  const R = Math.min(ridgeLen, W * 0.92);
  const drop = ridgeY - eaveY;
  const root = new THREE.Group();
  root.position.set(position[0], position[1], position[2]);
  root.rotation.set(rotation[0], rotation[1], rotation[2]);
  parent.add(root);

  const corner = (u) => Math.pow(smoothstep(cornerStart, 1, Math.abs(u * 2 - 1)), 2);
  const yAt = (v) => eaveY + drop * Math.pow(1 - v, 1.16);

  const edgePoint = (u, front) => {
    const x = (u - 0.5) * W;
    const z = (front ? 1 : -1) * (D / 2 + 0.03 + corner(u) * 0.06);
    const y = yAt(1) + upturn * Math.pow(1, 3) * corner(u);
    return new THREE.Vector3(x, y, z);
  };

  // front / back slopes
  const makeSlope = (front) =>
    surface(
      (u, v) => {
        const x0 = (u - 0.5) * R;
        const x1 = (u - 0.5) * W;
        const x = THREE.MathUtils.lerp(x0, x1, Math.pow(v, 0.9));
        const z = (front ? 1 : -1) * (D / 2 + 0.03) * Math.pow(v, 0.92);
        const y = yAt(v) + upturn * Math.pow(v, 3) * corner(u);
        return new THREE.Vector3(x, y, z);
      },
      cols,
      rows,
      (u, v, p) => [xUv(p.x), slopeUv(v, drop, D)],
    );

  const front = orient(makeSlope(true), [0, 1, 1]);
  const back = orient(makeSlope(false), [0, 1, -1]);
  const roofMat = M.roof.clone();
  roofMat.side = THREE.DoubleSide;
  const frontMesh = mesh(front, roofMat, { cast: true, receive: true, parent: root });
  const backMesh = mesh(back, roofMat, { cast: true, receive: true, parent: root });

  // hip ends
  const makeHip = (sign) => {
    const hcols = 12;
    const hrows = 6;
    return surface(
      (u, v) => {
        // u runs along the eave edge (z), v from ridge end down to eave
        const ez = (u - 0.5) * D;
        const ex = sign * (W / 2 + 0.03);
        const ey = eaveY + upturn * Math.pow(v, 3) * corner(u);
        const ax = sign * (R / 2);
        const ay = ridgeY;
        const t = Math.pow(v, 0.92);
        return new THREE.Vector3(
          THREE.MathUtils.lerp(ax, ex, t),
          THREE.MathUtils.lerp(ay, ey, Math.pow(v, 1.12)) + upturn * Math.pow(v, 3) * corner(u) * 0.15,
          ez * Math.pow(v, 0.9),
        );
      },
      hcols,
      hrows,
      (u, v, p) => [xUv(p.z), slopeUv(v, drop, D * 0.9)],
    );
  };

  const hipL = orient(makeHip(-1), [-1, 1, 0]);
  const hipR = orient(makeHip(1), [1, 1, 0]);
  mesh(hipL, roofMat, { cast: true, receive: true, parent: root });
  mesh(hipR, roofMat, { cast: true, receive: true, parent: root });

  const batch = new Batcher();

  // eave fascia band (front and back)
  if (fascia) {
    const makeFascia = (front) => {
      const pts = [];
      const n = 30;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const p = edgePoint(u, front);
        pts.push(p);
      }
      // thin ribbon following the edge
      const pos = [];
      const idx = [];
      let k = 0;
      for (const p of pts) {
        pos.push(p.x, p.y + 0.01, p.z);
        pos.push(p.x, p.y - 0.17, p.z + (front ? 0.045 : -0.045));
        if (k > 0) {
          const a = (k - 1) * 2;
          idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
        k++;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      const mm = new THREE.Mesh(g, M.plaster);
      mm.material.side = THREE.DoubleSide;
      mm.castShadow = true;
      mm.receiveShadow = true;
      root.add(mm);
    };
    makeFascia(true);
    makeFascia(false);

    // side eaves
    const makeSideFascia = (sign) => {
      const pos = [];
      const idx = [];
      let k = 0;
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        const z = (u - 0.5) * D;
        const y = eaveY + upturn * corner(u);
        const x = sign * (W / 2 + 0.03);
        pos.push(x + sign * 0.04, y + 0.01, z);
        pos.push(x + sign * 0.04, y - 0.17, z);
        if (k > 0) {
          const a = (k - 1) * 2;
          idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
        k++;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      const mm = new THREE.Mesh(g, M.plaster);
      mm.material.side = THREE.DoubleSide;
      mm.castShadow = true;
      mm.receiveShadow = true;
      root.add(mm);
    };
    makeSideFascia(-1);
    makeSideFascia(1);
  }

  // hip ridges
  const hipCurve = (sign) => {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const v = i / 10;
      const ez = sign * (D / 2 + 0.02);
      const ex = (sign > 0 ? 1 : -1) * (W / 2 + 0.02);
      const t = Math.pow(v, 0.92);
      const ax = (sign > 0 ? 1 : -1) * (R / 2);
      const y = THREE.MathUtils.lerp(ridgeY, eaveY + upturn, Math.pow(v, 1.12));
      pts.push(new THREE.Vector3(THREE.MathUtils.lerp(ax, ex, t), y + 0.05, ez * Math.pow(v, 0.9)));
    }
    return pts;
  };
  // The four hip seams get a dark tile ridge, so they read as a roof joint
  // rather than a black gap. The path is sampled from the surface edge.
  for (const s of [-1, 1]) {
    for (const f of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const v = i / 14;
        pts.push(new THREE.Vector3(
          s * (R / 2 + (W / 2 - R / 2) * Math.pow(v, 0.9)),
          yAt(v) + upturn * Math.pow(v, 3) + 0.035,
          f * (D / 2 + 0.035) * Math.pow(v, 0.92),
        ));
      }
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      batch.add(new THREE.TubeGeometry(curve, 20, 0.055, 6, false), M.roofDark);
      // a small upturned tile cap at the eave end of each hip
      const tip = pts[pts.length - 1];
      batch.box(M.roofDark, 0.26, 0.14, 0.26, tip.x, tip.y, tip.z, 0, 0, 0);
    }
  }

  // The hip faces keep their clean tiled silhouette below this low ridge cap.

  if (ridgeCap) {
    batch.add(
      new THREE.CylinderGeometry(0.14, 0.17, R + 0.5, 8, 1),
      M.roofDark,
      [0, ridgeY + 0.08, 0],
      [0, 0, Math.PI / 2],
    );
    batch.add(
      new THREE.BoxGeometry(R + 0.4, 0.1, 0.38),
      M.roofLight,
      [0, ridgeY + 0.17, 0],
    );
    if (finials) {
      for (const s of [-1, 1]) {
        batch.add(new THREE.BoxGeometry(0.34, 0.42, 0.46), M.roofDark, [s * (R / 2 + 0.24), ridgeY + 0.06, 0]);
        batch.add(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 8), M.brass, [s * (R / 2 + 0.24), ridgeY + 0.32, 0]);
        batch.add(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 8), M.brass, [s * (R / 2 + 0.24), ridgeY + 0.39, 0]);
      }
    }
  }

  // rafter ends under the eaves
  if (rafters) {
    const count = 22;
    for (const front of [true, false]) {
      for (let i = 0; i < count; i++) {
        const u = (i + 0.5) / count;
        const x = (u - 0.5) * (W - 0.25);
        const z = (front ? 1 : -1) * (D / 2 - 0.06);
        const y = eaveY - 0.2 + upturn * corner(u) * 0.6;
        batch.box(M.woodDark, 0.075, 0.085, 0.62, x, y, z, 0, (front ? -1 : 1) * 0.12, 0);
        batch.box(M.woodLight, 0.085, 0.1, 0.06, x, y - 0.01, z + (front ? 0.31 : -0.31));
      }
    }
  }

  // bracket blocks at the eave, four visible sides
  const bracket = (x, y, z, ry = 0) => {
    batch.box(M.redDark, 0.32, 0.15, 0.3, x, y, z, ry);
    batch.box(M.woodDark, 0.24, 0.14, 0.36, x, y + 0.15, z, ry);
    batch.box(M.red, 0.42, 0.12, 0.4, x, y + 0.29, z, ry);
  };
  for (let i = 0; i < 8; i++) {
    const x = -W / 2 + 0.7 + (i * (W - 1.4)) / 7;
    bracket(x, eaveY - 0.5, D / 2 - 0.36);
    bracket(x, eaveY - 0.5, -D / 2 + 0.36);
  }
  for (let i = 0; i < 4; i++) {
    const z = -D / 2 + 0.9 + (i * (D - 1.8)) / 3;
    bracket(W / 2 - 0.32, eaveY - 0.5, z, Math.PI / 2);
    bracket(-W / 2 + 0.32, eaveY - 0.5, z, Math.PI / 2);
  }

  // flat soffit boards close the underside of the overhang
  const soffitMat = M.woodDark.clone();
  soffitMat.side = THREE.DoubleSide;
  const sf = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, 1.25), soffitMat);
  sf.rotation.x = Math.PI / 2;
  sf.position.set(0, eaveY - 0.12, D / 2 - 0.66);
  sf.receiveShadow = true;
  root.add(sf);
  const sb = sf.clone();
  sb.position.z = -D / 2 + 0.66;
  root.add(sb);
  for (const s of [-1, 1]) {
    const ss = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.2, 1.1), soffitMat);
    ss.rotation.x = Math.PI / 2;
    ss.rotation.z = Math.PI / 2;
    ss.position.set(s * (W / 2 - 0.6), eaveY - 0.12, 0);
    ss.receiveShadow = true;
    root.add(ss);
  }

  batch.build(root);
  return root;

  function xUv(x) {
    return x / 3.1;
  }
  function slopeUv(v, dropAmt, depthAmt) {
    return (v * Math.sqrt(dropAmt * dropAmt + depthAmt * depthAmt)) / 2.6;
  }
}

/**
 * Simple gabled roof (ridge along X), with curved slopes and upturned corners.
 */
export function buildGableRoof(parent, opts = {}) {
  const {
    width = 4,
    depth = 3,
    eaveY = 2.6,
    ridgeY = 3.4,
    upturn = 0.16,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    gableMaterial = M.plaster,
    overhangX = 0.22,
    ridgeCap = true,
    finials = false,
  } = opts;
  const W = width;
  const D = depth;
  const drop = ridgeY - eaveY;
  const root = new THREE.Group();
  root.position.set(...position);
  root.rotation.set(...rotation);
  parent.add(root);
  const corner = (u) => Math.pow(smoothstep(0.6, 1, Math.abs(u * 2 - 1)), 2);
  const roofMat = M.roof.clone();
  roofMat.side = THREE.DoubleSide;

  const slope = (front) =>
    surface(
      (u, v) => {
        const x = (u - 0.5) * (W + overhangX * 2);
        const z = (front ? 1 : -1) * (D / 2) * Math.pow(v, 0.96);
        const y = eaveY + drop * Math.pow(1 - v, 1.16) + upturn * Math.pow(v, 3) * corner(u);
        return new THREE.Vector3(x, y, z);
      },
      18,
      6,
      (u, v, p) => [p.x / 2.7, (v * Math.hypot(drop, D / 2)) / 2.5],
    );
  mesh(orient(slope(true), [0, 1, 1]), roofMat, { parent: root });
  mesh(orient(slope(false), [0, 1, -1]), roofMat, { parent: root });

  const batch = new Batcher();
  // fascia
  for (const front of [true, false]) {
    for (let i = 0; i < 14; i++) {
      const u = i / 14;
      const x = (u - 0.5) * (W + overhangX * 2);
      const z = (front ? 1 : -1) * (D / 2);
      const y = eaveY + upturn * corner(u);
      batch.box(M.plaster, (W + overhangX * 2) / 14 + 0.02, 0.12, 0.09, x, y - 0.05, z);
    }
  }
  // barge boards on the gable ends
  for (const s of [-1, 1]) {
    for (const front of [true, false]) {
      for (let i = 0; i < 8; i++) {
        const v = i / 8;
        const z = (front ? 1 : -1) * (D / 2) * (v + 0.06);
        const y = eaveY + drop * Math.pow(1 - (v + 0.06), 1.16) + 0.02;
        const ang = front
          ? Math.atan2(drop * 1.16 * Math.pow(1 - v, 0.16), D / 2)
          : -Math.atan2(drop * 1.16 * Math.pow(1 - v, 0.16), D / 2);
        batch.box(M.woodDark, 0.1, 0.18, (D / 2) / 8 + 0.08, s * (W / 2 + overhangX + 0.04), y + 0.06, z, 0, ang, 0);
      }
    }
  }
  // gable triangle in-fill
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(-D / 2, 0);
    shape.lineTo(D / 2, 0);
    shape.lineTo(0, drop - 0.04);
    shape.closePath();
    const g = new THREE.ShapeGeometry(shape);
    g.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2);
    const m = new THREE.Mesh(g, gableMaterial);
    m.position.set(s * (W / 2 + 0.05), eaveY, 0);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
    // tie beam across the gable
    batch.box(M.woodDark, 0.12, 0.12, D - 0.1, s * (W / 2 + 0.06), eaveY + drop * 0.46, 0);
    batch.box(M.woodLight, 0.1, drop * 0.4, 0.16, s * (W / 2 + 0.06), eaveY + drop * 0.23, 0);
  }
  if (ridgeCap) {
    batch.add(new THREE.CylinderGeometry(0.1, 0.12, W + overhangX * 2 + 0.2, 8), M.roofDark, [0, ridgeY + 0.06, 0], [0, 0, Math.PI / 2]);
    if (finials) {
      for (const s of [-1, 1]) {
        batch.add(new THREE.BoxGeometry(0.22, 0.3, 0.3), M.roofDark, [s * (W / 2 + overhangX + 0.1), ridgeY + 0.04, 0]);
      }
    }
  }
  batch.build(root);
  return root;
}

export { surface, orient };
