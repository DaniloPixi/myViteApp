<template>
  <div class="p5-starfield-wrapper">
    <!-- Fullscreen background canvas -->
    <canvas ref="canvasRef" class="p5-starfield-canvas"></canvas>

    <!-- Your app content on top -->
    <div class="p5-starfield-content">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onUnmounted } from 'vue';
import { createNoise3D } from 'simplex-noise';

const TAU = 2 * Math.PI;
const BASE_TTL = 50;
const RANGE_TTL = 150;
const PARTICLE_PROP_COUNT = 9;
const RANGE_HUE = 100;
const NOISE_STEPS = 3;
const X_OFF = 0.00125;
const Y_OFF = 0.00125;
const Z_OFF = 0.0005;

// Props are optional; you can still just use <P5StarfieldBackground>
const props = defineProps({
  particleCount: {
    type: Number,
    default: 700,
  },
  // kept for future tuning, but no longer used to clamp to center band
  rangeY: {
    type: Number,
    default: 150,
  },
  baseHue: {
    type: Number,
    default: 260, // purple-ish
  },
  baseSpeed: {
    type: Number,
    default: 0.0,
  },
  rangeSpeed: {
    type: Number,
    default: 1.5,
  },
  baseRadius: {
    type: Number,
    default: 1,
  },
  rangeRadius: {
    type: Number,
    default: 2,
  },
});

const animationFrame = ref(null);
const particleProps = shallowRef(null); // Float32Array
const center = ref([0, 0]); // [cx, cy] – still useful if you want later bias
const ctx = shallowRef(null);
const canvasRef = ref(null);
const glowCanvasRef = shallowRef(null);
const glowCtx = shallowRef(null);
let devicePixelRatioValue = 1;
let viewportWidth = 0;
let viewportHeight = 0;
let particlePropsLength = 0;

const particleCache = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  life: 0,
  ttl: 0,
  speed: 0,
  radius: 0,
  hue: 0,
};

const noise3D = createNoise3D();

// Time tracking for FPS-independent motion
let lastTime = 0;        // ms from rAF
let elapsedSeconds = 0;  // total seconds since start

// Helpers
function rand(n) {
  return n * Math.random();
}
function randRange(n) {
  return n - rand(2 * n);
}
function fadeInOut(t, m) {
  const hm = 0.5 * m;
  return Math.abs(((t + hm) % m) - hm) / hm;
}
function lerp(n1, n2, speed) {
  return (1 - speed) * n1 + speed * n2;
}

function computeParticleCount() {
  const baseArea = 1280 * 720;
  const w = viewportWidth || window.innerWidth || 0;
  const h = viewportHeight || window.innerHeight || 0;
  const areaScale = Math.max(1, Math.min(1.5, (w * h) / baseArea));
  const dprScale = Math.max(1, Math.min(1.5, devicePixelRatioValue));
  return Math.max(1, Math.round(props.particleCount * areaScale * dprScale));
}

function rebuildParticles() {
  const nextParticleCount = computeParticleCount();
  const nextLength = nextParticleCount * PARTICLE_PROP_COUNT;

  if (!particleProps.value || particlePropsLength !== nextLength) {
    particleProps.value = new Float32Array(nextLength);
    particlePropsLength = nextLength;
  }

  for (let i = 0; i < particleProps.value.length; i += PARTICLE_PROP_COUNT) {
    initParticle(i);
  }
}

