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
// x, y, vx, vy, life, ttl, speed, radius, hue, depth
const PARTICLE_PROP_COUNT = 10;
const RANGE_HUE = 100;
const NOISE_STEPS = 3;
const X_OFF = 0.00125;
const Y_OFF = 0.00125;
const Z_OFF = 0.0005;

const props = defineProps({
  particleCount: {
    type: Number,
    default: 200,
  },
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
  // parallax strength
  parallaxIntensity: {
    type: Number,
    default: 0.12, // try 0.02–0.08
  },
  // parallax smoothing
  parallaxEasing: {
    type: Number,
    default: 0.06, // lower = smoother
  },
});

const animationFrame = ref(null);
const particleProps = shallowRef(null); // Float32Array
const center = ref([0, 0]); // [cx, cy]
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
  depth: 0,
};

const noise3D = createNoise3D();

// Time tracking
let lastTime = 0;
let elapsedSeconds = 0;

// Parallax state
let pointerNormX = 0; // -1..1
let pointerNormY = 0; // -1..1
let parallaxX = 0;
let parallaxY = 0;

// ---- constellation state ----
let constellations = [];
let nextConstellationTime = 0;

const MAX_CONSTELLATIONS = 2;
const CONST_MIN_INTERVAL = 5;   // seconds
const CONST_MAX_INTERVAL = 15;   // seconds
const CONST_MIN_TTL = 3.5;       // seconds
const CONST_MAX_TTL = 7.0;       // seconds
const CONST_MIN_STARS = 4;
const CONST_MAX_STARS = 8;

const CONST_PALETTES = [
  { fromHue: 190, toHue: 305 }, // cyan -> magenta
  { fromHue: 260, toHue: 40 },  // purple -> warm orange/red
  { fromHue: 210, toHue: 260 }, // blue -> violet
];

// Helpers
function rand(n) {
  return n * Math.random();
}
function randRange(n) {
  return n - rand(2 * n);
}
function randBetween(min, max) {
  return min + Math.random() * (max - min);
}
function fadeInOut(t, m) {
  const hm = 0.5 * m;
  return Math.abs(((t + hm) % m) - hm) / hm;
}
function lerp(n1, n2, speed) {
  return (1 - speed) * n1 + speed * n2;
}

// Parallax pointer handlers
function handlePointerMove(e) {
  const w = viewportWidth || window.innerWidth || 1;
  const h = viewportHeight || window.innerHeight || 1;
  const x = e.clientX ?? 0;
  const y = e.clientY ?? 0;
  pointerNormX = ((x / w) - 0.5) * 2; // -1..1
  pointerNormY = ((y / h) - 0.5) * 2;
}

function handleTouchMove(e) {
  if (!e.touches || !e.touches.length) return;
  const t = e.touches[0];
  const w = viewportWidth || window.innerWidth || 1;
  const h = viewportHeight || window.innerHeight || 1;
  pointerNormX = ((t.clientX / w) - 0.5) * 2;
  pointerNormY = ((t.clientY / h) - 0.5) * 2;
}

// ---- particles ----
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

  // depth: 0 = near, 1 = far
  const depth = Math.random();

  // base position
  particleCache.x = rand(w);

  // slight bias towards center vertically
  const biasCenterChance = 0.63;
  if (Math.random() < biasCenterChance) {
    let y = center.value[1] + randRange(props.rangeY);
    if (y < 0) y = 0;
    if (y > h) y = h;
    particleCache.y = y;
  } else {
    particleCache.y = rand(h);
  }

  particleCache.vx = 0;
  particleCache.vy = 0;
  particleCache.life = 0;
  particleCache.ttl = BASE_TTL + rand(RANGE_TTL);

  // depth affects speed: near = much faster, far = slower
  // depth 0   -> 2.0x
  // depth 0.5 -> 1.2x
  // depth 1   -> 0.4x
  const depthSpeedMul = 0.4 + (1 - depth) * 1.6;
  particleCache.speed = (props.baseSpeed + rand(props.rangeSpeed)) * depthSpeedMul;

  // depth affects size: near = clearly larger, far = tiny
  // depth 0   -> 1.8x
  // depth 0.5 -> ~1x
  // depth 1   -> 0.1x
  const baseRadius = props.baseRadius + rand(props.rangeRadius);
  const depthSizeMul = 0.1 + (1 - depth) * 1.7;
  particleCache.radius = baseRadius * depthSizeMul;

  particleCache.hue = props.baseHue + rand(RANGE_HUE);
  particleCache.depth = depth;

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
      particleCache.depth,
    ],
    i,
  );
}

