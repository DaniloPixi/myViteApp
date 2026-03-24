<template>
  <div class="p5-starfield-wrapper">
    <canvas ref="canvasRef" class="p5-starfield-canvas"></canvas>
    <div class="p5-starfield-content">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onUnmounted, watch } from 'vue';
import { createNoise3D } from 'simplex-noise';

const TAU = 2 * Math.PI;
const BASE_TTL = 50;
const RANGE_TTL = 150;
const PARTICLE_PROP_COUNT = 10; // x, y, vx, vy, life, ttl, speed, radius, hue, depth

const NOISE_STEPS = 3;
const X_OFF = 0.00125;
const Y_OFF = 0.00125;
const Z_OFF = 0.0005;

// Constellations
const MAX_CONSTELLATIONS = 2;
const CONST_MIN_INTERVAL = 5;
const CONST_MAX_INTERVAL = 15;
const CONST_MIN_TTL = 3.5;
const CONST_MAX_TTL = 7.0;
const CONST_MIN_STARS = 4;
const CONST_MAX_STARS = 8;

const CONST_PALETTES = [
  { fromHue: 190, toHue: 305 },
  { fromHue: 260, toHue: 40 },
  { fromHue: 210, toHue: 260 },
];

// Themes
const STAR_THEMES = {
  cosmicPurple: { hueBase: 255, hueRange: 95, sat: 100, lightNear: 72, lightFar: 58 },
  auroraTeal: { hueBase: 178, hueRange: 70, sat: 95, lightNear: 74, lightFar: 56 },
  sunsetNebula: { hueBase: 18, hueRange: 115, sat: 96, lightNear: 73, lightFar: 54 },
  monochrome: { hueBase: 220, hueRange: 8, sat: 10, lightNear: 88, lightFar: 62 },
  cyberpunk: { hueBase: 300, hueRange: 120, sat: 100, lightNear: 76, lightFar: 57 },
};

const THEME_ORDER = ['cosmicPurple', 'auroraTeal', 'sunsetNebula', 'monochrome', 'cyberpunk'];

const props = defineProps({
  particleCount: { type: Number, default: 300 },
  rangeY: { type: Number, default: 150 },

  // Used when theme="custom"
  baseHue: { type: Number, default: 260 },

  baseSpeed: { type: Number, default: 0.0 },
  rangeSpeed: { type: Number, default: 1.5 },
  baseRadius: { type: Number, default: 1 },
  rangeRadius: { type: Number, default: 2 },

  parallaxIntensity: { type: Number, default: 0.12 },
  parallaxEasing: { type: Number, default: 0.06 },

  // cosmicPurple | auroraTeal | sunsetNebula | monochrome | cyberpunk | custom
  theme: { type: String, default: 'auroraTeal' },

  // 0 = off
  dofStrength: { type: Number, default: 0.5 },

  // Intro warp
  introWarpEnabled: { type: Boolean, default: true },
  introWarpDuration: { type: Number, default: 1.0 },

  // Theme cycle
  themeCycleEnabled: { type: Boolean, default: true },
  themeCycleSeconds: { type: Number, default: 12 },
  themeCycleMode: { type: String, default: 'random' }, // sequential | random
});

const animationFrame = ref(null);
const particleProps = shallowRef(null);
const center = ref([0, 0]);

const ctx = shallowRef(null);
const glowCtx = shallowRef(null);
const canvasRef = ref(null);
const glowCanvasRef = shallowRef(null);

const activeTheme = ref(props.theme);

let devicePixelRatioValue = 1;
let viewportWidth = 0;
let viewportHeight = 0;
let particlePropsLength = 0;

let lastTime = 0;
let elapsedSeconds = 0;

let pointerNormX = 0;
let pointerNormY = 0;
let parallaxX = 0;
let parallaxY = 0;

let constellations = [];
let nextConstellationTime = 0;

let resizeTimeout = null;
let themeIntervalId = null;

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

/* -------------------------------- Helpers -------------------------------- */

function rand(n) {
  return n * Math.random();
}
function randRange(n) {
  return n - rand(2 * n);
}
function randBetween(min, max) {
  return min + Math.random() * (max - min);
}
function lerp(a, b, t) {
  return (1 - t) * a + t * b;
}
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
function fadeInOut(t, m) {
  const hm = 0.5 * m;
  return Math.abs(((t + hm) % m) - hm) / hm;
}

function isMobileLike() {
  return (
    window.matchMedia?.('(pointer: coarse)')?.matches ||
    (viewportWidth || window.innerWidth) <= 900
  );
}
function mobileFactor() {
  // 0 mobile-ish -> 1 desktop-ish
  const w = viewportWidth || window.innerWidth || 1200;
  return clamp01((w - 420) / (1200 - 420));
}

