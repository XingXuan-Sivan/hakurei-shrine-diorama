import * as THREE from 'three';

/*
 * Reimu's speech bubble: a plain DOM node projected onto her head each frame.
 * It fades in over ~0.12s, holds, then fades out, and scales slightly with the
 * camera distance so it stays legible without looking pasted on.
 */

const LINES = [
  '又是你呀。香火钱可别忘了。',
  '扫地？这也是修行的一种。',
  '别踩我刚扫好的地方。',
  '今天也要好好干活……才怪。',
  '站那么远做什么？过来。',
  '神社今天也在营业哦。',
  '有人的地方就有妖怪，习惯啦。',
  '茶？自己倒。',
  '赛钱箱在那边，别装看不见。',
  '天气不错，适合发呆。',
  '有我在，别怕。',
  '喂，别一直戳我。',
];

const _v = new THREE.Vector3();

export class SpeechBubble {
  constructor(parent = document.body) {
    this.el = document.createElement('div');
    this.el.className = 'speech';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');
    parent.appendChild(this.el);
    this.life = 0;
    this.duration = 1;
    this.recent = [];
    this.text = '';
  }

  pickLine() {
    let line = LINES[Math.floor(Math.random() * LINES.length)];
    let guard = 0;
    while (this.recent.includes(line) && guard++ < 20) {
      line = LINES[Math.floor(Math.random() * LINES.length)];
    }
    this.recent.push(line);
    if (this.recent.length > 6) this.recent.shift();
    return line;
  }

  say(text, duration = 2.6) {
    this.text = text;
    this.el.textContent = text;
    this.duration = duration;
    this.life = duration;
    this.el.style.opacity = '1';
    // re-trigger the pop without restarting the fade-out timer
    this.el.classList.remove('pop');
    void this.el.offsetWidth;
    this.el.classList.add('pop');
  }

  hide() {
    this.life = 0;
    this.el.style.opacity = '0';
    this.el.classList.remove('pop');
  }

  /** `anchor` writes the current head position into a Vector3. */
  update(dt, camera, anchor) {
    if (this.life <= 0) {
      if (this.el.style.opacity !== '0') this.el.style.opacity = '0';
      return;
    }
    this.life -= dt;
    if (this.life <= 0) {
      this.hide();
      return;
    }

    anchor(_v);
    const dist = camera.position.distanceTo(_v);
    _v.project(camera);
    const x = (_v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-_v.y * 0.5 + 0.5) * window.innerHeight;
    const scale = THREE.MathUtils.clamp(46 / dist, 0.84, 1.12);
    const fade = Math.min(1, (this.duration - this.life) / 0.14, this.life / 0.3);
    this.el.style.opacity = String(Math.max(0, fade));
    this.el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%) scale(${scale})`;
  }
}