function updateParticle(i, dt, timeSeconds, parallaxOffsetX, parallaxOffsetY) {
  if (!particleProps.value || !canvasRef.value || !glowCtx.value) return;

  const canvas = canvasRef.value;
  const propsArr = particleProps.value;
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
  particleCache.depth = propsArr[i + 9];

  const n =
    noise3D(
      particleCache.x * X_OFF,
      particleCache.y * Y_OFF,
      timeSeconds * Z_OFF,
    ) *
    NOISE_STEPS *
    TAU;

  const nextVx = lerp(particleCache.vx, Math.cos(n), 0.5);
  const nextVy = lerp(particleCache.vy, Math.sin(n), 0.5);

  const speedFactor = dt * 60;
  const nextX = particleCache.x + nextVx * particleCache.speed * speedFactor;
  const nextY = particleCache.y + nextVy * particleCache.speed * speedFactor;

  // parallax: near moves more, far moves less
  const depth = particleCache.depth;
  const parallaxDepthFactor = 1 - depth * 0.7; // depth 0 -> 1, depth 1 -> 0.3
  const px = parallaxOffsetX * parallaxDepthFactor;
  const py = parallaxOffsetY * parallaxDepthFactor;

  const drawX1 = particleCache.x + px;
  const drawY1 = particleCache.y + py;
  const drawX2 = nextX + px;
  const drawY2 = nextY + py;

  glowCtx.value.lineCap = 'round';
  glowCtx.value.lineWidth = particleCache.radius;
  glowCtx.value.strokeStyle = `hsla(${particleCache.hue},100%,65%,${fadeInOut(
    particleCache.life,
    particleCache.ttl,
  )})`;
  glowCtx.value.beginPath();
  glowCtx.value.moveTo(drawX1, drawY1);
  glowCtx.value.lineTo(drawX2, drawY2);
  glowCtx.value.stroke();

  propsArr[i] = nextX;
  propsArr[i + 1] = nextY;
  propsArr[i + 2] = nextVx;
  propsArr[i + 3] = nextVy;
  propsArr[i + 4] = particleCache.life + dt * 60;

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

// ---- constellation helpers ----
function scheduleNextConstellation() {
  nextConstellationTime = elapsedSeconds + randBetween(CONST_MIN_INTERVAL, CONST_MAX_INTERVAL);
}

function getParticleScreenPos(pIndex, parallaxOffsetX, parallaxOffsetY) {
  if (!particleProps.value) return { x: 0, y: 0 };
  const base = pIndex * PARTICLE_PROP_COUNT;
  const x = particleProps.value[base];
  const y = particleProps.value[base + 1];
  const depth = particleProps.value[base + 9] ?? 0;
  const parallaxDepthFactor = 1 - depth * 0.7;
  const px = parallaxOffsetX * parallaxDepthFactor;
  const py = parallaxOffsetY * parallaxDepthFactor;
  return { x: x + px, y: y + py };
}

function trySpawnConstellation(parallaxOffsetX, parallaxOffsetY) {
  if (!particleProps.value || particleProps.value.length === 0) return;
  if (elapsedSeconds < nextConstellationTime) return;
  if (constellations.length >= MAX_CONSTELLATIONS) {
    scheduleNextConstellation();
    return;
  }

  const totalParticles = particleProps.value.length / PARTICLE_PROP_COUNT;
  if (totalParticles < CONST_MIN_STARS) {
    scheduleNextConstellation();
    return;
  }

  const w = viewportWidth || window.innerWidth || 0;
  const h = viewportHeight || window.innerHeight || 0;
  if (!w || !h) {
    scheduleNextConstellation();
    return;
  }

  const baseIndex = Math.floor(Math.random() * totalParticles);
  const basePos = getParticleScreenPos(baseIndex, parallaxOffsetX, parallaxOffsetY);

  const maxDist = Math.min(w, h) * 0.25; // stars need to be within this distance
  const desiredCount = Math.floor(randBetween(CONST_MIN_STARS, CONST_MAX_STARS + 1));

  const indices = [baseIndex];
  let attempts = 0;
  const maxAttempts = 80;

  while (indices.length < desiredCount && attempts < maxAttempts) {
    attempts++;
    const idx = Math.floor(Math.random() * totalParticles);
    if (indices.includes(idx)) continue;

    const pos = getParticleScreenPos(idx, parallaxOffsetX, parallaxOffsetY);
    const dx = pos.x - basePos.x;
    const dy = pos.y - basePos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= maxDist) {
      indices.push(idx);
    }
  }

  if (indices.length < CONST_MIN_STARS) {
    // nothing good found, reschedule
    scheduleNextConstellation();
    return;
  }

  const ttl = randBetween(CONST_MIN_TTL, CONST_MAX_TTL);
const paletteIndex = Math.floor(Math.random() * CONST_PALETTES.length);

constellations.push({
  indices,
  life: 0,
  ttl,
  paletteIndex,
});

scheduleNextConstellation();
}