function getTheme() {
  const name = activeTheme.value;
  if (name === 'custom') {
    return { hueBase: props.baseHue, hueRange: 100, sat: 100, lightNear: 72, lightFar: 58 };
  }
  return STAR_THEMES[name] || STAR_THEMES.cosmicPurple;
}

function getWarpProgress() {
  if (!props.introWarpEnabled) return 1;
  const d = Math.max(0.001, props.introWarpDuration);
  return clamp01(elapsedSeconds / d);
}

/* ----------------------------- Theme cycling ------------------------------ */

function pickNextTheme(current) {
  if (props.themeCycleMode === 'random') {
    const pool = THEME_ORDER.filter((t) => t !== current);
    return pool[Math.floor(Math.random() * pool.length)] || current;
  }
  const idx = THEME_ORDER.indexOf(current);
  if (idx === -1) return THEME_ORDER[0];
  return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
}

function startThemeCycle() {
  stopThemeCycle();
  if (!props.themeCycleEnabled) return;
  const ms = Math.max(1, props.themeCycleSeconds) * 1000;
  themeIntervalId = window.setInterval(() => {
    activeTheme.value = pickNextTheme(activeTheme.value);
  }, ms);
}

function stopThemeCycle() {
  if (themeIntervalId !== null) {
    window.clearInterval(themeIntervalId);
    themeIntervalId = null;
  }
}

/* -------------------------------- Input ---------------------------------- */

function handlePointerMove(e) {
  const w = viewportWidth || window.innerWidth || 1;
  const h = viewportHeight || window.innerHeight || 1;
  pointerNormX = ((e.clientX ?? 0) / w - 0.5) * 2;
  pointerNormY = ((e.clientY ?? 0) / h - 0.5) * 2;
}

function handleTouchMove(e) {
  if (!e.touches?.length) return;
  const t = e.touches[0];
  const w = viewportWidth || window.innerWidth || 1;
  const h = viewportHeight || window.innerHeight || 1;
  pointerNormX = (t.clientX / w - 0.5) * 2;
  pointerNormY = (t.clientY / h - 0.5) * 2;
}

