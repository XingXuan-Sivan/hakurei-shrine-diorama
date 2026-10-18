import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SkyBackdrop } from './sky.js';
import { initMaterials } from './palette.js';
import { World } from './scene/world.js';
import { Reimu } from './character.js';
import { Interaction } from './interaction.js';
import { SpeechBubble } from './bubble.js';
import { Omikuji } from './omikuji.js';
import { Coins } from './coins.js';
import { playSlide, playPaper } from './audio.js';

const TARGET = new THREE.Vector3(0, 2.6, -0.6);
const CAM_START = new THREE.Vector3(26.8, 19.8, 35.8);
const FOV = 31;

const stage = document.getElementById('stage');
const backdrop = document.getElementById('backdrop');
const phaseName = document.getElementById('phase-name');
const clockUi = document.querySelector('.clock');
const clockRange = document.getElementById('clock-range');
const clockThumb = document.getElementById('clock-thumb');
const clockAuto = document.getElementById('clock-auto');
const clockTime = document.getElementById('clock-time');
const IS_MOBILE =
  window.matchMedia('(pointer: coarse)').matches ||
  Math.min(window.innerWidth, window.innerHeight) < 720;

initMaterials();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 220);
camera.position.copy(CAM_START);
camera.lookAt(TARGET);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_MOBILE ? 1.65 : 2));
renderer.setClearAlpha(0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

/* ------------------------------------------------------------------ */
/* light rig                                                           */
/* ------------------------------------------------------------------ */
const hemi = new THREE.HemisphereLight(0xd8eaf2, 0xc4b394, 1.55);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0xfff3da, 0.26);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffe3b6, 1.7);
sun.position.set(-15, 25, 16);
sun.castShadow = true;
sun.shadow.mapSize.set(IS_MOBILE ? 1024 : 2048, IS_MOBILE ? 1024 : 2048);
sun.shadow.camera.left = -21;
sun.shadow.camera.right = 21;
sun.shadow.camera.top = 21;
sun.shadow.camera.bottom = -21;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 80;
sun.shadow.bias = -0.00045;
sun.shadow.normalBias = 0.028;
sun.shadow.radius = 3.5;
scene.add(sun);
sun.target.position.set(0, 0.5, -1.5);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0xc3d6ef, 0.58);
fill.position.set(18, 11, -14);
scene.add(fill);

// keeps the deep porch and offering steps readable without flattening the roof
const facadeFill = new THREE.DirectionalLight(0xffe4c8, 0.34);
facadeFill.position.set(5, 7, 22);
scene.add(facadeFill);

const rim = new THREE.DirectionalLight(0xffd6a2, 0.32);
rim.position.set(2, 9, -22);
scene.add(rim);

// A soft warm centre for the character and the offering box after dusk.
const warm = new THREE.PointLight(0xffb877, 0, 11, 2);
warm.position.set(0, 2.35, 3.2);
scene.add(warm);

const dayHemiSky = new THREE.Color(0xd8eaf2);
const nightHemiSky = new THREE.Color(0x2c436c);
const dayHemiGround = new THREE.Color(0xc4b394);
const nightHemiGround = new THREE.Color(0x0f1820);
const daySun = new THREE.Color(0xffe3b6);
const nightSun = new THREE.Color(0xa9c2ec);
const dayFill = new THREE.Color(0xc3d6ef);
const nightFill = new THREE.Color(0x3c5682);
const dayRim = new THREE.Color(0xffd6a2);
const nightRim = new THREE.Color(0xffb46b);
const duskSun = new THREE.Color(0xff9a52);

/* ------------------------------------------------------------------ */
/* world + character                                                   */
/* ------------------------------------------------------------------ */
const sky = new SkyBackdrop(backdrop);
const world = new World(scene);
const reimu = new Reimu(world, camera);

