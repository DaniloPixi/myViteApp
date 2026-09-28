import { nextTick, watch } from 'vue';

// Wait for the requested card to load and render, without a network timeout.
export function useItemFocus({
  getId,
  getRequest = () => 0,
  isReady,
  getElement,
  highlightClass,
  beforeFocus,
}) {
  let lastFocusedId = null;
  let lastFocusedRequest = null;

  watch(
    [getId, isReady, getRequest],
    async ([id, ready, request], _previous, onCleanup) => {
      if (!id) {
        lastFocusedId = null;
        return;
      }
      if (!ready || (id === lastFocusedId && request === lastFocusedRequest)) return;

      let cancelled = false;
      let element;
      let highlightTimer;
      onCleanup(() => {
        cancelled = true;
        clearTimeout(highlightTimer);
        element?.classList.remove(highlightClass);
      });

      beforeFocus?.(id);
      await nextTick();
      if (cancelled) return;

      element = getElement(id);
      if (!element) return;

      lastFocusedId = id;
      lastFocusedRequest = request;
      element.focus({ preventScroll: true });
      element.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center',
        inline: 'nearest',
      });
      element.classList.add(highlightClass);
      highlightTimer = setTimeout(() => element.classList.remove(highlightClass), 1500);
    },
    { immediate: true, flush: 'post' }
  );
}