/* ------------------------------- Particles -------------------------------- */

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

  const depth = Math.random();
  const theme = getTheme();
  const warpT = getWarpProgress();
  const isWarping = warpT < 1;

  if (isWarping) {
    const spread = lerp(Math.min(w, h) * 0.04, Math.min(w, h) * 0.22, warpT);
    particleCache.x = center.value[0] + randRange(spread);
    particleCache.y = center.value[1] + randRange(spread);
  } else {
    particleCache.x = rand(w);

    // Mobile-aware multi-band bias (less uniform)
    const isMobile = isMobileLike();
    const mf = mobileFactor();

    const centerChance = lerp(0.42, 0.63, mf);
    const bandChance = isMobile ? 0.38 : 0.22;
    const r = Math.random();

    if (r < centerChance) {
      const mobileRangeY = props.rangeY * lerp(1.5, 1.0, mf);
      let y = center.value[1] + randRange(mobileRangeY);
      if (y < 0) y = 0;
      if (y > h) y = h;
      particleCache.y = y;
    } else if (r < centerChance + bandChance) {
      const bands = [0.22, 0.38, 0.56, 0.74];
      const b = bands[Math.floor(Math.random() * bands.length)];
      const spread = h * (isMobile ? 0.08 : 0.06);
      let y = h * b + randRange(spread);
      if (y < 0) y = 0;
      if (y > h) y = h;
      particleCache.y = y;
    } else {
      particleCache.y = rand(h);
    }
  }

  particleCache.vx = 0;
  particleCache.vy = 0;
  particleCache.life = 0;
  particleCache.ttl = BASE_TTL + rand(RANGE_TTL);

  const depthSpeedMul = 0.4 + (1 - depth) * 1.6;
  particleCache.speed = (props.baseSpeed + rand(props.rangeSpeed)) * depthSpeedMul;

  const baseRadius = props.baseRadius + rand(props.rangeRadius);
  const depthSizeMul = 0.1 + (1 - depth) * 1.7;
  particleCache.radius = baseRadius * depthSizeMul;

  particleCache.hue = theme.hueBase + rand(theme.hueRange);
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
  const arr = particleProps.value;
  const w = viewportWidth || canvas.width;
  const h = viewportHeight || canvas.height;
  const theme = getTheme();

  particleCache.x = arr[i];
  particleCache.y = arr[i + 1];
  particleCache.vx = arr[i + 2];
  particleCache.vy = arr[i + 3];
  particleCache.life = arr[i + 4];
  particleCache.ttl = arr[i + 5];
  particleCache.speed = arr[i + 6];
  particleCache.radius = arr[i + 7];
  particleCache.hue = arr[i + 8];
  particleCache.depth = arr[i + 9];

  const n =
    noise3D(
      particleCache.x * X_OFF,
      particleCache.y * Y_OFF,
      timeSeconds * Z_OFF,
    ) *
    NOISE_STEPS *
    TAU;

  const mf = mobileFactor();
  const isMobile = isMobileLike();

  const steerLerp = lerp(0.34, 0.5, mf);
  let nextVx = lerp(particleCache.vx, Math.cos(n), steerLerp);
  let nextVy = lerp(particleCache.vy, Math.sin(n), steerLerp);

  // Slight rightward drift on mobile to reduce isotropic feel
  if (isMobile) {
    const drift = 0.08 + (1 - particleCache.depth) * 0.07;
    nextVx += drift;
  }

  // Intro warp
  const warpT = getWarpProgress();
  const warpStrength = 1 - warpT;
  if (warpStrength > 0.001) {
    const dx = particleCache.x - center.value[0];
    const dy = particleCache.y - center.value[1];
    const invLen = 1 / Math.max(1e-4, Math.hypot(dx, dy));
    const ux = dx * invLen;
    const uy = dy * invLen;

    const depthBoost = 0.55 + (1 - particleCache.depth) * 1.2;
    const boost = 2.8 * warpStrength * depthBoost;
    nextVx += ux * boost;
    nextVy += uy * boost;
  }

  const speedFactor = dt * 60 * lerp(0.86, 1.0, mf);
  const nextX = particleCache.x + nextVx * particleCache.speed * speedFactor;
  const nextY = particleCache.y + nextVy * particleCache.speed * speedFactor;

  const depth = particleCache.depth;
  const parallaxDepthFactor = 1 - depth * 0.7;
  const px = parallaxOffsetX * parallaxDepthFactor;
  const py = parallaxOffsetY * parallaxDepthFactor;

  const drawX1 = particleCache.x + px;
  const drawY1 = particleCache.y + py;
  const drawX2 = nextX + px;
  const drawY2 = nextY + py;

  // DOF look
  const dof = Math.max(0, props.dofStrength);
  const farBlur = 1 + dof * depth * 0.95;
  const lineWidth = particleCache.radius * farBlur;

  const lifeFade = fadeInOut(particleCache.life, particleCache.ttl);
  const depthAlpha = 1 - depth * (0.38 * dof);
  const alpha = lifeFade * depthAlpha;

  const lightness = lerp(theme.lightNear, theme.lightFar, depth);

  glowCtx.value.lineWidth = lineWidth;
  glowCtx.value.strokeStyle = `hsla(${particleCache.hue}, ${theme.sat}%, ${lightness}%, ${alpha})`;
  glowCtx.value.beginPath();
  glowCtx.value.moveTo(drawX1, drawY1);
  glowCtx.value.lineTo(drawX2, drawY2);
  glowCtx.value.stroke();

  const nextLife = particleCache.life + dt * 60;
  arr[i] = nextX;
  arr[i + 1] = nextY;
  arr[i + 2] = nextVx;
  arr[i + 3] = nextVy;
  arr[i + 4] = nextLife;

  if (
    nextX > w ||
    nextX < 0 ||
    nextY > h ||
    nextY < 0 ||
    nextLife > particleCache.ttl
  ) {
    initParticle(i);
  }
}

/* ----------------------------- Constellations ----------------------------- */

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

  const maxDist = Math.min(w, h) * 0.25;
  const desiredCount = Math.floor(randBetween(CONST_MIN_STARS, CONST_MAX_STARS + 1));

  const indices = [baseIndex];
  const used = new Set([baseIndex]);
  let attempts = 0;
  const maxAttempts = 80;

  while (indices.length < desiredCount && attempts < maxAttempts) {
    attempts++;
    const idx = Math.floor(Math.random() * totalParticles);
    if (used.has(idx)) continue;

    const pos = getParticleScreenPos(idx, parallaxOffsetX, parallaxOffsetY);
    const dx = pos.x - basePos.x;
    const dy = pos.y - basePos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= maxDist) {
      indices.push(idx);
      used.add(idx);
    }
  }

  if (indices.length < CONST_MIN_STARS) {
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

    const alphaEnvelope = Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 1.2;
    const alpha = 0.4 * alphaEnvelope;
    const palette = CONST_PALETTES[con.paletteIndex % CONST_PALETTES.length];

    const positions = [];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < idxList.length; i++) {
      const p = getParticleScreenPos(idxList[i], parallaxOffsetX, parallaxOffsetY);
      positions.push(p);
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) continue;

    glowContext.save();
    glowContext.lineWidth = 0.9;
    glowContext.lineCap = 'round';
    glowContext.globalCompositeOperation = 'lighter';
    glowContext.globalAlpha = alpha;

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
      if (i === 0) glowContext.moveTo(a.x, a.y);
      glowContext.lineTo(b.x, b.y);
    }
    glowContext.stroke();
    glowContext.restore();
  }
}

