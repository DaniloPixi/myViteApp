import { ref } from 'vue';

const itemParams = { memos: 'memoId', plans: 'planId', capsules: 'capsuleId' };
const allowedViews = ['home', 'memos', 'plans', 'capsules', 'map'];

export function useDeepLinks({
  currentView,
  focusMemoId,
  focusPlanId,
  focusCapsuleId,
  resetFilters,
}) {
  const focusRequest = ref(0);
  const targets = { memos: focusMemoId, plans: focusPlanId, capsules: focusCapsuleId };

  function applyDeepLinkFromUrlString(urlString) {
    if (!urlString) return;

    try {
      const url = new URL(urlString, window.location.origin);
      if (url.origin !== window.location.origin) return;

      const params = url.searchParams;
      const view =
        params.get('view') || Object.keys(itemParams).find((key) => params.get(itemParams[key]));
      if (!allowedViews.includes(view)) return;

      const id = itemParams[view] ? params.get(itemParams[view]) || null : null;
      resetFilters();
      currentView.value = view;
      for (const [key, target] of Object.entries(targets)) {
        target.value = key === view ? id : null;
      }
      // A new request must be observable even when the item ID hasn't changed.
      focusRequest.value += 1;

      for (const param of Object.values(itemParams)) params.delete(param);
      params.set('view', view);
      if (id) params.set(itemParams[view], id);
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    } catch (error) {
      console.warn('Failed to apply deep link from URL:', error);
    }
  }

  function navigateToView(view, id = null) {
    const url = new URL(window.location.href);
    for (const param of Object.values(itemParams)) url.searchParams.delete(param);
    url.searchParams.set('view', view);
    if (id && itemParams[view]) url.searchParams.set(itemParams[view], id);
    applyDeepLinkFromUrlString(url.href);
  }

  return { focusRequest, applyDeepLinkFromUrlString, navigateToView };
}
