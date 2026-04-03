// src/composables/useSoundManager.js
import { ref } from 'vue';

const STORAGE_KEY = 'weapp:sound-settings';

// Singleton reactive state
const enabled = ref(true);
const volume = ref(0.45); // 0..1
let audioCtx = null;
let unlocked = false;

function clamp01(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed.enabled === 'boolean') enabled.value = parsed.enabled;
    if (typeof parsed.volume !== 'undefined') volume.value = clamp01(parsed.volume);
  } catch {
    // ignore corrupt localStorage
  }
}

function saveSettings() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      enabled: enabled.value,
      volume: volume.value,
    })
  );
}

function ensureCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

// Must be called from user gesture at least once (autoplay policy)
async function initAudioFromGesture() {
  const ctx = ensureCtx();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // "Unlock ping" (silent-ish short tone)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    osc.frequency.value = 440;
    osc.type = 'sine';

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    osc.start(now);
    osc.stop(now + 0.01);

    unlocked = true;
    return true;
  } catch {
    return false;
  }
}

function tone({ freq = 440, duration = 0.12, type = 'sine', when = 0, gainScale = 1 }) {
  if (!enabled.value) return;
  const ctx = ensureCtx();
  if (!ctx || !unlocked) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + when);

  const maxGain = clamp01(volume.value) * gainScale;
  const start = ctx.currentTime + when;
  const end = start + duration;

  // quick attack + smooth release
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, maxGain), start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(end + 0.01);
}

function play(kind = 'tap') {
  // Keep it subtle
  switch (kind) {
    case 'notification':
      tone({ freq: 740, duration: 0.08, type: 'triangle', gainScale: 0.8 });
      tone({ freq: 988, duration: 0.1, type: 'triangle', when: 0.07, gainScale: 0.65 });
      break;
    case 'success':
      tone({ freq: 523.25, duration: 0.08, type: 'sine', gainScale: 0.7 });
      tone({ freq: 659.25, duration: 0.1, type: 'sine', when: 0.06, gainScale: 0.7 });
      tone({ freq: 783.99, duration: 0.12, type: 'sine', when: 0.12, gainScale: 0.65 });
      break;
    case 'error':
      tone({ freq: 220, duration: 0.12, type: 'sawtooth', gainScale: 0.5 });
      tone({ freq: 196, duration: 0.12, type: 'sawtooth', when: 0.1, gainScale: 0.45 });
      break;
    default: // tap
      tone({ freq: 660, duration: 0.05, type: 'triangle', gainScale: 0.45 });
      break;
  }
}

function setEnabled(next) {
  enabled.value = !!next;
  saveSettings();
}

function setVolume(next) {
  volume.value = clamp01(next);
  saveSettings();
}

// init from storage once
if (typeof window !== 'undefined') {
  loadSettings();
}

export function useSoundManager() {
  return {
    enabled,
    volume,
    initAudioFromGesture,
    play,
    setEnabled,
    setVolume,
  };
}