function initParticle(i) {
  if (!particleProps.value || !canvasRef.value) return;

  const canvas = canvasRef.value;
  const w = viewportWidth || canvas.width;
  const h = viewportHeight || canvas.height;

  particleCache.x = rand(w);

  // ---- slight bias towards center, but still spread ----
  const biasCenterChance = 0.63; // 70% of particles near center, 30% anywhere

  if (Math.random() < biasCenterChance) {
    // near center, within ±rangeY
    let y = center.value[1] + randRange(props.rangeY);
    // clamp just in case
    if (y < 0) y = 0;
    if (y > h) y = h;
    particleCache.y = y;
  } else {
    // fully anywhere on screen
    particleCache.y = rand(h);
  }
  // ------------------------------------------------------

  particleCache.vx = 0;
  particleCache.vy = 0;
  particleCache.life = 0;
  particleCache.ttl = BASE_TTL + rand(RANGE_TTL);
  particleCache.speed = props.baseSpeed + rand(props.rangeSpeed);
  particleCache.radius = props.baseRadius + rand(props.rangeRadius);
  particleCache.hue = props.baseHue + rand(RANGE_HUE);

  particleProps.value.set(
    [
      particleCache.x,
      particleCache.y,
      particleCache.vx,
      particleCache.vy,
      particleCache.life,
      particleCache.ttl,
      particleCache.speed,
      particleCache.radius,
      particleCache.hue,
    ],
    i,
  );
}

function updateParticle(i, dt, timeSeconds) {
  if (!particleProps.value || !canvasRef.value || !glowCtx.value) return;

  const canvas = canvasRef.value;
  const propsArr = particleProps.value;
  const context = glowCtx.value;
  const w = viewportWidth || canvas.width;
  const h = viewportHeight || canvas.height;

  particleCache.x = propsArr[i];
  particleCache.y = propsArr[i + 1];
  particleCache.vx = propsArr[i + 2];
  particleCache.vy = propsArr[i + 3];
  particleCache.life = propsArr[i + 4];
  particleCache.ttl = propsArr[i + 5];
  particleCache.speed = propsArr[i + 6];
  particleCache.radius = propsArr[i + 7];
  particleCache.hue = propsArr[i + 8];

  const n =
    noise3D(
      particleCache.x * X_OFF,
      particleCache.y * Y_OFF,
      timeSeconds * Z_OFF, // real time, not frame count
    ) *
    NOISE_STEPS *
    TAU;

  const nextVx = lerp(particleCache.vx, Math.cos(n), 0.5);
  const nextVy = lerp(particleCache.vy, Math.sin(n), 0.5);

  // Scale by dt so movement is consistent across FPS
  const speedFactor = dt * 60; // tweak this if you want a globally faster/slower feel
  const nextX = particleCache.x + nextVx * particleCache.speed * speedFactor;
  const nextY = particleCache.y + nextVy * particleCache.speed * speedFactor;

  context.lineWidth = particleCache.radius;
  context.strokeStyle = `hsla(${particleCache.hue},100%,65%,${fadeInOut(
    particleCache.life,
    particleCache.ttl,
  )})`;
  context.beginPath();
  context.moveTo(particleCache.x, particleCache.y);
  context.lineTo(nextX, nextY);
  context.stroke();

  propsArr[i] = nextX;
  propsArr[i + 1] = nextY;
  propsArr[i + 2] = nextVx;
  propsArr[i + 3] = nextVy;
  propsArr[i + 4] = particleCache.life + dt * 60; // TTL still in "frame-ish" units

  if (
    nextX > w ||
    nextX < 0 ||
    nextY > h ||
    nextY < 0 ||
    particleCache.life > particleCache.ttl
  ) {
    initParticle(i);
  }
}

