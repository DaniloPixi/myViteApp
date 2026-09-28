import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse, compileScript } from '@vue/compiler-sfc';
import { effectScope, nextTick, ref } from 'vue';
import { useDeepLinks } from '../src/composables/useDeepLinks.js';
import { useItemFocus } from '../src/composables/useItemFocus.js';
import { useViewFilters } from '../src/composables/useViewFilters.js';

function setup(t, href = 'https://example.test/?campaign=test#content') {
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.localStorage;
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  globalThis.window = {
    location: new URL(href),
    matchMedia: () => ({ matches: false }),
    history: {
      state: { retained: true },
      replaceState(state, _title, url) {
        this.state = state;
        globalThis.window.location = new URL(url, globalThis.window.location.origin);
      },
    },
  };
  const scope = effectScope();
  const state = scope.run(() => ({
    ...useViewFilters(),
    focusMemoId: ref(null),
    focusPlanId: ref(null),
    focusCapsuleId: ref(null),
  }));
  const links = useDeepLinks(state);
  t.after(() => {
    scope.stop();
    globalThis.window = originalWindow;
    globalThis.localStorage = originalStorage;
  });
  return { ...state, ...links, scope };
}

async function flush() {
  await nextTick();
  await nextTick();
}

function attachCard(harness, kind, ready = ref(false)) {
  const id = kind === 'plans' ? harness.focusPlanId : harness.focusMemoId;
  const calls = [];
  const classes = new Set();
  const element = {
    focus: (options) => calls.push(['focus', options]),
    scrollIntoView: (options) => calls.push(['scroll', options]),
    classList: { add: (value) => classes.add(value), remove: (value) => classes.delete(value) },
  };
  harness.scope.run(() =>
    useItemFocus({
      getId: () => id.value,
      getRequest: () => harness.focusRequest.value,
      isReady: () => ready.value,
      getElement: () => (ready.value ? element : null),
      highlightClass: 'highlight',
      beforeFocus: (value) => calls.push(['expand', value]),
    })
  );
  return { calls, classes, ready };
}

for (const [view, param] of [
  ['plans', 'planId'],
  ['memos', 'memoId'],
]) {
  test(`${view}: direct URL retains its target on reload and supports encoded IDs`, async (t) => {
    const h = setup(t);
    h.applyDeepLinkFromUrlString(`/?view=${view}&${param}=a%2Bb%20c&campaign=test#content`);
    await flush();
    assert.equal(h.currentView.value, view);
    assert.equal(h[view === 'plans' ? 'focusPlanId' : 'focusMemoId'].value, 'a+b c');
    const copiedUrl = globalThis.window.location.href;
    assert.equal(globalThis.window.location.searchParams.get(param), 'a+b c');
    assert.equal(globalThis.window.location.searchParams.get('campaign'), 'test');
    assert.equal(globalThis.window.location.hash, '#content');
    assert.deepEqual(globalThis.window.history.state, { retained: true });
    h.currentView.value = 'home';
    h.applyDeepLinkFromUrlString(copiedUrl);
    assert.equal(h.currentView.value, view);
  });

  test(`${view}: delayed data is focused after the former retry deadline`, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const h = setup(t);
    const card = attachCard(h, view);
    h.navigateToView(view, 'target');
    await flush();
    t.mock.timers.tick(10000);
    assert.equal(card.calls.length, 0);
    card.ready.value = true;
    await flush();
    assert.deepEqual(
      card.calls.map(([name]) => name),
      ['expand', 'focus', 'scroll']
    );
    assert.ok(card.classes.has('highlight'));
    t.mock.timers.tick(1500);
    assert.equal(card.classes.size, 0);
  });

  test(`${view}: reopening the same item focuses again and clears same-view filters`, async (t) => {
    const h = setup(t);
    const card = attachCard(h, view, ref(true));
    h.navigateToView(view, 'target');
    await flush();
    h.titleFilter.value = 'hides target';
    h.dateFilter.value = '1999-01-01';
    h.navigateToView(view, 'target');
    await flush();
    assert.equal(card.calls.filter(([name]) => name === 'scroll').length, 2);
    assert.equal(h.titleFilter.value, '');
    assert.equal(h.dateFilter.value, '');
  });

  test(`${view}: an ID alone selects its view`, (t) => {
    const h = setup(t);
    h.applyDeepLinkFromUrlString(`/?${param}=target`);
    assert.equal(h.currentView.value, view);
    assert.equal(globalThis.window.location.searchParams.get('view'), view);
  });
}

