import { watch } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';

export function usePwaAutoUpdate() {
  const { needRefresh, updateServiceWorker } = useRegisterSW();

  watch(needRefresh, (isUpdateAvailable) => {
    if (isUpdateAvailable) {
      updateServiceWorker();
    }
  });
}
