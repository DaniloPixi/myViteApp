export function parseCloudinaryAsset(value, cloudName) {
  try {
    const url = new URL(typeof value === 'string' ? value : value.url);
    if (url.hostname !== 'res.cloudinary.com') return null;
    const match = url.pathname.match(/^\/([^/]+)\/(image|video)\/upload\/(.+)$/);
    if (!match || (cloudName && match[1] !== cloudName)) return null;
    // Versioned URLs unambiguously separate transformations from the public ID.
    const path = match[3].replace(/^(?:[^/]+\/)*?v\d+\//, '').replace(/\.[^/.]+$/, '');
    if (!path || path.includes(',') || path.split('/').some((part) => part.startsWith('c_')))
      return null;
    return { publicId: decodeURIComponent(path), resourceType: match[2] };
  } catch {
    return null;
  }
}

export async function deleteMedia(cloudinary, media) {
  if (!cloudinary.config().api_key) throw new Error('Cloudinary cleanup is not configured.');
  const groups = { image: new Set(), video: new Set() };
  for (const item of media) {
    const asset = parseCloudinaryAsset(item, cloudinary.config().cloud_name);
    if (asset) groups[asset.resourceType].add(asset.publicId);
  }
  for (const [resource_type, ids] of Object.entries(groups)) {
    const list = [...ids];
    for (let offset = 0; offset < list.length; offset += 100) {
      const batch = list.slice(offset, offset + 100);
      const result = await cloudinary.api.delete_resources(batch, {
        resource_type,
        invalidate: true,
      });
      if (
        result.error ||
        batch.some((id) => !['deleted', 'not_found'].includes(result.deleted?.[id]))
      ) {
        throw new Error('Cloudinary did not delete all requested media.');
      }
    }
  }
}

// Claim temporary uploads in the SAME transaction that persists their references.
// Cleanup cannot delete an asset while a successful save is claiming it.
export async function saveWithMedia(db, ref, data, uid, { merge = false, create = false } = {}) {
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (create && existing.exists) {
      const owner = existing.data().creatorUid || existing.data().fromUid;
      if (owner !== uid) throw new Error('Document belongs to another user.');
      return false; // Idempotent retry after a lost save response.
    }
    const photos = data.photos;
    if (photos && (!Array.isArray(photos) || photos.length > 10))
      throw new Error('At most 10 media files are allowed.');
    const sessionRefs = [
      ...new Set((photos || []).map((p) => p.uploadSessionId).filter(Boolean)),
    ].map((id) => {
      if (!/^[\da-f-]{36}$/i.test(id)) throw new Error('Invalid upload session.');
      return db.collection('mediaUploads').doc(id);
    });
    const sessions = await Promise.all(sessionRefs.map((sessionRef) => tx.get(sessionRef)));
    for (const session of sessions) {
      const attached = photos.filter((p) => p.uploadSessionId === session.id);
      if (!session.exists) {
        if (
          !attached.every((p) => (existing.data()?.photos || []).some((old) => old.url === p.url))
        ) {
          throw new Error('Upload expired. Remove the attachment and add it again.');
        }
        continue;
      }
      const upload = session.data();
      if (upload.uid !== uid || upload.state !== 'pending')
        throw new Error('Upload is no longer available.');
      for (const photo of attached) {
        const asset = parseCloudinaryAsset(photo, upload.cloudName);
        if (asset?.publicId !== upload.publicId || asset?.resourceType !== upload.resourceType)
          throw new Error('Upload does not match attachment.');
      }
    }
    const saved = { ...data };
    if (photos) saved.photos = photos.map(({ uploadSessionId: _session, ...photo }) => photo);
    if (merge) tx.set(ref, saved, { merge: true });
    else tx.set(ref, saved);
    if (photos && existing.exists) {
      const oldMedia =
        existing.data().photos || (existing.data().photoUrls || []).map((url) => ({ url }));
      const removed = oldMedia.filter((old) => !photos.some((photo) => photo.url === old.url));
      if (removed.length)
        tx.set(db.collection('mediaDeletionJobs').doc(), { media: removed, createdAt: Date.now() });
    }
    for (const session of sessions) if (session.exists) tx.delete(session.ref);
    return true;
  });
}

export async function deleteDocumentWithMedia(db, ref) {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const media = snap.data().photos || (snap.data().photoUrls || []).map((url) => ({ url }));
    if (media.length)
      tx.set(db.collection('mediaDeletionJobs').doc(), { media, createdAt: Date.now() });
    tx.delete(ref);
  });
}

export async function flushMediaDeletions(db, cloudinary) {
  const jobs = await db.collection('mediaDeletionJobs').limit(10).get();
  const results = await Promise.allSettled(
    jobs.docs.map(async (job) => {
      await deleteMedia(cloudinary, job.data().media);
      await job.ref.delete();
    })
  );
  return { checked: results.length, failed: results.filter((r) => r.status === 'rejected').length };
}

export async function discardUpload(db, cloudinary, ref, uid, expiredOnly = false) {
  const upload = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null; // Already claimed by a saved document.
    const data = snap.data();
    if (uid && data.uid !== uid) throw new Error('Upload belongs to another user.');
    if (expiredOnly && data.expiresAt > Date.now()) return null;
    tx.update(ref, { state: 'deleting' });
    return data;
  });
  if (!upload) return;
  // Resource type is not covered by Cloudinary's upload signature. Clean both
  // namespaces for this reserved ID so an interrupted/misrouted upload cannot leak.
  for (const resource_type of ['image', 'video']) {
    const result = await cloudinary.uploader.destroy(upload.publicId, {
      resource_type,
      invalidate: true,
    });
    if (!['ok', 'not found'].includes(result.result))
      throw new Error('Temporary media cleanup failed.');
  }
  // Keep cancelled reservations until signatures expire, then sweep once more.
  // This also handles an upload finishing just after the browser closed.
  if (expiredOnly) await ref.delete();
}

export async function sweepUploads(db, cloudinary) {
  const expired = await db
    .collection('mediaUploads')
    .where('expiresAt', '<=', Date.now())
    .limit(20)
    .get();
  const results = await Promise.allSettled(
    expired.docs.map((doc) => discardUpload(db, cloudinary, doc.ref, null, true))
  );
  return { checked: results.length, failed: results.filter((r) => r.status === 'rejected').length };
}