/* ------------------------------------------------------------------ */
/* camera / controls                                                   */
/* ------------------------------------------------------------------ */
function resize() {
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  sky.resize();
}
resize();

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.rotateSpeed = 0.58;
controls.zoomSpeed = 0.8;
controls.enablePan = false;
controls.minDistance = 16;
controls.maxDistance = 96;
controls.minPolarAngle = 0.3;
controls.maxPolarAngle = 1.4;
controls.update();
camera.lookAt(TARGET);

const params = new URLSearchParams(window.location.search);
const startZoom = parseFloat(params.get('zoom') || '1');

// Portrait phones get a wider vertical FOV, a more frontal camera and a longer
// distance. The old desktop framing cropped the left edge of the diorama, which
// is where Reimu stands, so she appeared to be missing on a phone.
let lastPortrait = null;
function frameCamera(force = false) {
  const aspect = camera.aspect;
  const portrait = aspect < 0.92;
  camera.fov = portrait ? 46 : FOV;
  camera.updateProjectionMatrix();

  const dir = portrait
    ? new THREE.Vector3(14, 20, 42).normalize()
    : CAM_START.clone().sub(TARGET).normalize();

  let dist;
  if (portrait) {
    const neededWidth = 27.5;
    dist = neededWidth / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect);
    dist = THREE.MathUtils.clamp(dist, 58, 92);
  } else {
    const fit = THREE.MathUtils.clamp(1.75 / aspect, 0.84, 1);
    dist = 48 * fit;
  }

  if (force || portrait !== lastPortrait) {
    camera.position.copy(TARGET).addScaledVector(dir, dist);
    controls.update();
    camera.lookAt(TARGET);
  }
  lastPortrait = portrait;
}

frameCamera(true);
if (Number.isFinite(startZoom) && startZoom !== 1) {
  const dist = THREE.MathUtils.clamp(48 / startZoom, 26, 96);
  const dir = camera.position.clone().sub(TARGET).normalize();
  camera.position.copy(TARGET).addScaledVector(dir, dist);
  controls.update();
}
window.addEventListener('resize', () => {
  resize();
  frameCamera();
});
camera.updateProjectionMatrix();

/* ------------------------------------------------------------------ */
/* time of day                                                         */
/* ------------------------------------------------------------------ */
// timeOfDay runs 0 → 1 across one full day: 0 = 06:00 sunrise, 0.25 = noon,
// 0.5 = 18:00 sunset, 0.75 = midnight. Auto mode walks it at 1/CYCLE per
// second, so a whole day takes a little over two minutes.
const CYCLE = 150;
const DAY_SPAN = 0.5;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (t) => {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
};

const startT = parseFloat(params.get('t'));
let timeOfDay = Number.isFinite(startT) ? ((startT % 1) + 1) % 1 : 0.14;
let targetTime = timeOfDay;
let auto = true;
let interacting = false;
let day = 1;
let warmth = 0;
let cel = { u: 0.28, v: 0.28, isDay: 1, alt: 0.78, signed: 0.78, warm: 0 };
let lastPhaseLabel = '';
let lastClockText = '';
let shrineDay = 0;

if (params.get('mode') === 'night') {
  timeOfDay = targetTime = 0.76;
  auto = false;
} else if (params.get('mode') === 'day') {
  timeOfDay = targetTime = 0.22;
  auto = false;
}
if (params.get('auto') === '0') auto = false;

function celestialFor(tod) {
  const isDay = tod < DAY_SPAN ? 1 : 0;
  const u = isDay ? tod / DAY_SPAN : (tod - DAY_SPAN) / (1 - DAY_SPAN);
  const alt = Math.sin(Math.PI * clamp01(u));
  const signed = isDay ? alt : -alt;
  // the warm band is widest right on the horizon, which is what makes a slow
  // dawn and dusk read as a time-lapse rather than a fade
  return { u, v: u, isDay, alt, signed, warm: clamp01(1 - Math.abs(signed) / 0.46) };
}

