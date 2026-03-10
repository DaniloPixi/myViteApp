import { watch } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';

const RELOAD_DELAY_MS = 4000;

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

  const { needRefresh, updateServiceWorker } = useRegisterSW();
  let hasRequestedUpdate = false;
  let isReloading = false;

  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (isReloading) return;
    isReloading = true;

    showUpdatingBanner(RELOAD_DELAY_MS);

    window.setTimeout(() => {
      window.location.reload();
    }, RELOAD_DELAY_MS);
  });

  watch(needRefresh, async (isUpdateAvailable) => {
    if (!isUpdateAvailable || hasRequestedUpdate) return;
    hasRequestedUpdate = true;

    await updateServiceWorker();
  });
}