test('switching tabs removes stale item IDs from state and URL', async (t) => {
  const h = setup(t);
  h.navigateToView('plans', 'plan');
  h.navigateToView('memos', 'memo');
  assert.equal(h.focusPlanId.value, null);
  assert.equal(globalThis.window.location.searchParams.has('planId'), false);
  h.navigateToView('home');
  await flush();
  assert.equal(h.focusMemoId.value, null);
  assert.equal(globalThis.window.location.searchParams.has('memoId'), false);
  assert.equal(globalThis.window.location.searchParams.get('campaign'), 'test');
});

test('missing items remain pending and cancelled requests do not focus later', async (t) => {
  const h = setup(t);
  const card = attachCard(h, 'plans');
  h.navigateToView('plans', 'missing');
  await flush();
  assert.equal(card.calls.length, 0);
  h.navigateToView('home');
  card.ready.value = true;
  await flush();
  assert.equal(card.calls.length, 0);
});

test('unmounting cancels queued focus and removes highlights', async (t) => {
  const h = setup(t);
  const card = attachCard(h, 'memos', ref(true));
  h.navigateToView('memos', 'first');
  await flush();
  assert.equal(card.classes.size, 1);
  h.navigateToView('memos', 'second');
  h.scope.stop();
  await flush();
  assert.equal(card.classes.size, 0);
  assert.equal(card.calls.filter(([name]) => name === 'scroll').length, 1);
});

test('focus respects reduced motion', async (t) => {
  const h = setup(t);
  globalThis.window.matchMedia = () => ({ matches: true });
  const card = attachCard(h, 'plans', ref(true));
  h.navigateToView('plans', 'target');
  await flush();
  assert.equal(card.calls.find(([name]) => name === 'scroll')[1].behavior, 'auto');
});

test('external URLs and invalid views do not change navigation', (t) => {
  const h = setup(t);
  const href = globalThis.window.location.href;
  h.applyDeepLinkFromUrlString('https://other.test/?view=plans&planId=target');
  h.applyDeepLinkFromUrlString('/?view=invalid&memoId=target');
  assert.equal(h.currentView.value, 'home');
  assert.equal(h.focusRequest.value, 0);
  assert.equal(globalThis.window.location.href, href);
});

// Exercise App's actual auth callback with local services, without logging in
// or making network requests. Both initialization orders occur with cached auth.
const { descriptor } = parse(readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8'));
const appScript = compileScript(descriptor, { id: 'deep-link-auth-test' });
const authDeclaration = appScript.scriptSetupAst
  .flatMap((node) => node.declarations || [])
  .find((node) => node.id.name === 'unsubscribeAuth');
const authCallback = authDeclaration.init.arguments[0];
const authSource = descriptor.scriptSetup.content.slice(authCallback.start, authCallback.end);

for (const linkFirst of [true, false]) {
  test(`linked destination survives sign-in (link first: ${linkFirst})`, async (t) => {
    const h = setup(t);
    const user = ref(null);
    const services = {
      user,
      currentView: h.currentView,
      registerDeviceForNotifications() {},
      setupDataListeners() {},
      setPartnerPresenceSubscription() {},
      clearDataListeners() {},
      clearPartnerPresenceSubscription() {},
      localStorage: globalThis.localStorage,
    };
    const onAuthChange = new Function(...Object.keys(services), `return (${authSource});`)(
      ...Object.values(services)
    );
    if (linkFirst) h.applyDeepLinkFromUrlString('/?view=plans&planId=after-login');
    onAuthChange(null);
    if (!linkFirst) h.applyDeepLinkFromUrlString('/?view=plans&planId=after-login');
    await flush();
    onAuthChange({ uid: 'test-user' });
    await flush();
    assert.equal(h.currentView.value, 'plans');
    assert.equal(h.focusPlanId.value, 'after-login');
    assert.equal(globalThis.window.location.searchParams.get('planId'), 'after-login');
  });
}
