import * as THREE from 'three';

/*
 * One tap channel for the whole scene.
 *
 * Everything interactive is registered here so a single pointer handler can
 * decide tap vs. drag, keep a hover cursor, and run double-tap. It never calls
 * preventDefault, and it only consumes a gesture when the pointer barely moved,
 * so OrbitControls keeps full control of dragging.
 */

const TAP_SLOP = 6; // px of travel still considered a tap
const TAP_TIME = 450; // ms between down and up
const HOVER_MS = 90; // raycast at most this often while hovering
const DOUBLE_MS = 320;

export class Interaction {
  constructor({ camera, dom, onDoubleTap = null, onEmptyTap = null }) {
    this.camera = camera;
    this.dom = dom;
    this.onDoubleTap = onDoubleTap;
    this.onEmptyTap = onEmptyTap;

    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.entries = [];
    this.byUuid = new Map();

    this.down = null;
    this.hovered = null;
    this.hoverDirty = false;
    this.hoverAt = 0;
    this.pointer = { x: 0, y: 0 };
    this.lastTap = 0;
    this.lastTapX = 0;
    this.lastTapY = 0;

    this._bind();
  }

  /** Register an object (and its children) as tappable. */
  add(object, { onTap = null, cursor = 'pointer' } = {}) {
    const entry = { object, onTap, cursor };
    this.entries.push(entry);
    this.byUuid.set(object.uuid, entry);
    object.traverse((child) => {
      if (child !== object) this.byUuid.set(child.uuid, entry);
    });
    return () => this.remove(entry);
  }

  remove(entry) {
    const i = this.entries.indexOf(entry);
    if (i >= 0) this.entries.splice(i, 1);
    for (const [uuid, e] of this.byUuid) if (e === entry) this.byUuid.delete(uuid);
  }

  /* ------------------------------------------------------------------ */
  _bind() {
    const el = this.dom;

    el.addEventListener('pointerdown', (e) => {
      this.down = {
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
        id: e.pointerId,
        moved: false,
      };
    });

    el.addEventListener('pointermove', (e) => {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      if (this.down && e.pointerId === this.down.id) {
        if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > TAP_SLOP) {
          this.down.moved = true;
        }
        return;
      }
      if (e.pointerType === 'touch') return; // no hover on touch
      this.hoverDirty = true;
    });

    el.addEventListener('pointerup', (e) => {
      const d = this.down;
      this.down = null;
      if (!d || d.id !== e.pointerId) return;
      const dt = performance.now() - d.t;
      if (d.moved || dt > TAP_TIME) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_SLOP) return;
      this._tap(e.clientX, e.clientY);
    });

    el.addEventListener('pointercancel', () => {
      this.down = null;
    });

    el.addEventListener('pointerleave', () => {
      this.hovered = null;
      this._cursor(null);
    });
  }

  _pick(clientX, clientY) {
    const rect = this.dom.getBoundingClientRect();
    this.ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const objects = this.entries.map((e) => e.object).filter((o) => o.visible !== false);
    if (!objects.length) return null;
    const hits = this.raycaster.intersectObjects(objects, true);
    for (const hit of hits) {
      const entry = this.byUuid.get(hit.object.uuid);
      if (entry) return { entry, point: hit.point };
    }
    return null;
  }

  _tap(x, y) {
    const hit = this._pick(x, y);
    const now = performance.now();
    if (hit) {
      this.lastTap = 0;
      if (hit.entry.onTap) hit.entry.onTap(hit.point);
      return;
    }
    if (now - this.lastTap < DOUBLE_MS && Math.hypot(x - this.lastTapX, y - this.lastTapY) < 24) {
      this.lastTap = 0;
      if (this.onDoubleTap) this.onDoubleTap();
      return;
    }
    this.lastTap = now;
    this.lastTapX = x;
    this.lastTapY = y;
    if (this.onEmptyTap) this.onEmptyTap();
  }

  _cursor(kind) {
    const next = kind || '';
    if (this.dom.style.cursor !== next) this.dom.style.cursor = next;
  }

  /** Cheap: only raycasts when the mouse actually moved. */
  update() {
    if (!this.hoverDirty) return;
    const now = performance.now();
    if (now - this.hoverAt < HOVER_MS) return;
    this.hoverAt = now;
    this.hoverDirty = false;
    const hit = this._pick(this.pointer.x, this.pointer.y);
    this._cursor(hit ? hit.entry.cursor : null);
  }
}
