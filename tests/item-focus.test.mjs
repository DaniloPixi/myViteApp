import test from 'node:test';
import assert from 'node:assert/strict';
import { effectScope, nextTick, ref } from 'vue';
import { useItemFocus } from '../src/composables/useItemFocus.js';

function setup(t, { ready = false, reducedMotion = false } = {}) {
  const originalWindow = globalThis.window;
  globalThis.window = { matchMedia: () => ({ matches: reducedMotion }) };
  const scope = effectScope();
  t.after(() => {
    scope.stop();
    globalThis.window = originalWindow;
  });
  const id = ref('first');
  const loaded = ref(ready);
  const calls = [];
  const classes = new Set();
  const element = {
    focus: (options) => calls.push(['focus', options]),
    scrollIntoView: (options) => calls.push(['scroll', options]),
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
  };
  scope.run(() => useItemFocus({
    getId: () => id.value,
    isReady: () => loaded.value,
    getElement: (target) => { calls.push(['element', target]); return element; },
    highlightClass: 'highlight',
    beforeFocus: (target) => calls.push(['expand', target]),
  }));
  return { id, loaded, calls, classes, scope };
}

async function flush() {
  await nextTick();
  await nextTick();
}

test('waits for data, then focuses and centers the rendered item', async (t) => {
  const { loaded, calls, classes } = setup(t);
  await flush();
  assert.deepEqual(calls, []);
  loaded.value = true;
  await flush();
  assert.deepEqual(calls, [
    ['expand', 'first'],
    ['element', 'first'],
    ['focus', { preventScroll: true }],
    ['scroll', { behavior: 'smooth', block: 'center', inline: 'nearest' }],
  ]);
  assert.ok(classes.has('highlight'));
});

test('uses the latest target while loading and respects reduced motion', async (t) => {
  const { id, loaded, calls } = setup(t, { reducedMotion: true });
  id.value = 'second';
  await flush();
  loaded.value = true;
  await flush();
  assert.deepEqual(calls.find(([action]) => action === 'element'), ['element', 'second']);
  assert.equal(calls.find(([action]) => action === 'scroll')[1].behavior, 'auto');
});

test('unmount cancels pending focus', async (t) => {
  const pending = setup(t, { ready: true });
  pending.scope.stop();
  await flush();
  assert.equal(pending.calls.some(([action]) => action === 'scroll'), false);
});

test('unmount removes an existing highlight', async (t) => {
  const active = setup(t, { ready: true });
  await flush();
  assert.ok(active.classes.has('highlight'));
  active.scope.stop();
  assert.equal(active.classes.has('highlight'), false);
});

test('does not steal focus again when the same item reloads', async (t) => {
  const { loaded, calls } = setup(t, { ready: true });
  await flush();
  loaded.value = false;
  await flush();
  loaded.value = true;
  await flush();
  assert.equal(calls.filter(([action]) => action === 'scroll').length, 1);
});
