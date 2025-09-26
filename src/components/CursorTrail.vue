<template>
  <canvas ref="canvasRef" id="canvas" class="cursor-trail"></canvas>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";

const props = defineProps({
  friction: {
    type: Number,
    default: 0.5,
  },
  trails: {
    type: Number,
    default: 20,
  },
  size: {
    type: Number,
    default: 50,
  },
  dampening: {
    type: Number,
    default: 0.25,
  },
  tension: {
    type: Number,
    default: 0.98,
  },
});

const canvasRef = ref(null);

class Wave {
  constructor(options = {}) {
    this.phase = options.phase || 0;
    this.offset = options.offset || 0;
    this.frequency = options.frequency || 0.001;
    this.amplitude = options.amplitude || 1;
    this.e = 0;
  }

  update() {
    this.phase += this.frequency;
    this.e = this.offset + Math.sin(this.phase) * this.amplitude;
    return this.e;
  }

  value() {
    return this.e;
  }
}

class Node {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
  }
}

class Line {
  constructor(options) {
    this.spring = options.spring + 0.1 * Math.random() - 0.02;
    this.friction = E.friction + 0.01 * Math.random() - 0.002;
    this.nodes = [];

    for (let n = 0; n < E.size; n++) {
      const t = new Node();
      t.x = pos.x;
      t.y = pos.y;
      this.nodes.push(t);
    }
  }

  update() {
    let e = this.spring;
    let t = this.nodes[0];

    t.vx += (pos.x - t.x) * e;
    t.vy += (pos.y - t.y) * e;

    for (let i = 0, a = this.nodes.length; i < a; i++) {
      t = this.nodes[i];

      if (i > 0) {
        const n = this.nodes[i - 1];
        t.vx += (n.x - t.x) * e;
        t.vy += (n.y - t.y) * e;
        t.vx += n.vx * E.dampening;
        t.vy += n.vy * E.dampening;
      }

      t.vx *= this.friction;
      t.vy *= this.friction;
      t.x += t.vx;
      t.y += t.vy;
      e *= E.tension;
    }
  }

  draw(ctx) {
    let e, t;
    let n = this.nodes[0].x;
    let i = this.nodes[0].y;

    ctx.beginPath();
    ctx.moveTo(n, i);

    for (let a = 1, o = this.nodes.length - 2; a < o; a++) {
      e = this.nodes[a];
      t = this.nodes[a + 1];
      n = 0.5 * (e.x + t.x);
      i = 0.5 * (e.y + t.y);
      ctx.quadraticCurveTo(e.x, e.y, n, i);
    }

    e = this.nodes[this.nodes.length - 2];
    t = this.nodes[this.nodes.length - 1];
    ctx.quadraticCurveTo(e.x, e.y, t.x, t.y);
    ctx.stroke();
    ctx.closePath();
  }
}

let ctx;
let f;
let pos = { x: 0, y: 0 };
let lines = [];

const E = {
  friction: props.friction,
  trails: props.trails,
  size: props.size,
  dampening: props.dampening,
  tension: props.tension,
};

if (typeof window !== 'undefined' && window.matchMedia("(max-width: 768px)").matches) {
    E.trails = 10;
    E.size = 40;
}

function createLines() {
  lines = [];
  for (let e = 0; e < E.trails; e++) {
    lines.push(new Line({ spring: 0.4 + (e / E.trails) * 0.025 }));
  }
}

function updatePosition(e) {
  if (e.touches && e.touches.length > 0) {
    pos.x = e.touches[0].clientX;
    pos.y = e.touches[0].clientY;
  } else if (e.clientX !== undefined) {
    pos.x = e.clientX;
    pos.y = e.clientY;
  }
}

function render() {
  if (ctx && ctx.running) {
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `hsla(${Math.round(f.update())}, 50%, 50%, 0.2)`;
    ctx.lineWidth = 1;

    for (let t = 0; t < E.trails; t++) {
      const e = lines[t];
      e.update();
      e.draw(ctx);
    }
    window.requestAnimationFrame(render);
  }
}

function resizeCanvas() {
  if (ctx && ctx.canvas) {
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
  }
}

// One-time setup function
function onInteraction(e) {
  document.removeEventListener('mousemove', onInteraction);
  document.removeEventListener('touchstart', onInteraction);

  document.addEventListener('mousemove', updatePosition);
  document.addEventListener('touchmove', updatePosition);
  document.addEventListener('touchstart', updatePosition);

  updatePosition(e);
  createLines();
  render();
}

function handleFocus() {
  if (ctx && !ctx.running) {
    ctx.running = true;
    render();
  }
}

function handleBlur() {
  if (ctx) {
    ctx.running = false;
  }
}

function initCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  ctx = canvas.getContext("2d");
  ctx.running = true;

  f = new Wave({
    phase: Math.random() * 2 * Math.PI,
    amplitude: 85,
    frequency: 0.0015,
    offset: 285,
  });

  document.addEventListener('mousemove', onInteraction);
  document.addEventListener('touchstart', onInteraction);
  document.body.addEventListener("orientationchange", resizeCanvas);
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("focus", handleFocus);
  window.addEventListener("blur", handleBlur);

  resizeCanvas();
}

function cleanup() {
  if (ctx) {
    ctx.running = false;
  }

  document.removeEventListener('mousemove', onInteraction);
  document.removeEventListener('touchstart', onInteraction);
  document.removeEventListener('mousemove', updatePosition);
  document.removeEventListener('touchmove', updatePosition);
  document.removeEventListener('touchstart', updatePosition);
  document.body.removeEventListener("orientationchange", resizeCanvas);
  window.removeEventListener("resize", resizeCanvas);
  window.removeEventListener("focus", handleFocus);
  window.removeEventListener("blur", handleBlur);
}

onMounted(() => {
  initCanvas();
});

onUnmounted(() => {
  cleanup();
});

</script>

<style scoped>
.cursor-trail {
  pointer-events: none;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 50;
  width: 100%;
  height: 100%;
}
</style>
