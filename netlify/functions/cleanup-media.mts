import { db, cloudinary } from './_shared/services.mjs';
import { sweepUploads, flushMediaDeletions } from './_shared/media.mjs';

export default async () => {
  if (!db || !cloudinary.config().api_key)
    return new Response('Media cleanup is not configured', { status: 503 });
  const [uploads, deletions] = await Promise.all([
    sweepUploads(db, cloudinary),
    flushMediaDeletions(db, cloudinary),
  ]);
  console.log('Media cleanup', { uploads, deletions });
  return Response.json({ uploads, deletions });
};

export const config = { schedule: '@hourly' };
