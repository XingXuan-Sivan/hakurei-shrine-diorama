import * as THREE from 'three';
import { playCoin } from './audio.js';

/*
 * Coins for the offering box. A small pool is reused so rapid tapping cannot
 * allocate meshes, and each coin is a short arc from just under the camera into
 * the slats on top of the box.
 */

const POOL = 8;
const FLIGHT = 0.55;
const LINGER = 0.4;
const FADE = 0.25;

const _v = new THREE.Vector3();
const _box = new THREE.Box3();

export class Coins {
  constructor({ scene, camera, saisen }) {
    this.scene = scene;
    this.camera = camera;
    this.saisen = saisen;
    this.next = 0;
    this.items = [];

    const geo = new THREE.CylinderGeometry(0.058, 0.058, 0.013, 14);
    const mat = new THREE.MeshToonMaterial({ color: 0xd9b268, emissive: 0x2a1c08, emissiveIntensity: 0.35 });

    for (let i = 0; i < POOL; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      scene.add(mesh);
      this.items.push({ mesh, t: 0, active: false, from: new THREE.Vector3(), to: new THREE.Vector3(), arc: 0.5, spin: 0 });
    }
  }

  _target() {
    this.saisen.updateWorldMatrix(true, true);
    _box.setFromObject(this.saisen);
    const c = _box.getCenter(_v);
    return new THREE.Vector3(c.x, _box.max.y + 0.02, c.z);
  }

  toss() {
    const item = this.items[this.next % POOL];
    this.next++;
    const to = this._target();

    const dir = to.clone().sub(this.camera.position).normalize();
    const from = this.camera.position.clone().addScaledVector(dir, 1.05);
    from.y -= 0.46;
    from.x += (Math.random() - 0.5) * 0.22;
    from.z += (Math.random() - 0.5) * 0.22;

    item.from.copy(from);
    item.to.copy(to);
    item.to.x += (Math.random() - 0.5) * 0.28;
    item.to.z += (Math.random() - 0.5) * 0.2;
    item.arc = 0.42 + Math.random() * 0.22;
    item.spin = 9 + Math.random() * 8;
    item.t = 0;
    item.active = true;
    item.mesh.visible = true;
    item.mesh.position.copy(from);
    item.mesh.scale.setScalar(1);
    playCoin();
  }

  update(dt) {
    for (const item of this.items) {
      if (!item.active) continue;
      item.t += dt;
      const m = item.mesh;

      if (item.t < FLIGHT) {
        const k = item.t / FLIGHT;
        m.position.lerpVectors(item.from, item.to, k);
        m.position.y += Math.sin(Math.PI * k) * item.arc;
        m.rotation.x += dt * item.spin;
        m.rotation.z += dt * item.spin * 0.6;
      } else if (item.t < FLIGHT + LINGER) {
        m.position.copy(item.to);
        m.rotation.x = 0;
        m.rotation.z = 0;
      } else {
        const k = Math.min(1, (item.t - FLIGHT - LINGER) / FADE);
        m.scale.setScalar(1 - k);
        m.position.y = item.to.y + k * 0.06;
        if (k >= 1) {
          item.active = false;
          m.visible = false;
        }
      }
    }
  }
}
