import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SkyBackdrop } from './sky.js';
import { initMaterials } from './palette.js';
import { World } from './scene/world.js';
import { Reimu } from './character.js';

const TARGET = new THREE.Vector3(0, 2.6, -0.6);
const CAM_START = new THREE.Vector3(26.8, 19.8, 35.8);
const FOV = 31;

const stage = document.getElementById('stage');
const backdrop = document.getElementById('backdrop');
const phaseName = document.getElementById('phase-name');
const buttons = [...document.querySelectorAll('.controls button')];

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
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
sun.shadow.mapSize.set(2048, 2048);
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
window.addEventListener('resize', resize);

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
if (Number.isFinite(startZoom) && startZoom !== 1) {
  const dist = THREE.MathUtils.clamp(48 / startZoom, 26, 96);
  const dir = CAM_START.clone().sub(TARGET).normalize();
  camera.position.copy(TARGET).addScaledVector(dir, dist);
} else {
  // On short, wide windows the perspective camera otherwise leaves a lot of
  // empty background; pull the framing in a little without cropping the model.
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const fit = THREE.MathUtils.clamp(1.75 / aspect, 0.84, 1);
  const dir = CAM_START.clone().sub(TARGET).normalize();
  camera.position.copy(TARGET).addScaledVector(dir, 48 * fit);
}
camera.updateProjectionMatrix();

/* ------------------------------------------------------------------ */
/* day / night                                                         */
/* ------------------------------------------------------------------ */
const CYCLE = 104;
let mode = 'auto';
let phase = 8;
let day = 1;
let targetDay = 1;
let lastPhaseLabel = '';

function smoothstep(t) {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}

function dayForPhase(p) {
  if (p < 44) return 1;
  if (p < 52) return 1 - smoothstep((p - 44) / 8);
  if (p < 92) return 0;
  if (p < 100) return smoothstep((p - 92) / 8);
  return 1;
}

function setMode(next) {
  mode = next;
  if (mode === 'auto') {
    phase = day > 0.55 ? 10 : 60;
  } else if (mode === 'day') {
    targetDay = 1;
    phase = 10;
  } else {
    targetDay = 0;
    phase = 60;
  }
  buttons.forEach((b) => {
    const on = b.dataset.mode === mode;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

for (const b of buttons) {
  b.addEventListener('click', () => setMode(b.dataset.mode));
}

if (params.get('mode') === 'night') {
  mode = 'night';
  day = 0;
  targetDay = 0;
  phase = 60;
} else if (params.get('mode') === 'day') {
  mode = 'day';
  day = 1;
  targetDay = 1;
  phase = 10;
}
setMode(mode);
if (mode === 'night') day = 0;
if (mode === 'day') day = 1;

function phaseLabel() {
  if (day > 0.78) return '昼';
  if (day > 0.3) return '暮';
  return '夜';
}

function updateLights(night) {
  hemi.color.copy(dayHemiSky).lerp(nightHemiSky, night);
  hemi.groundColor.copy(dayHemiGround).lerp(nightHemiGround, night);
  hemi.intensity = THREE.MathUtils.lerp(1.55, 0.76, night);
  ambient.intensity = THREE.MathUtils.lerp(0.26, 0.23, night);

  sun.color.copy(daySun).lerp(nightSun, night);
  sun.intensity = THREE.MathUtils.lerp(1.7, 0.84, night) * (1 + Math.sin(t * 0.21) * 0.028);
  sun.position.set(-15 + Math.sin(t * 0.13) * 0.85, 25, 16 + Math.cos(t * 0.1) * 0.65);
  fill.color.copy(dayFill).lerp(nightFill, night);
  fill.intensity = THREE.MathUtils.lerp(0.58, 0.38, night);
  facadeFill.intensity = THREE.MathUtils.lerp(0.34, 0.08, night);
  rim.color.copy(dayRim).lerp(nightRim, night);
  rim.intensity = THREE.MathUtils.lerp(0.32, 0.24, night);
  warm.intensity = night * 4.2;
}

/* ------------------------------------------------------------------ */
/* loop                                                                */
/* ------------------------------------------------------------------ */
const clock = new THREE.Clock();
let t = 0;

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;

  if (mode === 'auto') {
    phase = (phase + dt) % CYCLE;
    day = dayForPhase(phase);
  } else {
    const k = 1 - Math.exp(-dt * 2.4);
    day += (targetDay - day) * k;
    if (Math.abs(targetDay - day) < 0.002) day = targetDay;
  }
  const night = 1 - day;

  updateLights(night);
  sky.update(t, day);
  world.update(t, night, dt);
  reimu.update(dt, t, night);

  const label = phaseLabel();
  if (label !== lastPhaseLabel) {
    lastPhaseLabel = label;
    phaseName.textContent = label;
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// pre-warm shaders / textures before the first visible frame
if (renderer.compile) renderer.compile(scene, camera);
/* The scene is intentionally chrome-free: only the title and the three
 * day/night controls sit above the canvas. */
updateLights(1 - day);
sky.update(0, day);
controls.update();
renderer.render(scene, camera);
requestAnimationFrame(frame);

