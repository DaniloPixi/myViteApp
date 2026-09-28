import { onBeforeUnmount, ref } from 'vue';
import { auth } from '../firebase';
import { prepareImage, uploadMedia, validateMediaFiles } from './mediaUpload';
import { readApiResponse } from './readApiResponse';

export function useMediaUpload(initialMedia = []) {
  const media = ref(
    initialMedia.map((item) => ({ ...item, resource_type: item.resource_type || 'image' }))
  );
  const uploading = ref(false);
  const progress = ref(0);
  const controller = new AbortController();
  let saving = false;

  async function api(path, options = {}) {
    if (!auth.currentUser) throw new Error('Please sign in before uploading.');
    const token = await auth.currentUser.getIdToken();
    const response = await fetch('/api/media/uploads/' + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    return readApiResponse(response, {
      operation: options.method === 'DELETE' ? 'Media cleanup' : 'Preparing media upload',
      allowEmpty: options.method === 'DELETE',
      apiRequest: true,
    });
  }

  function addFiles(files) {
    if (uploading.value || saving) return;
    validateMediaFiles(files, media.value.length);
    media.value.push(
      ...files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        resource_type: file.type.startsWith('video/') ? 'video' : 'image',
        isAdult: false,
      }))
    );
  }

  function release(item) {
    if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
  }

  async function discard(item) {
    release(item);
    if (item.uploadSessionId) {
      // Failed cleanup is retried by the server's scheduled sweep.
      await api(item.uploadSessionId, { method: 'DELETE', keepalive: true }).catch(() => {});
    }
  }

  function remove(index) {
    if (uploading.value || saving) return;
    const [item] = media.value.splice(index, 1);
    if (item) void discard(item);
  }

  async function uploadAll() {
    uploading.value = true;
    progress.value = 0;
    try {
      const pending = media.value.filter((item) => item.file);
      for (const [index, item] of pending.entries()) {
        controller.signal.throwIfAborted();
        item.preparedFile ||= await prepareImage(item.file);
        item.uploadSessionId ||= crypto.randomUUID();
        const session = await api(item.uploadSessionId, {
          method: 'POST',
          signal: controller.signal,
          body: JSON.stringify({ resourceType: item.resource_type, bytes: item.preparedFile.size }),
        });
        const result =
          session.uploaded ||
          (await uploadMedia(item.preparedFile, session, {
            signal: controller.signal,
            onProgress: (percent) => {
              progress.value = Math.round(((index + percent / 100) / pending.length) * 100);
            },
          }));
        release(item);
        Object.assign(item, result);
        delete item.file;
        delete item.preparedFile;
      }
      return media.value.map(({ file: _file, preparedFile: _prepared, ...item }) => item);
    } finally {
      uploading.value = false;
    }
  }

  // Do not race an in-flight document save with cancellation. The server claims
  // uploads atomically with the document write; abandoned sessions expire later.
  function setSaving(value) {
    saving = value;
  }
  onBeforeUnmount(() => {
    controller.abort();
    for (const item of media.value) {
      release(item);
      if (!saving) void discard(item);
    }
  });
  return { media, uploading, progress, addFiles, remove, uploadAll, setSaving };
}
