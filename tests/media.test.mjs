import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parse, compileScript } from '@vue/compiler-sfc';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import createMediaRouter from '../netlify/functions/routes/media.mjs';
import { readApiResponse } from '../src/composables/readApiResponse.js';
import { usePhotoUtils } from '../src/composables/usePhotoUtils.js';
import {
  uploadMedia,
  prepareImage,
  validateMediaFiles,
  UPLOAD_CHUNK_BYTES,
} from '../src/composables/mediaUpload.js';
import {
  parseCloudinaryAsset,
  deleteMedia,
  saveWithMedia,
  discardUpload,
  deleteDocumentWithMedia,
  flushMediaDeletions,
} from '../netlify/functions/_shared/media.mjs';

const utils = usePhotoUtils();
const base = 'https://res.cloudinary.com/demo';
const id = '12345678-1234-1234-1234-123456789abc';
const asset = {
  url: `${base}/image/upload/v1/grus_uploads/${id}.jpg`,
  resource_type: 'image',
  uploadSessionId: id,
};
const reservation = {
  uid: 'alice',
  publicId: `grus_uploads/${id}`,
  resourceType: 'image',
  cloudName: 'demo',
  state: 'pending',
  expiresAt: 0,
};

// A transactional fake rejects reads after writes and commits only successful
// callbacks, to exercise save/cleanup behavior without touching real assets.
function database(seed = {}) {
  const rows = new Map(Object.entries(seed));
  let counter = 0;
  const ref = (path) => ({
    path,
    id: path.split('/').at(-1),
    delete: async () => rows.delete(path),
  });
  const snapshot = (r) => ({
    ref: r,
    id: r.id,
    exists: rows.has(r.path),
    data: () => rows.get(r.path),
  });
  return {
    rows,
    collection: (name) => ({
      doc: (key = `auto-${++counter}`) => ref(`${name}/${key}`),
      limit: (n) => ({
        get: async () => ({
          docs: [...rows.keys()]
            .filter((p) => p.startsWith(name + '/'))
            .slice(0, n)
            .map((p) => snapshot(ref(p))),
        }),
      }),
    }),
    runTransaction: async (fn) => {
      const writes = [];
      const result = await fn({
        get: async (r) => {
          assert.equal(writes.length, 0, 'Firestore requires all reads before writes');
          return snapshot(r);
        },
        set: (r, data, options) =>
          writes.push(() =>
            rows.set(r.path, options?.merge ? { ...rows.get(r.path), ...data } : data)
          ),
        update: (r, data) => writes.push(() => rows.set(r.path, { ...rows.get(r.path), ...data })),
        delete: (r) => writes.push(() => rows.delete(r.path)),
      });
      writes.forEach((write) => write());
      return result;
    },
  };
}

test('video posters support MOV, WebM, MP4, nested IDs and query strings', () => {
  for (const extension of ['mp4', 'mov', 'webm']) {
    const poster = utils.getMediaThumbnail({
      url: `${base}/video/upload/v1/folder/a.${extension}?x=1`,
      resource_type: 'video',
    });
    assert.match(poster, /w_320,h_320,so_0/);
    assert.match(poster, /\/f_auto\/q_auto\/v1\/folder\/a.jpg\?x=1$/);
  }
  assert.equal(utils.getImageUrl('blob:local'), 'blob:local');
  assert.equal(
    utils.getImageUrl('https://res.cloudinary.com.evil.test/image/upload/a.jpg'),
    'https://res.cloudinary.com.evil.test/image/upload/a.jpg'
  );
});

test('fullscreen preserves proportions and videos explicitly negotiate video formats', () => {
  assert.match(utils.getImageUrlByPreset(asset.url, 'modal'), /c_limit,w_1400,h_1400/);
  assert.doesNotMatch(utils.getImageUrlByPreset(asset.url, 'modal'), /c_fill|g_auto/);
  assert.match(utils.getImageSrcSet(asset.url), /w_480/);
  assert.doesNotMatch(utils.getImageSrcSet(asset.url), /h_480/);
  assert.match(utils.getVideoUrl(`${base}/video/upload/v1/movie`), /f_auto:video/);
});