// signed altitude → light: exactly half-lit on the horizon, so sunrise and
// sunset take a few seconds instead of switching
function dayFor(c) {
  return smoothstep((c.signed + 0.26) / 0.52);
}

function clockText(c) {
  const h = c.isDay ? 6 + c.u * 12 : 18 + c.u * 12;
  const hh = Math.floor(h % 24);
  const mm = Math.floor(((h % 1) * 60) / 5) * 5;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function phaseLabel(c) {
  if (c.isDay) {
    if (c.u < 0.12) return day > 0.6 ? '朝' : '暁';
    if (c.u > 0.86) return day > 0.6 ? '夕' : '暮';
    return '昼';
  }
  if (c.u < 0.14) return '暮';
  return '夜';
}

/* ---- slider ---- */
function setAuto(next) {
  auto = next;
  clockAuto.setAttribute('aria-pressed', auto ? 'true' : 'false');
  clockUi.classList.toggle('is-auto', auto);
  if (auto) targetTime = timeOfDay;
}
clockAuto.addEventListener('click', () => setAuto(!auto));

const readSlider = () => parseFloat(clockRange.value) / 1000;
clockRange.addEventListener('input', () => {
  setAuto(false);
  targetTime = readSlider();
  interacting = true;
});
clockRange.addEventListener('change', () => {
  targetTime = readSlider();
});
clockRange.addEventListener('pointerdown', () => {
  interacting = true;
});
const releaseSlider = () => {
  interacting = false;
};
window.addEventListener('pointerup', releaseSlider);
window.addEventListener('pointercancel', releaseSlider);
clockRange.addEventListener('keydown', () => {
  interacting = true;
  window.clearTimeout(clockRange._idle);
  clockRange._idle = window.setTimeout(releaseSlider, 420);
});
setAuto(auto);

function updateLights(night) {
  hemi.color.copy(dayHemiSky).lerp(nightHemiSky, night);
  hemi.groundColor.copy(dayHemiGround).lerp(nightHemiGround, night);
  hemi.intensity = THREE.MathUtils.lerp(1.55, 0.76, night);
  ambient.intensity = THREE.MathUtils.lerp(0.26, 0.23, night);

  sun.color.copy(daySun).lerp(duskSun, warmth * 0.9);
  sun.color.lerp(nightSun, night * 0.85);
  sun.intensity = THREE.MathUtils.lerp(1.7, 0.84, night) * (1 - warmth * 0.18) * (1 + Math.sin(t * 0.21) * 0.028);
  sun.position.set(-15 + Math.sin(t * 0.13) * 0.85, 25, 16 + Math.cos(t * 0.1) * 0.65);
  fill.color.copy(dayFill).lerp(nightFill, night);
  fill.intensity = THREE.MathUtils.lerp(0.58, 0.38, night);
  facadeFill.intensity = THREE.MathUtils.lerp(0.34, 0.08, night);
  rim.color.copy(dayRim).lerp(nightRim, night);
  rim.intensity = THREE.MathUtils.lerp(0.32, 0.24, night);
  warm.intensity = night * 4.2;
}

/* ------------------------------------------------------------------ */
/* interaction                                                         */
/* ------------------------------------------------------------------ */
scene.add(camera); // the omikuji slip lives in camera space

const bubble = new SpeechBubble(stage);
const omikuji = new Omikuji(camera);
const coins = new Coins({ scene, camera, saisen: world.shrine.saisen.group });

const interaction = new Interaction({
  camera,
  dom: renderer.domElement,
  onDoubleTap: () => frameCamera(true),
  onEmptyTap: () => {
    bubble.hide();
    omikuji.dismiss();
  },
});

const headAnchor = (v) => reimu.headWorld(v);

interaction.add(reimu.sprite, {
  onTap: () => {
    if (!reimu.poke()) return;
    bubble.say(bubble.pickLine());
  },
});

const doorTap = () => {
  world.shrine.toggleDoor();
  playSlide();
};
interaction.add(world.shrine.doorHit, { onTap: doorTap });
interaction.add(world.shrine.doors.left.group, { onTap: doorTap });
interaction.add(world.shrine.doors.right.group, { onTap: doorTap });

interaction.add(world.shrine.saisen.group, { onTap: () => coins.toss() });

const rackPoint = new THREE.Vector3();
interaction.add(world.omikuji.group, {
  onTap: () => {
    world.omikuji.group.getWorldPosition(rackPoint);
    rackPoint.y += 1.2;
    omikuji.show(rackPoint);
  },
});

// every tree answers a tap: a wobble plus a puff of shed leaves
for (const tree of world.trees) {
  if (!tree.canopy) continue;
  interaction.add(tree.canopy, {
    onTap: () => {
      tree.shake();
      world.burstLeaves(tree, 15);
      playPaper();
    },
  });
}

if (params.get('door') === 'closed') world.shrine.setDoor(false);

// dev hook: lets a headless browser drive and inspect the scene
if (params.has('debug')) {
  window.__diorama = {
    THREE,
    scene,
    camera,
    renderer,
    controls,
    world,
    reimu,
    interaction,
    bubble,
    omikuji,
    coins,
    time: {
      get tod() {
        return timeOfDay;
      },
      set tod(v) {
        timeOfDay = ((v % 1) + 1) % 1;
        targetTime = timeOfDay;
      },
      get day() {
        return day;
      },
      get cel() {
        return cel;
      },
      get auto() {
        return auto;
      },
      get target() {
        return targetTime;
      },
      get shrineDay() {
        return shrineDay;
      },
      get warmth() {
        return warmth;
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/* loop                                                                */
/* ------------------------------------------------------------------ */
const clock = new THREE.Clock();
let t = 0;

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;

  const before = timeOfDay;
  if (auto) {
    timeOfDay = (timeOfDay + dt / CYCLE) % 1;
    targetTime = timeOfDay;
  } else {
    let d = targetTime - timeOfDay;
    if (d > 0.5) d -= 1;
    else if (d < -0.5) d += 1;
    timeOfDay = (timeOfDay + d * (1 - Math.exp(-dt * 14)) + 1) % 1;
  }
  // count a new shrine day when the clock rolls over sunrise
  if (timeOfDay < before && before - timeOfDay > 0.5) shrineDay++;
  omikuji.setDay(shrineDay);

  cel = celestialFor(timeOfDay);
  day = dayFor(cel);
  warmth = cel.warm;
  const night = 1 - day;

  updateLights(night);
  sky.update(t, day, cel);
  world.update(t, night, dt);
  reimu.update(dt, t, night);

  interaction.update();
  bubble.update(dt, camera, headAnchor);
  omikuji.update(dt);
  coins.update(dt);

  if (clockThumb) clockThumb.style.left = `${(timeOfDay * 100).toFixed(2)}%`;
  if (!interacting) clockRange.value = String(Math.round(timeOfDay * 1000));
  clockUi.classList.toggle('night', day < 0.5);

  const label = phaseLabel(cel);
  if (label !== lastPhaseLabel) {
    lastPhaseLabel = label;
    phaseName.textContent = label;
  }
  const ct = clockText(cel);
  if (ct !== lastClockText) {
    lastClockText = ct;
    if (clockTime) clockTime.textContent = ct;
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// pre-warm shaders / textures before the first visible frame
if (renderer.compile) renderer.compile(scene, camera);
/* The scene is intentionally chrome-free: only the title and the time slider
 * sit above the canvas. */
cel = celestialFor(timeOfDay);
day = dayFor(cel);
warmth = cel.warm;
updateLights(1 - day);
sky.update(0, day, cel);
if (clockThumb) clockThumb.style.left = `${(timeOfDay * 100).toFixed(2)}%`;
if (clockTime) clockTime.textContent = clockText(cel);
controls.update();
renderer.render(scene, camera);
requestAnimationFrame(frame);