function updateAndDrawConstellations(glowContext, dt, parallaxOffsetX, parallaxOffsetY) {
  if (!constellations.length || !particleProps.value) return;

  for (let c = constellations.length - 1; c >= 0; c--) {
    const con = constellations[c];
    con.life += dt;
    const t = con.life / con.ttl;
    if (t >= 1) {
      constellations.splice(c, 1);
      continue;
    }

    const idxList = con.indices;
    if (!idxList || idxList.length < 2) continue;

    // soft fade-in-out
    const alphaEnvelope = Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 1.2;
    const alpha = 0.4 * alphaEnvelope; // max opacity

    const palette = CONST_PALETTES[con.paletteIndex % CONST_PALETTES.length];

    // collect positions + bounds
    const positions = [];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < idxList.length; i++) {
      const idx = idxList[i];
      const p = getParticleScreenPos(idx, parallaxOffsetX, parallaxOffsetY);
      positions.push(p);

      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      continue;
    }

    glowContext.save();
    glowContext.lineWidth = 0.9;
    glowContext.lineCap = 'round';
    glowContext.globalCompositeOperation = 'lighter';
    glowContext.globalAlpha = alpha;

    // fallback: if all points collapse to one spot, use solid color
    if (minX === maxX && minY === maxY) {
      glowContext.strokeStyle = `hsla(${palette.fromHue}, 75%, 65%, 1)`;
    } else {
      const grad = glowContext.createLinearGradient(minX, minY, maxX, maxY);
      grad.addColorStop(0, `hsla(${palette.fromHue}, 75%, 65%, 1)`);
grad.addColorStop(1, `hsla(${palette.toHue}, 75%, 65%, 1)`);
      glowContext.strokeStyle = grad;
    }

    glowContext.beginPath();
    for (let i = 0; i < positions.length - 1; i++) {
      const a = positions[i];
      const b = positions[i + 1];
      if (i === 0) {
        glowContext.moveTo(a.x, a.y);
      }
      glowContext.lineTo(b.x, b.y);
    }
    glowContext.stroke();
    glowContext.restore();
  }
}


// ---- main draw ----
function draw(now) {
  if (!canvasRef.value || !ctx.value || !glowCtx.value || !particleProps.value) {
    animationFrame.value = requestAnimationFrame(draw);
    return;
  }

  if (!lastTime) lastTime = now;
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  elapsedSeconds += dt;

  // Smooth parallax follow
  const easing = props.parallaxEasing;
  parallaxX += (pointerNormX - parallaxX) * easing;
  parallaxY += (pointerNormY - parallaxY) * easing;

  const canvas = canvasRef.value;
  const context = ctx.value;
  const glowCanvas = glowCanvasRef.value;
  const glowContext = glowCtx.value;

  const w = viewportWidth || canvas.width;
  const h = viewportHeight || canvas.height;

  const parallaxScale = props.parallaxIntensity;
  const parallaxOffsetX = parallaxX * w * parallaxScale;
  const parallaxOffsetY = parallaxY * h * parallaxScale;

  // maybe spawn a constellation this frame
  trySpawnConstellation(parallaxOffsetX, parallaxOffsetY);

  // clear both
  context.clearRect(0, 0, canvas.width, canvas.height);
  glowContext.clearRect(0, 0, glowCanvas.width, glowCanvas.height);

  glowContext.lineCap = 'round';
  glowContext.globalCompositeOperation = 'source-over';
  glowContext.filter = 'none';

  // particles
  for (let i = 0; i < particleProps.value.length; i += PARTICLE_PROP_COUNT) {
    updateParticle(i, dt, elapsedSeconds, parallaxOffsetX, parallaxOffsetY);
  }

  // constellations (drawn into glow, so they blur too)
  updateAndDrawConstellations(glowContext, dt, parallaxOffsetX, parallaxOffsetY);

  // Base pass
  context.save();
  context.globalCompositeOperation = 'source-over';
  context.filter = 'none';
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

// ---- resize & lifecycle ----
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

  window.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('touchmove', handleTouchMove, { passive: true });
  window.addEventListener('resize', handleResize);

  scheduleNextConstellation();

  animationFrame.value = requestAnimationFrame(draw);
});

onUnmounted(() => {
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value);
  }
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('mousemove', handlePointerMove);
  window.removeEventListener('touchmove', handleTouchMove);

  ctx.value = null;
  glowCtx.value = null;
  particleProps.value = null;
  constellations = [];
  nextConstellationTime = 0;
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
