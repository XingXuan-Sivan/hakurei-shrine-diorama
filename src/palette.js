import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ------------------------------------------------------------------ */
/* Palette - soft, slightly dusty anime colours                        */
/* ------------------------------------------------------------------ */
export const C = {
  red: 0xb64b3c,
  redLight: 0xc95f4a,
  redDark: 0x7d392f,
  vermilion: 0xc2543f,
  plaster: 0xdcc8a6,
  plasterLight: 0xead9bb,
  paper: 0xe9d7b1,
  white: 0xf3ead9,
  wood: 0x7c5a41,
  woodLight: 0x9b704c,
  woodDark: 0x4b382f,
  woodDeep: 0x332620,
  roof: 0x3d4c52,
  roofLight: 0x55666b,
  roofEdge: 0x27343a,
  tile: 0x4b5a5e,
  brass: 0xb99a58,
  brassLight: 0xd7b974,
  rope: 0xb79a6b,
  ropeDark: 0x8f744f,
  stone: 0xd9d2c2,
  stoneLight: 0xeee5d2,
  stoneDark: 0xaea99a,
  stoneDeep: 0x7e857a,
  soil: 0x8a7b64,
  earth: 0xded3bc,
  sand: 0xdccfaf,
  grass: 0x7b8f5c,
  moss: 0x607a4d,
  leaf: 0x64824d,
  leafLight: 0x8ba968,
  leafDark: 0x465f46,
  pine: 0x4d6b50,
  pineLight: 0x6f8a64,
  pink: 0xd99b98,
  pinkLight: 0xe9bcb0,
  pinkDark: 0xb87a83,
  amber: 0xc08c4b,
  amberLight: 0xd9ad65,
  amberDark: 0x96683b,
  glow: 0xffd89a,
  interior: 0xffb96b,
  night: 0x9db6d8,
  ink: 0x2c2623,
};

/* ------------------------------------------------------------------ */
/* Toon gradient                                                       */
/* ------------------------------------------------------------------ */
const gradientData = new Uint8Array([96, 150, 205, 240, 255]);
export const gradientMap = new THREE.DataTexture(gradientData, gradientData.length, 1, THREE.RedFormat);
gradientMap.minFilter = THREE.NearestFilter;
gradientMap.magFilter = THREE.NearestFilter;
gradientMap.generateMipmaps = false;
gradientMap.needsUpdate = true;

/* ------------------------------------------------------------------ */
/* Textures                                                            */
/* ------------------------------------------------------------------ */
const loader = new THREE.TextureLoader();
const textureCache = new Map();