/* -------------------------------- Render ---------------------------------- */

function draw(now) {
  if (!canvasRef.value || !ctx.value || !glowCtx.value || !particleProps.value) {
    animationFrame.value = requestAnimationFrame(draw);
    return;
  }

  if (!lastTime) lastTime = now;
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  elapsedSeconds += dt;

  // Parallax follow
  const easing = props.parallaxEasing;
  parallaxX += (pointerNormX - parallaxX) * easing;
  parallaxY += (pointerNormY - parallaxY) * easing;

  const canvas = canvasRef.value;
  const context = ctx.value;
  const glowCanvas = glowCanvasRef.value;
  const glowContext = glowCtx.value;

  const w = viewportWidth || canvas.width;
  const h = viewportHeight || canvas.height;

  const parallaxScale = isMobileLike()
    ? props.parallaxIntensity * 0.55
    : props.parallaxIntensity;

  const parallaxOffsetX = parallaxX * w * parallaxScale;
  const parallaxOffsetY = parallaxY * h * parallaxScale;

  trySpawnConstellation(parallaxOffsetX, parallaxOffsetY);

  context.clearRect(0, 0, canvas.width, canvas.height);
  glowContext.clearRect(0, 0, glowCanvas.width, glowCanvas.height);

  glowContext.lineCap = 'round';
  glowContext.globalCompositeOperation = 'source-over';
  glowContext.filter = 'none';

  for (let i = 0; i < particleProps.value.length; i += PARTICLE_PROP_COUNT) {
    updateParticle(i, dt, elapsedSeconds, parallaxOffsetX, parallaxOffsetY);
  }

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

/* ------------------------------ Resize/setup ------------------------------ */

function handleResize() {
  if (resizeTimeout !== null) window.clearTimeout(resizeTimeout);

  resizeTimeout = window.setTimeout(() => {
    if (!canvasRef.value || !glowCanvasRef.value || !ctx.value || !glowCtx.value) return;

    const canvas = canvasRef.value;
    const glowCanvas = glowCanvasRef.value;

    devicePixelRatioValue = Math.min(window.devicePixelRatio || 1, 2);
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;

    canvas.width = Math.floor(viewportWidth * devicePixelRatioValue);
    canvas.height = Math.floor(viewportHeight * devicePixelRatioValue);
    glowCanvas.width = canvas.width;
    glowCanvas.height = canvas.height;

    ctx.value.setTransform(devicePixelRatioValue, 0, 0, devicePixelRatioValue, 0, 0);
    glowCtx.value.setTransform(devicePixelRatioValue, 0, 0, devicePixelRatioValue, 0, 0);
    center.value = [0.5 * viewportWidth, 0.5 * viewportHeight];

    rebuildParticles();
  }, 150);
}

/* -------------------------------- Watches --------------------------------- */

// Keep internal active theme in sync with prop
watch(
  () => props.theme,
  (next) => {
    activeTheme.value = next;
  },
);

// Restart cycle if cycle settings change
watch(
  () => [props.themeCycleEnabled, props.themeCycleSeconds, props.themeCycleMode],
  () => {
    startThemeCycle();
  },
);

/* ------------------------------- Lifecycle -------------------------------- */

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

  canvas.width = Math.floor(viewportWidth * devicePixelRatioValue);
  canvas.height = Math.floor(viewportHeight * devicePixelRatioValue);
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
  startThemeCycle();

  animationFrame.value = requestAnimationFrame(draw);
});

onUnmounted(() => {
  if (animationFrame.value) cancelAnimationFrame(animationFrame.value);

  if (resizeTimeout !== null) {
    window.clearTimeout(resizeTimeout);
    resizeTimeout = null;
  }

  stopThemeCycle();

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

.p5-starfield-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  display: block;
  pointer-events: none;
  z-index: 0;
}

.p5-starfield-content {
  position: relative;
  z-index: 1;
}
</style>