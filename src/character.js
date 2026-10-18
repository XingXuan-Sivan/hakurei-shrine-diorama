import * as THREE from 'three';
import { ATLAS } from './atlasMeta.js';
import { gradientMap, tex, mesh } from './palette.js';

/*
 * Q-version pixel Reimu.
 *
 * The atlas is a 4x2 sheet of low-frame-rate sweeping poses. The character is
 * a camera-facing alpha-tested plane (so the hand-drawn pixel outline survives
 * at any distance), lit by the scene's toon lights, with a separate blurred
 * silhouette atlas laid flat on the ground for a soft, transparent shadow.
 *
 * Behaviour loop:
 *   sweep (2.8s) -> pause + turn (1.1s) -> sweep -> pause + turn
 *   -> crouch -> hop to a new patch of the courtyard -> land -> pause ...
 */

const CELL_W = ATLAS.cellW;
const CELL_H = ATLAS.cellH;
const SPRITE_H = 2.55;
const SPRITE_W = SPRITE_H * (CELL_W / CELL_H);

const EASE = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Hand-picked open patches around the front courtyard; no prop collisions,
// all inside the gravel/stone path area in front of the torii.
const SPOTS = [
  { x: 1.35, z: 8.35 },
  { x: -1.4, z: 8.55 },
  { x: 2.1, z: 7.2 },
  { x: -2.1, z: 7.3 },
  { x: 0.55, z: 9.45 },
  { x: -0.65, z: 9.3 },
  { x: 3.4, z: 6.7 },
  { x: -3.4, z: 6.8 },
];

function makeAtlasTexture(file, { crisp }) {
  const t = new THREE.TextureLoader().load(`./assets/${file}`);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(1 / ATLAS.cols, 1 / ATLAS.rows);
  if (crisp) {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
  }
  t.anisotropy = 4;
  return t;
}

export class Reimu {
  constructor(world, camera) {
    this.world = world;
    this.camera = camera;

    this.map = makeAtlasTexture('reimu-atlas.png', { crisp: true });
    this.shadowMap = makeAtlasTexture('reimu-shadow-atlas.png', { crisp: false });

    this.mat = new THREE.MeshToonMaterial({
      map: this.map,
      gradientMap,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      transparent: false,
      emissive: 0xffffff,
      emissiveMap: this.map,
      emissiveIntensity: 0.06,
    });
    this.mat.name = 'reimu-sprite';

    // root sits at the soles of the shoes
    this.root = new THREE.Group();
    this.squash = new THREE.Group();
    this.billboard = new THREE.Group();
    this.flip = new THREE.Group();
    this.root.add(this.squash);
    this.squash.add(this.billboard);
    this.billboard.add(this.flip);

    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0); // origin at the feet, not the centre
    this.sprite = new THREE.Mesh(geo, this.mat);
    this.sprite.scale.set(SPRITE_W, SPRITE_H, 1);
    this.sprite.renderOrder = 2;
    this.sprite.castShadow = false;
    this.sprite.receiveShadow = false;
    this.flip.add(this.sprite);

