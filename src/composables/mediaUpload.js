import { readApiResponse } from './readApiResponse.js';

export const MAX_MEDIA_FILES = 10;
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
export const UPLOAD_CHUNK_BYTES = 6 * 1024 * 1024;

export function validateMediaFiles(files, existingCount = 0) {
  if (files.length + existingCount > MAX_MEDIA_FILES)
    throw new Error('You can attach up to 10 files.');
  for (const file of files) {
    if (!/^(image|video)\//.test(file.type))
      throw new Error(`${file.name}: choose an image or video.`);
    const limit = file.type.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (!file.size || file.size > limit) {
      throw new Error(`${file.name}: maximum size is ${limit / 1024 / 1024} MB.`);
    }
  }
}

export async function prepareImage(file) {
  // Preserve animations and formats the browser cannot safely decode/re-encode.
  if (!['image/jpeg', 'image/png'].includes(file.type) || typeof createImageBitmap !== 'function')
    return file;
  if (file.type === 'image/png') {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(bytes.buffer);
    for (let offset = 8; offset + 12 <= bytes.length; ) {
      const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
      if (type === 'acTL') return file;
      if (type === 'IDAT') break;
      offset += view.getUint32(offset) + 12;
    }
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const type = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
    if (!blob || blob.size >= file.size) return file;
    const extension =
      blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + extension, {
      type: blob.type,
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

export async function uploadMedia(
  file,
  session,
  { signal, onProgress = () => {}, fetchImpl = fetch, transferId = crypto.randomUUID() } = {}
) {
  const isChunked = file.size > UPLOAD_CHUNK_BYTES;
  const chunkSize = isChunked ? UPLOAD_CHUNK_BYTES : file.size;
  let result;
  for (let start = 0; start < file.size; start += chunkSize) {
    const end = Math.min(start + chunkSize, file.size);
    const body = new FormData();
    for (const [key, value] of Object.entries(session.fields)) body.append(key, String(value));
    body.append('file', file.slice(start, end, file.type), file.name);
    const headers = isChunked
      ? {
          'X-Unique-Upload-Id': transferId,
          'Content-Range': `bytes ${start}-${end - 1}/${file.size}`,
        }
      : {};
    // Same public ID and chunk ID on retry: never create a second asset.
    for (let attempt = 0; ; attempt++) {
      signal?.throwIfAborted();
      try {
        const response = await fetchImpl(session.endpoint, {
          method: 'POST',
          body,
          headers,
          signal,
        });
        const data = await readApiResponse(response, { operation: 'Cloudinary upload' });
        result = data;
        break;
      } catch (error) {
        if (
          signal?.aborted ||
          error.name === 'AbortError' ||
          error.retryable === false ||
          attempt >= 2
        )
          throw error;
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      }
    }
    onProgress(Math.round((end / file.size) * 100));
  }
  if (!result?.secure_url || !result?.public_id || result.done === false) {
    throw new Error('Upload did not finish. Please retry.');
  }
  return {
    url: result.secure_url,
    public_id: result.public_id,
    resource_type: result.resource_type,
    width: result.width || null,
    height: result.height || null,
    bytes: result.bytes || file.size,
    uploadSessionId: session.id,
  };
}