test('fullscreen renders only the selected slide and no media when closed', async () => {
  const source = await readFile(
    new URL('../src/components/ImageModal.vue', import.meta.url),
    'utf8'
  );
  const { descriptor } = parse(source);
  const compiled = compileScript(descriptor, {
    id: 'media-test',
    inlineTemplate: true,
    templateOptions: { ssr: true },
  });
  const content = compiled.content
    .replace(/from ['"]vue['"]/g, `from '${import.meta.resolve('vue')}'`)
    .replace(
      /from ['"]vue\/server-renderer['"]/g,
      `from '${import.meta.resolve('vue/server-renderer')}'`
    )
    .replace(
      "from '../composables/usePhotoUtils'",
      `from '${new URL('../src/composables/usePhotoUtils.js', import.meta.url).href}'`
    );
  const { default: component } = await import(
    'data:text/javascript;base64,' + Buffer.from(content).toString('base64')
  );
  const mediaItems = [
    { url: `${base}/image/upload/v1/hidden.jpg` },
    { url: `${base}/video/upload/v1/selected.mp4`, resource_type: 'video' },
    { url: `${base}/video/upload/v1/other.mp4`, resource_type: 'video' },
  ];
  const html = await renderToString(
    createSSRApp(component, { isVisible: true, mediaItems, startIndex: 1 })
  );
  assert.equal((html.match(/<video/g) || []).length, 1);
  assert.equal((html.match(/<img/g) || []).length, 0);
  assert.match(html, /selected.mp4/);
  assert.doesNotMatch(html, /hidden.jpg|other.mp4/);
  const closed = await renderToString(createSSRApp(component, { isVisible: false, mediaItems }));
  assert.doesNotMatch(closed, /<video|<img/);
});

test('file validation rejects empty, oversized, unsupported and excessive selections', () => {
  assert.throws(
    () => validateMediaFiles([{ name: 'big', type: 'image/jpeg', size: 26 * 1024 ** 2 }]),
    /25 MB/
  );
  assert.throws(
    () => validateMediaFiles([{ name: 'big', type: 'video/mp4', size: 251 * 1024 ** 2 }]),
    /250 MB/
  );
  assert.throws(() => validateMediaFiles([{ name: 'empty', type: 'image/png', size: 0 }]));
  assert.throws(() => validateMediaFiles([{ name: 'script', type: 'text/html', size: 10 }]));
  assert.throws(() => validateMediaFiles([{}], 10), /10 files/);
  assert.doesNotThrow(() =>
    validateMediaFiles([{ name: 'ok', type: 'video/mp4', size: 150 * 1024 ** 2 }])
  );
});

test('image preparation caps dimensions, keeps smaller result, closes decoded image', async (t) => {
  let closed = false;
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage() {} }),
    toBlob: (fn) => fn(new Blob(['small'], { type: 'image/jpeg' })),
  };
  const oldBitmap = globalThis.createImageBitmap;
  const oldDocument = globalThis.document;
  globalThis.createImageBitmap = async () => ({
    width: 6000,
    height: 4000,
    close: () => {
      closed = true;
    },
  });
  globalThis.document = { createElement: () => canvas };
  t.after(() => {
    globalThis.createImageBitmap = oldBitmap;
    globalThis.document = oldDocument;
  });
  const original = new File([new Uint8Array(100)], 'photo.jpg', { type: 'image/jpeg' });
  const prepared = await prepareImage(original);
  assert.equal(canvas.width, 2560);
  assert.equal(canvas.height, 1707);
  assert(prepared.size < original.size);
  assert(closed);
});

test('animated images remain original files', async () => {
  const gif = new File(['GIF89a'], 'animation.gif', { type: 'image/gif' });
  const webp = new File(['RIFF'], 'animation.webp', { type: 'image/webp' });
  assert.equal(await prepareImage(gif), gif);
  assert.equal(await prepareImage(webp), webp);
});

const session = {
  id,
  endpoint: 'https://api.cloudinary.com/v1_1/demo/video/upload',
  fields: { public_id: `grus_uploads/${id}`, signature: 'signed', overwrite: false },
};
const completed = {
  secure_url: `${base}/video/upload/v1/grus_uploads/${id}.mp4`,
  public_id: `grus_uploads/${id}`,
  resource_type: 'video',
  done: true,
};

test('chunk boundaries are contiguous and transient retries reuse the same reservation', async () => {
  const file = new File([new Uint8Array(UPLOAD_CHUNK_BYTES + 123)], 'movie.mp4', {
    type: 'video/mp4',
  });
  const requests = [];
  const progress = [];
  const result = await uploadMedia(file, session, {
    transferId: 'transfer',
    onProgress: (p) => progress.push(p),
    fetchImpl: async (_url, options) => {
      requests.push(options);
      if (requests.length === 1)
        return Response.json({ error: { message: 'Try again' } }, { status: 503 });
      return Response.json(requests.length === 2 ? { done: false } : completed);
    },
  });
  assert.equal(requests.length, 3);
  assert.equal(
    requests[0].headers['Content-Range'],
    `bytes 0-${UPLOAD_CHUNK_BYTES - 1}/${file.size}`
  );
  assert.deepEqual(requests[0].headers, requests[1].headers);
  assert.equal(
    requests[2].headers['Content-Range'],
    `bytes ${UPLOAD_CHUNK_BYTES}-${file.size - 1}/${file.size}`
  );
  assert(
    requests.every(
      (r) =>
        r.headers['X-Unique-Upload-Id'] === 'transfer' &&
        r.body.get('public_id') === session.fields.public_id
    )
  );
  assert.equal(progress.at(-1), 100);
  assert.equal(result.uploadSessionId, id);
});

