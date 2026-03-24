import { onUnmounted, watch } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';

const RELOAD_DELAY_MS = 3000;
const UPDATE_CHECK_INTERVAL_MS = 60_000;

function showBlockingUpdateModal(delayMs) {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById('pwa-update-blocking-modal');
  if (existing) return;

  const overlay = document.createElement('div');
  overlay.id = 'pwa-update-blocking-modal';

  const countdownSeconds = Math.max(1, Math.round(delayMs / 1000));

  overlay.innerHTML = `
    <div class="pwa-update-modal">
      <div class="pwa-update-title">Updating app…</div>
      <div class="pwa-update-body">Please wait ${countdownSeconds}s</div>
    </div>
  `;

  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '99999',
    background: 'rgba(0,0,0,0.82)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'all',
  });

  const modal = overlay.querySelector('.pwa-update-modal');
  Object.assign(modal.style, {
    width: 'min(92vw, 420px)',
    borderRadius: '16px',
    padding: '1rem 1.2rem',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.25)',
    background:
      'radial-gradient(circle at 20% 20%, rgba(0,255,255,0.18), transparent 55%), radial-gradient(circle at 80% 80%, rgba(255,0,255,0.18), transparent 55%), rgba(10,10,16,0.9)',
    boxShadow: '0 0 24px rgba(255,0,255,0.35), 0 0 24px rgba(0,255,255,0.25)',
    color: '#fff',
    fontFamily: 'Innocent, cursive',
  });

  const title = overlay.querySelector('.pwa-update-title');
  Object.assign(title.style, {
    fontSize: '1.05rem',
    fontWeight: '700',
    marginBottom: '0.35rem',
    letterSpacing: '0.02em',
  });

  const body = overlay.querySelector('.pwa-update-body');
  Object.assign(body.style, {
    fontSize: '0.92rem',
    opacity: '0.9',
  });

  document.body.appendChild(overlay);

  return overlay;
}

export function usePwaAutoUpdate() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

  let registrationUpdateInterval = null;

  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_, registration) {
      if (!registration || registrationUpdateInterval) return;

      registrationUpdateInterval = window.setInterval(() => {
        registration.update();
      }, UPDATE_CHECK_INTERVAL_MS);
    },
  });

  let hasRequestedUpdate = false;
  let isReloading = false;

  const handleControllerChange = () => {
    if (isReloading) return;
    isReloading = true;

    showBlockingUpdateModal(RELOAD_DELAY_MS);

    window.setTimeout(() => {
      window.location.reload();
    }, RELOAD_DELAY_MS);
  };

  navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

  watch(needRefresh, async (isUpdateAvailable) => {
    if (!isUpdateAvailable || hasRequestedUpdate) return;
    hasRequestedUpdate = true;

    try {
      await updateServiceWorker();
    } catch (error) {
      console.error('Failed to apply service worker update:', error);
      hasRequestedUpdate = false;
    }
  });

  onUnmounted(() => {
    navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);

    if (registrationUpdateInterval) {
      window.clearInterval(registrationUpdateInterval);
      registrationUpdateInterval = null;
    }
  });
}