    this.shadow = new THREE.Group();
    this.shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: this.shadowMap,
        color: 0x1b2922,
        transparent: true,
        opacity: 0.46,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
    );
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.renderOrder = 3;
    this.shadow.add(this.shadowPlane);

    // a small radial contact shadow keeps the chibi firmly planted
    this.contact = mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: tex('soft-shadow.png'),
        color: 0xf2f2ec,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
      { parent: this.shadow, y: 0.006, rx: -Math.PI / 2, cast: false, receive: false },
    );
    this.contact.scale.set(1.55, 0.82, 1);
    this.contact.renderOrder = 3;

    // landing dust puffs
    this.dust = [];
    const dustMat = new THREE.SpriteMaterial({
      map: tex('soft-shadow.png'),
      color: 0xd9c9a3,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(dustMat.clone());
      s.visible = false;
      s.scale.set(0.28, 0.28, 1);
      this.root.add(s);
      this.dust.push({ sprite: s, life: 0, vx: 0, vy: 0, vz: 0 });
    }

    world.root.add(this.root);
    world.root.add(this.shadow);

    this.state = 'sweep';
    this.stateTime = 0;
    this.spin = 0;
    this.dir = 1;
    this.rounds = 0;
    this.jump = null;
    this.frame = 0;
    this.debrisClock = 0;
    this.time = 0;
    this.night = 0;
    this.squashX = 1;
    this.squashY = 1;

    this.spot = 0;
    const s = SPOTS[this.spot];
    this.x = s.x;
    this.z = s.z;
    this.ground = world.groundY(s.x, s.z);
    this.jumpY = 0;
    this.lift = 0;

    this._setFrame(0);
    this._updateShadow(1);
    this._placeShadow();
    this.root.position.set(this.x, this.ground, this.z);
    this.shadow.position.set(this.x, this.ground + 0.04, this.z);
    this.shadow.rotation.y = 0.3;
  }

  /* ------------------------------------------------------------------ */
  _uvFor(index) {
    const col = index % ATLAS.cols;
    const row = Math.floor(index / ATLAS.cols);
    this.map.offset.set(col / ATLAS.cols, 1 - (row + 1) / ATLAS.rows);
    this.shadowMap.offset.set(col / ATLAS.cols, 1 - (row + 1) / ATLAS.rows);
    const fx = ATLAS.footX[index];
    const fy = ATLAS.footY[index];
    this.sprite.position.x = (0.5 - fx / CELL_W) * SPRITE_W;
    // The atlas cell has transparent padding below the shoes. Offset the plane
    // by that padding so the soles sit exactly on the character's ground point.
    this.sprite.position.y = -(1 - fy / CELL_H) * SPRITE_H;
    this.footU = fx / CELL_W;
    this.footV = fy / CELL_H;
    this.shadowBaseW = SPRITE_W * 0.95;
    this.shadowBaseH = SPRITE_H * 0.54;
  }

  _updateShadow(grow) {
    const w = this.shadowBaseW * grow;
    const h = this.shadowBaseH * grow;
    this.shadowPlane.scale.set(w, h, 1);
    // keep the flattened silhouette on the ground plane under the feet
    this.shadowPlane.position.set(0, 0.002, 0);
  }

  _setFrame(index) {
    index = ((index % ATLAS.frameCount) + ATLAS.frameCount) % ATLAS.frameCount;
    if (index === this.frame && this._frameSet) return;
    this.frame = index;
    this._frameSet = true;
    this._uvFor(index);
  }

  _setDirection(dir) {
    this.dir = dir;
    this.flip.scale.x = dir;
    this.shadow.scale.x = dir;
  }

  _faceCamera() {
    const dx = this.camera.position.x - this.x;
    const dz = this.camera.position.z - this.z;
    this.spin = Math.atan2(dx, dz);
    this.billboard.rotation.y = this.spin;
  }

  _placeShadow() {
    this.shadow.position.set(this.x, this.ground + 0.04, this.z);
    this.shadow.rotation.y = this.spin;
  }

  _turn() {
    this._setDirection(-this.dir);
  }

  _enterSweep() {
    this.state = 'sweep';
    this.stateTime = 0;
    this.debrisClock = 0;
    this._setFrame(0);
  }

  _enterPause(seconds = 1.05) {
    this.state = 'pause';
    this.stateTime = 0;
    this.pauseFor = seconds;
    this.pauseTurned = false;
    this._setFrame(7);
  }

  _chooseSpot() {
    let best = null;
    let bestScore = -1;
    for (let i = 0; i < SPOTS.length; i++) {
      if (i === this.spot) continue;
      const s = SPOTS[i];
      const d = Math.hypot(s.x - this.x, s.z - this.z);
      // short, gentle hops; favour a fresh patch but keep the wander local
      if (d < 1.15 || d > 3.4) continue;
      const score = 1.4 - Math.abs(d - 2.1) * 0.35 + Math.random() * 0.6;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best == null ? (this.spot + 1) % SPOTS.length : best;
  }

  _enterJump() {
    const next = this._chooseSpot();
    const to = SPOTS[next];
    this.spot = next;
    this.state = 'jump';
    this.stateTime = 0;
    this.jump = {
      fromX: this.x,
      fromZ: this.z,
      toX: to.x,
      toZ: to.z,
      height: 0.62,
    };
    this.landed = false;
    this.dir = this.dir >= 0 ? 1 : -1;
    this._setFrame(6);
  }

  _landDust() {
    for (const d of this.dust) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.08 + Math.random() * 0.28;
      d.sprite.position.set(Math.cos(a) * r, 0.06, Math.sin(a) * r);
      d.sprite.material.opacity = 0.0;
      d.life = 0.35 + Math.random() * 0.35;
      const sp = 0.5 + Math.random() * 0.8;
      d.vx = Math.cos(a) * sp;
      d.vz = Math.sin(a) * sp;
      d.vy = 0.18 + Math.random() * 0.35;
      const s = 0.18 + Math.random() * 0.2;
      d.sprite.scale.set(s, s, 1);
      d.sprite.visible = true;
      d.maxLife = d.life;
    }
  }

  /* ------------------------------------------------------------------ */
  update(dt, t, night) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    this.night = night;
    this.stateTime += dt;

    if (this.state === 'sweep') {
      this._setFrame(Math.floor(this.time * ATLAS.fps) % ATLAS.frameCount);
      this.debrisClock += dt;
      if (this.debrisClock > 0.34) {
        this.debrisClock = 0;
        // the broom is on the -x side of the atlas, mirrored by `dir`
        const push = -this.dir * 0.9;
        this.world.pushDebris(this.x + push * 0.55, this.z + 0.45, push, 0.32, 1.5, 1.9);
      }
      if (this.stateTime > 2.8) {
        this.rounds += 1;
        this._enterPause(this.rounds >= 2 ? 1.0 : 1.15);
      }
    } else if (this.state === 'pause') {
      // a small turn is made halfway through the breath, not abruptly at the end
      if (!this.pauseTurned && this.stateTime > this.pauseFor * 0.46) {
        this.pauseTurned = true;
        this._turn();
        this._setFrame(6);
      }
      if (this.stateTime > this.pauseFor) {
        if (this.rounds >= 2) {
          this.rounds = 0;
          this._enterJump();
        } else {
          this._enterSweep();
        }
      }
    } else if (this.state === 'jump') {
      const total = 0.98;
      const t0 = this.stateTime;
      const j = this.jump;
      if (t0 < 0.17) {
        // anticipation: sink and widen
        const k = t0 / 0.17;
        this._squash(1 + 0.07 * k, 1 - 0.115 * k);
        this._setFrame(0);
      } else if (t0 < 0.73) {
        // airborne: a gentle arc, feet follow the interpolated ground height
        const k = clamp01((t0 - 0.17) / 0.56);
        const e = EASE(k);
        this.x = THREE.MathUtils.lerp(j.fromX, j.toX, e);
        this.z = THREE.MathUtils.lerp(j.fromZ, j.toZ, e);
        this.lift = Math.sin(Math.PI * k) * j.height;
        this._squash(0.985, 1.025);
        this._setFrame(6);
      } else {
        // landing compression, then release
        const k = clamp01((t0 - 0.73) / 0.25);
        this.x = j.toX;
        this.z = j.toZ;
        this.lift = 0;
        const punch = Math.sin(Math.PI * k) * 0.13;
        this._squash(1 + punch, 1 - punch);
        this._setFrame(6);
        if (!this.landed && t0 > 0.78) {
          this.landed = true;
          this._landDust();
        }
      }
      if (t0 >= total) {
        this.state = 'landpause';
        this.stateTime = 0;
        this.jump = null;
        this._setFrame(7);
      }
    } else if (this.state === 'landpause') {
      this.lift = 0;
      this._squash(1, 1);
      this._setFrame(7);
      if (this.stateTime > 0.55) {
        this.rounds = 0;
        this._enterSweep();
      }
    }

    // ground query every frame so path slabs / gravel transitions are exact
    this.ground = this.world.groundY(this.x, this.z);
    this.root.position.set(this.x, this.ground + this.lift, this.z);

    this._faceCamera();
    this.shadow.rotation.y = this.spin;
    this.shadow.position.set(this.x, this.ground + 0.04, this.z);

    // breathing, weight shift and a tiny idle sway (sprite only; feet stay planted)
    const breathe = Math.sin(this.time * 1.75) * 0.006;
    const weight = Math.sin(this.time * 0.72) * 0.012;
    this.squash.position.x = weight;
    this.squash.rotation.z = Math.sin(this.time * 0.55) * 0.012 + this.dir * 0.004;
    this.squash.scale.x = this.squashX * (1 - breathe * 0.45);
    this.squash.scale.y = this.squashY * (1 + breathe);

    // shadow: stays on the ground, grows + fades while airborne
    const air = clamp01(this.lift / 0.62);
    const grow = 1 + air * 0.72;
    this._updateShadow(grow);
    this.shadowPlane.material.opacity = (0.52 - air * 0.24) * (1 - this.night * 0.18);
    this.contact.scale.set(1.55 * grow, 0.82 * grow, 1);
    this.contact.material.opacity = (0.44 - air * 0.22) * (1 - this.night * 0.2);

    // day/night tint; ambient still does most of the work
    this.mat.color.setRGB(1 - this.night * 0.1, 1 - this.night * 0.08, 1 - this.night * 0.03);
    this.mat.emissiveIntensity = 0.06 + this.night * 0.1;

    // dust puffs
    for (const d of this.dust) {
      if (!d.sprite.visible) continue;
      d.life -= dt;
      if (d.life <= 0) {
        d.sprite.visible = false;
        continue;
      }
      const k = d.life / d.maxLife;
      d.sprite.position.x += d.vx * dt;
      d.sprite.position.y += d.vy * dt;
      d.sprite.position.z += d.vz * dt;
      d.vy -= dt * 0.25;
      d.sprite.material.opacity = Math.sin(k * Math.PI) * 0.34;
      const s = 0.28 + (1 - k) * 0.55;
      d.sprite.scale.set(s, s, 1);
    }
  }

  _squash(x, y) {
    this.squashX = x;
    this.squashY = y;
  }
}

