import { onUnmounted, watch } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';

const RELOAD_DELAY_MS = 4000;
const UPDATE_CHECK_INTERVAL_MS = 60_000;

function showUpdatingBanner(delayMs) {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById('pwa-update-banner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-update-banner';
  banner.textContent = `A new version is ready. Updating in ${Math.round(delayMs / 1000)}s…`;

  Object.assign(banner.style, {
    position: 'fixed',
    left: '50%',
    bottom: '20px',
    transform: 'translateX(-50%)',
    zIndex: '9999',
    padding: '0.6rem 0.9rem',
    borderRadius: '8px',
    background: 'rgba(15, 15, 15, 0.92)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    fontFamily: 'Montserrat, sans-serif',
    fontSize: '0.9rem',
    boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
  });

  document.body.appendChild(banner);
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

    showUpdatingBanner(RELOAD_DELAY_MS);

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