function draw(now) {
  if (!canvasRef.value || !ctx.value || !glowCtx.value || !particleProps.value) {
    animationFrame.value = requestAnimationFrame(draw);
    return;
  }

  if (!lastTime) lastTime = now;
  const dt = Math.min((now - lastTime) / 1000, 0.05); // seconds, clamped to avoid spikes
  lastTime = now;
  elapsedSeconds += dt;

  const canvas = canvasRef.value;
  const context = ctx.value;
  const glowCanvas = glowCanvasRef.value;
  const glowContext = glowCtx.value;

  // Transparent background – use your app's background instead
  context.clearRect(0, 0, canvas.width, canvas.height);
  glowContext.clearRect(0, 0, glowCanvas.width, glowCanvas.height);

  glowContext.lineCap = 'round';
  glowContext.globalCompositeOperation = 'source-over';
  glowContext.filter = 'none';

  // Update & draw all particles
  for (let i = 0; i < particleProps.value.length; i += PARTICLE_PROP_COUNT) {
    updateParticle(i, dt, elapsedSeconds);
  }

  context.save();
  context.globalCompositeOperation = 'source-over';
  context.filter = 'none';
  context.drawImage(glowCanvas, 0, 0, glowCanvas.width, glowCanvas.height, 0, 0, canvas.width, canvas.height);
  context.restore();

  // Glow pass 1
  context.save();
  context.filter = 'blur(8px) brightness(220%)';
  context.globalCompositeOperation = 'lighter';
  context.drawImage(
    glowCanvas,
    0,
    0,
    glowCanvas.width,
    glowCanvas.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  context.restore();

  // Glow pass 2
  context.save();
  context.filter = 'blur(4px) brightness(220%)';
  context.globalCompositeOperation = 'lighter';
  context.drawImage(
    glowCanvas,
    0,
    0,
    glowCanvas.width,
    glowCanvas.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  context.restore();

  animationFrame.value = requestAnimationFrame(draw);
}

// Simple manual debounce for resize
let resizeTimeout = null;
function handleResize() {
  if (resizeTimeout !== null) {
    window.clearTimeout(resizeTimeout);
  }
  resizeTimeout = window.setTimeout(() => {
    if (!canvasRef.value) return;
    const canvas = canvasRef.value;
    const glowCanvas = glowCanvasRef.value;
    devicePixelRatioValue = Math.min(window.devicePixelRatio || 1, 2);

    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;

    canvas.width = Math.floor(window.innerWidth * devicePixelRatioValue);
    canvas.height = Math.floor(window.innerHeight * devicePixelRatioValue);
    glowCanvas.width = canvas.width;
    glowCanvas.height = canvas.height;

    ctx.value.setTransform(devicePixelRatioValue, 0, 0, devicePixelRatioValue, 0, 0);
    glowCtx.value.setTransform(devicePixelRatioValue, 0, 0, devicePixelRatioValue, 0, 0);
    center.value = [0.5 * viewportWidth, 0.5 * viewportHeight];

    rebuildParticles();
  }, 150);
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const glowCanvas = document.createElement('canvas');
  glowCanvasRef.value = glowCanvas;

  ctx.value = canvas.getContext('2d');
  glowCtx.value = glowCanvas.getContext('2d');
  if (!ctx.value || !glowCtx.value) return;

  devicePixelRatioValue = Math.min(window.devicePixelRatio || 1, 2);
  viewportWidth = window.innerWidth;
  viewportHeight = window.innerHeight;

  canvas.width = Math.floor(window.innerWidth * devicePixelRatioValue);
  canvas.height = Math.floor(window.innerHeight * devicePixelRatioValue);
  glowCanvas.width = canvas.width;
  glowCanvas.height = canvas.height;
  ctx.value.setTransform(devicePixelRatioValue, 0, 0, devicePixelRatioValue, 0, 0);
  glowCtx.value.setTransform(devicePixelRatioValue, 0, 0, devicePixelRatioValue, 0, 0);
  center.value = [0.5 * viewportWidth, 0.5 * viewportHeight];

  rebuildParticles();

  animationFrame.value = requestAnimationFrame(draw);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value);
  }
  window.removeEventListener('resize', handleResize);

  ctx.value = null;
  glowCtx.value = null;
  particleProps.value = null;
});
</script>

<style scoped>
.p5-starfield-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

/* Full-screen, fixed background */
.p5-starfield-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  display: block;
  pointer-events: none;
  z-index: 0;
}

/* Your app content sits above it */
.p5-starfield-content {
  position: relative;
  z-index: 1;
}
</style>