test('permanent upload errors and aborts do not retry', async () => {
  const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
  let calls = 0;
  await assert.rejects(
    uploadMedia(file, session, {
      fetchImpl: async () => {
        calls++;
        return Response.json({ error: { message: 'Invalid signature' } }, { status: 400 });
      },
    }),
    /Invalid signature/
  );
  assert.equal(calls, 1);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    uploadMedia(file, session, {
      signal: controller.signal,
      fetchImpl: async () => {
        calls++;
      },
    }),
    { name: 'AbortError' }
  );
  assert.equal(calls, 1);
});

test('deletion handles video and image namespaces, dotted public IDs, and rejects other clouds', async () => {
  const calls = [];
  const cloudinary = {
    config: () => ({ api_key: 'key', cloud_name: 'demo' }),
    api: {
      delete_resources: async (ids, options) => {
        calls.push({ ids, ...options });
        return { deleted: Object.fromEntries(ids.map((key) => [key, 'deleted'])) };
      },
    },
  };
  await deleteMedia(cloudinary, [
    asset,
    `${base}/video/upload/v3/folder/a.b.mov`,
    'https://res.cloudinary.com/other/image/upload/v1/photo.jpg',
  ]);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.find((c) => c.resource_type === 'video').ids, ['folder/a.b']);
  assert(calls.every((c) => c.invalidate));
  assert.equal(parseCloudinaryAsset('blob:a', 'demo'), null);
});

test('saving atomically claims uploads; duplicate create and post-save cleanup preserve media', async () => {
  const db = database({ [`mediaUploads/${id}`]: reservation });
  const ref = db.collection('memos').doc('memo');
  assert.equal(
    await saveWithMedia(db, ref, { creatorUid: 'alice', photos: [asset] }, 'alice', {
      create: true,
    }),
    true
  );
  assert(!db.rows.has(`mediaUploads/${id}`));
  assert.equal(db.rows.get('memos/memo').photos[0].uploadSessionId, undefined);
  assert.equal(
    await saveWithMedia(db, ref, { creatorUid: 'alice', photos: [] }, 'alice', { create: true }),
    false
  );
  assert.equal(db.rows.get('memos/memo').photos.length, 1);
  await discardUpload(
    db,
    { uploader: { destroy: () => assert.fail('Saved media must not be destroyed') } },
    db.collection('mediaUploads').doc(id),
    'alice'
  );
});

test('cancelled/foreign/mismatched uploads cannot be claimed by a save', async () => {
  for (const invalid of [
    { ...reservation, state: 'deleting' },
    { ...reservation, uid: 'bob' },
    { ...reservation, publicId: 'wrong' },
  ]) {
    const db = database({ [`mediaUploads/${id}`]: invalid });
    await assert.rejects(
      saveWithMedia(db, db.collection('memos').doc('memo'), { photos: [asset] }, 'alice')
    );
    assert(!db.rows.has('memos/memo'));
    assert(db.rows.has(`mediaUploads/${id}`));
  }
});

test('cancel retains a reservation for a later sweep; expiration removes it after both namespaces are cleaned', async () => {
  const db = database({ [`mediaUploads/${id}`]: reservation });
  const calls = [];
  const cloudinary = {
    uploader: {
      destroy: async (_id, options) => {
        calls.push(options.resource_type);
        return { result: 'ok' };
      },
    },
  };
  const ref = db.collection('mediaUploads').doc(id);
  await discardUpload(db, cloudinary, ref, 'alice');
  assert.equal(db.rows.get(ref.path).state, 'deleting');
  await discardUpload(db, cloudinary, ref, null, true);
  assert(!db.rows.has(ref.path));
  assert.deepEqual(calls, ['image', 'video', 'image', 'video']);
});