export function tex(name, { repeat = [1, 1], srgb = true, aniso = 4 } = {}) {
  const key = `${name}|${repeat[0]}|${repeat[1]}|${srgb}|${aniso}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const t = loader.load(`./assets/${name}`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, t);
  return t;
}

const SOLID = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap });

/**
 * A clean toon material. Textures can be supplied via `map`.
 */
export function toon(color, opts = {}) {
  const {
    map = null,
    side = THREE.FrontSide,
    transparent = false,
    opacity = 1,
    emissive = 0x000000,
    emissiveIntensity = 1,
    vertexColors = false,
    depthWrite = true,
  } = opts;
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap,
    map,
    side,
    transparent,
    opacity,
    emissive,
    emissiveIntensity,
    vertexColors,
    depthWrite,
  });
  return m;
}

export function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, ...opts });
}

export function standard(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0, ...opts });
}

/* Shared materials used by the builders */
export const M = {};

export function initMaterials() {
  const a = (k, v) => (M[k] = v);
  a('red', toon(C.red));
  a('redLight', toon(C.redLight));
  a('redDark', toon(C.redDark));
  a('redEdge', toon(0x964135));
  a('plaster', toon(C.plaster, { map: tex('plaster.png') }));
  a('plasterLight', toon(C.plasterLight, { map: tex('plaster.png') }));
  a('paper', toon(C.paper, { map: tex('paper.png'), emissive: 0xffb35f, emissiveIntensity: 0 }));
  a('paperCool', toon(0xdcd7c2, { map: tex('paper.png') }));
  a('wood', toon(C.wood, { map: tex('wood.png') }));
  a('woodLight', toon(C.woodLight, { map: tex('wood.png') }));
  a('woodDark', toon(C.woodDark));
  a('woodDeep', toon(C.woodDeep));
  a('roof', toon(0xffffff, { map: tex('roof-tile.png') }));
  a('roofDark', toon(C.roofEdge));
  a('roofLight', toon(C.roofLight));
  a('brass', new THREE.MeshPhongMaterial({ color: C.brass, specular: 0xfff0c0, shininess: 48 }));
  a('brassLight', new THREE.MeshPhongMaterial({ color: C.brassLight, specular: 0xffffff, shininess: 70 }));
  a('rope', toon(C.rope));
  a('ropeDark', toon(C.ropeDark));
  a('stone', toon(0xf4ecd9, { map: tex('stone.png') }));
  a('stoneLight', toon(0xfff9ea, { map: tex('stone.png') }));
  a('stoneDark', toon(0xd6cdbb, { map: tex('stone.png') }));
  a('stoneDeep', toon(0x9a9a8b));
  a('stoneMortar', toon(0xa7a08d, { map: tex('stone.png') }));
  a('moss', toon(C.moss));
  a('mossLight', toon(0x78905c));
  a('grass', toon(C.grass));
  a('soil', toon(C.soil));
  a('earth', toon(C.earth, { map: tex('gravel.png') }));
  a('ink', toon(C.ink));
  a('white', toon(C.white));
  a('black', toon(0x24201d));
  a('gold', new THREE.MeshPhongMaterial({ color: 0xd6b870, specular: 0xfff6d8, shininess: 60 }));
  a('glow', new THREE.MeshBasicMaterial({ color: 0xffe1a6 }));
  a('water', new THREE.MeshPhongMaterial({ color: 0x8bb3b0, specular: 0xffffff, shininess: 90, transparent: true, opacity: 0.9 }));
  return M;
}

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */
export const unitBox = new THREE.BoxGeometry(1, 1, 1);
export const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 12);
export const unitCyl8 = new THREE.CylinderGeometry(1, 1, 1, 8);
export const unitCyl6 = new THREE.CylinderGeometry(1, 1, 1, 6);
export const unitSphere = new THREE.IcosahedronGeometry(1, 2);

export function rboxGeo(w, h, d, r = 0.06, seg = 2) {
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, Math.min(w, h, d) * 0.48));
}

export function mesh(geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = true, receive = true, parent = null } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (parent) parent.add(m);
  return m;
}

export function rbox(w, h, d, r, mat, opts = {}) {
  return mesh(rboxGeo(w, h, d, r), mat, opts);
}

export function box(w, h, d, mat, opts = {}) {
  return mesh(new THREE.BoxGeometry(w, h, d), mat, opts);
}

export function cyl(rt, rb, h, mat, opts = {}) {
  const g = new THREE.CylinderGeometry(rt, rb, h, opts.segments || 12, 1, !!opts.open);
  return mesh(g, mat, opts);
}

export function plane(w, h, mat, opts = {}) {
  return mesh(new THREE.PlaneGeometry(w, h), mat, opts);
}

export function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rnd, a, b) {
  return a + (b - a) * rnd();
}

export function pick(rnd, arr) {
  return arr[Math.floor(rnd() * arr.length) % arr.length];
}

/* ------------------------------------------------------------------ */
/* Canvas text / sign textures                                         */
/* ------------------------------------------------------------------ */
export function textTexture(lines, opts = {}) {
  const {
    w = 256,
    h = 256,
    bg = '#2f2721',
    fg = '#e9d6a8',
    border = '#b99a58',
    borderWidth = 8,
    font = '700 58px "Yu Mincho", "MS Mincho", "Songti SC", "SimSun", serif',
    vertical = false,
    padding = 22,
    lineGap = 6,
    transparent = false,
    radius = 10,
    glow = null,
  } = opts;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!transparent) {
    g.fillStyle = bg;
    if (radius > 0) {
      roundRect(g, 2, 2, w - 4, h - 4, radius);
      g.fill();
    } else {
      g.fillRect(0, 0, w, h);
    }
    if (borderWidth > 0) {
      g.strokeStyle = border;
      g.lineWidth = borderWidth;
      roundRect(g, borderWidth / 2 + 3, borderWidth / 2 + 3, w - borderWidth - 6, h - borderWidth - 6, Math.max(2, radius - 3));
      g.stroke();
    }
  }
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = font;
  if (glow) {
    g.shadowColor = glow;
    g.shadowBlur = 14;
  } else {
    g.shadowColor = 'rgba(0,0,0,.25)';
    g.shadowBlur = 2;
    g.shadowOffsetY = 2;
  }
  const list = Array.isArray(lines) ? lines : String(lines).split('\n');
  if (vertical) {
    const total = list.length;
    const step = Math.min((h - padding * 2) / Math.max(1, total), 120);
    list.forEach((ch, i) => {
      const y = h / 2 + (i - (total - 1) / 2) * step;
      g.fillText(ch, w / 2, y + 1);
    });
  } else {
    const lineH = Math.min(62, (h - padding * 2) / Math.max(1, list.length));
    list.forEach((line, i) => {
      const y = h / 2 + (i - (list.length - 1) / 2) * (lineH + lineGap);
      g.fillText(line, w / 2, y + 1);
    });
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* ------------------------------------------------------------------ */
/* Static batching: merge meshes sharing a material                    */
/* ------------------------------------------------------------------ */
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export class Batcher {
  constructor() {
    this.groups = new Map();
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
  }

  add(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
    let g = geo.clone();
    // keep every merged geometry non-indexed so one material batch can combine
    // rounded boxes (indexed) with raw boxes/cones (non-indexed)
    if (g.index) g = g.toNonIndexed();
    this._e.set(rot[0], rot[1], rot[2]);
    this._q.setFromEuler(this._e);
    this._p.set(pos[0], pos[1], pos[2]);
    this._s.set(scale[0], scale[1], scale[2]);
    this._m.compose(this._p, this._q, this._s);
    g.applyMatrix4(this._m);
    if (!this.groups.has(mat)) this.groups.set(mat, []);
    this.groups.get(mat).push(g);
    return this;
  }

  box(mat, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) {
    return this.add(unitBox, mat, [x, y, z], [rx, ry, rz], [w, h, d]);
  }

  cyl(mat, rTop, rBot, h, x, y, z, seg = 12, ry = 0, rx = 0, rz = 0) {
    // use an averaged radius; taper is approximated by a cone geometry when needed
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
    return this.add(g, mat, [x, y, z], [rx, ry, rz]);
  }

  build(parent, { cast = true, receive = true } = {}) {
    const out = [];
    for (const [mat, geos] of this.groups) {
      if (!geos.length) continue;
      const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
      if (!merged) continue;
      const m = new THREE.Mesh(merged, mat);
      m.castShadow = cast;
      m.receiveShadow = receive;
      parent.add(m);
      out.push(m);
      geos.forEach((g) => g.dispose());
    }
    this.groups.clear();
    return out;
  }
}

/* ------------------------------------------------------------------ */
/* Anime ink contour                                                   */
/* ------------------------------------------------------------------ */

let outlineMaterial = null;

function getOutlineMaterial() {
  if (outlineMaterial) return outlineMaterial;
  outlineMaterial = new THREE.ShaderMaterial({
    uniforms: {
      ink: { value: new THREE.Color(0x33291f) },
      width: { value: 0.013 },
    },
    vertexShader: /* glsl */ `
      uniform float width;
      void main() {
        vec3 p = position + normal * width;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 ink;
      void main() { gl_FragColor = vec4(ink, 1.0); }
    `,
    side: THREE.BackSide,
    depthWrite: true,
  });
  return outlineMaterial;
}

/**
 * Add a subtle inverted-hull ink contour to the opaque meshes of a group.
 * Kept for the hero pieces (shrine, office, torii) so the diorama reads like
 * a cel-shaded illustration without outlining every pebble.
 */
export function addOutlines(root, { width = 0.013, color = 0x33291f } = {}) {
  if (!root) return;
  const meshes = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSprite) return;
    if (!o.geometry || !o.geometry.attributes.normal) return;
    const mat = o.material;
    if (!mat || mat.transparent || mat.isShaderMaterial || mat.side === THREE.BackSide) return;
    if (o.userData.noOutline) return;
    meshes.push(o);
  });
  for (const m of meshes) {
    const mat = getOutlineMaterial().clone();
    mat.uniforms.width.value = width;
    mat.uniforms.ink.value = new THREE.Color(color);
    const o = new THREE.Mesh(m.geometry, mat);
    o.castShadow = false;
    o.receiveShadow = false;
    o.frustumCulled = false;
    m.add(o);
  }
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */
export function shadowify(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

export function cloneMat(mat, color) {
  const m = mat.clone();
  if (color !== undefined) m.color.set(color);
  return m;
}

export const DEG = Math.PI / 180;