test('removed media is queued only after persistence; failed deletion jobs stay retryable', async () => {
  const db = database({ 'memos/memo': { creatorUid: 'alice', photos: [asset] } });
  await saveWithMedia(db, db.collection('memos').doc('memo'), { photos: [] }, 'alice', {
    merge: true,
  });
  assert.equal(db.rows.get('memos/memo').photos.length, 0);
  assert.equal([...db.rows.keys()].filter((key) => key.startsWith('mediaDeletionJobs/')).length, 1);
  const cloudinary = {
    config: () => ({ api_key: 'key', cloud_name: 'demo' }),
    api: {
      delete_resources: async () => {
        throw new Error('offline');
      },
    },
  };
  assert.equal((await flushMediaDeletions(db, cloudinary)).failed, 1);
  assert.equal([...db.rows.keys()].filter((key) => key.startsWith('mediaDeletionJobs/')).length, 1);
  cloudinary.api.delete_resources = async () => ({
    deleted: { [reservation.publicId]: 'deleted' },
  });
  assert.equal((await flushMediaDeletions(db, cloudinary)).failed, 0);
  await deleteDocumentWithMedia(db, db.collection('memos').doc('memo'));
  assert(!db.rows.has('memos/memo'));
});

function request(router, body, uid = 'alice') {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ status: this.statusCode, data });
      },
    };
    router(
      { method: 'POST', url: `/uploads/${id}`, body, user: { uid }, headers: {} },
      res,
      reject
    );
  });
}

test('upload API reserves server-generated IDs and recovers completed uploads on retry', async () => {
  const db = database();
  const cloudinary = {
    config: () => ({ api_key: 'public-key', api_secret: 'secret', cloud_name: 'demo' }),
    utils: {
      api_sign_request: (params) => {
        assert.equal(params.overwrite, false);
        return 'signature';
      },
    },
    api: {
      resource: async (publicId) => ({
        public_id: publicId,
        secure_url: `${base}/image/upload/v1/${publicId}.jpg`,
        resource_type: 'image',
        bytes: 100,
      }),
    },
  };
  const router = createMediaRouter(db, cloudinary);
  const first = await request(router, { resourceType: 'image', bytes: 100 });
  assert.equal(first.status, 200);
  assert.notEqual(first.data.fields.public_id, `grus_uploads/${id}`);
  assert.equal(first.data.fields.api_key, 'public-key');
  assert(!JSON.stringify(first).includes('secret'));
  const retry = await request(router, { resourceType: 'image', bytes: 100 });
  assert.equal(retry.data.uploaded.public_id, first.data.fields.public_id);
  const foreign = await request(router, { resourceType: 'image', bytes: 100 }, 'bob');
  assert.equal(foreign.status, 400);
  const oversized = await request(router, { resourceType: 'image', bytes: 26 * 1024 ** 2 });
  assert.equal(oversized.status, 400);
});

test('empty API 404 reports the missing API instead of a JSON parser exception', async () => {
  await assert.rejects(
    readApiResponse(new Response(null, { status: 404 }), {
      operation: 'Preparing media upload',
      apiRequest: true,
    }),
    (error) =>
      error.status === 404 &&
      error.retryable === false &&
      /Preparing media upload/.test(error.message) &&
      /HTTP 404/.test(error.message) &&
      /npm run dev:full/.test(error.message) &&
      !/Unexpected end/.test(error.message)
  );
});

test('empty, HTML and malformed success responses never count as saved memos', async () => {
  for (const body of ['', '<html>App shell</html>', '{', 'null', '[]']) {
    await assert.rejects(
      readApiResponse(new Response(body), {
        operation: 'Saving memo',
        apiRequest: true,
      }),
      /Saving memo failed.*HTTP 200/
    );
  }
  assert.deepEqual(
    await readApiResponse(Response.json({ success: true }), { operation: 'Saving memo' }),
    { success: true }
  );
  assert.equal(
    await readApiResponse(new Response(null, { status: 204 }), { allowEmpty: true }),
    null
  );
});

test('plain text proxy failures retain status and structured errors retain their message', async () => {
  await assert.rejects(
    readApiResponse(new Response('Bad gateway', { status: 502 }), {
      operation: 'Preparing media upload',
      apiRequest: true,
    }),
    (error) =>
      error.status === 502 && error.retryable && /Preparing media upload/.test(error.message)
  );
  await assert.rejects(
    readApiResponse(Response.json({ message: 'Cloudinary credentials missing' }, { status: 503 })),
    /Cloudinary credentials missing/
  );
});

test('empty transient Cloudinary responses retry the upload without leaking a parser error', async () => {
  let calls = 0;
  const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
  const result = await uploadMedia(file, session, {
    fetchImpl: async () =>
      ++calls === 1 ? new Response(null, { status: 502 }) : Response.json(completed),
  });
  assert.equal(calls, 2);
  assert.equal(result.public_id, completed.public_id);
});
