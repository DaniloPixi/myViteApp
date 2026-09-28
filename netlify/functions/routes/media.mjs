import express from 'express';
import { randomUUID } from 'node:crypto';
import { discardUpload } from '../_shared/media.mjs';

export default function createMediaRouter(db, cloudinary) {
  const router = express.Router();
  router.post('/uploads/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { resourceType, bytes } = req.body;
      if (
        !/^[\da-f-]{36}$/i.test(id) ||
        !['image', 'video'].includes(resourceType) ||
        !Number.isFinite(bytes) ||
        bytes <= 0 ||
        bytes > (resourceType === 'image' ? 25 : 250) * 1024 * 1024
      ) {
        return res.status(400).json({ message: 'Invalid media file or upload size.' });
      }
      const config = cloudinary.config();
      if (!config.api_key || !config.api_secret)
        return res
          .status(503)
          .json({ message: 'Media uploads need server-side Cloudinary credentials.' });
      const ref = db.collection('mediaUploads').doc(id);
      const upload = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists) {
          const data = snap.data();
          if (
            data.uid !== req.user.uid ||
            data.resourceType !== resourceType ||
            data.state !== 'pending'
          )
            throw new Error('Upload session is unavailable.');
          tx.update(ref, { expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
          return { ...data, retry: true };
        }
        const data = {
          uid: req.user.uid,
          publicId: `grus_uploads/${randomUUID()}`,
          resourceType,
          cloudName: config.cloud_name,
          state: 'pending',
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        };
        tx.set(ref, data);
        return data;
      });
      if (upload.retry) {
        try {
          // Recover an upload whose final response was lost, without retransmitting it.
          const asset = await cloudinary.api.resource(upload.publicId, {
            resource_type: resourceType,
          });
          return res.json({
            id,
            uploaded: {
              url: asset.secure_url,
              public_id: asset.public_id,
              resource_type: asset.resource_type,
              width: asset.width || null,
              height: asset.height || null,
              bytes: asset.bytes,
              uploadSessionId: id,
            },
          });
        } catch (error) {
          if ((error.http_code || error.error?.http_code) !== 404) throw error;
        }
      }
      const fields = {
        public_id: upload.publicId,
        timestamp: Math.floor(Date.now() / 1000),
        overwrite: false,
      };
      const signature = cloudinary.utils.api_sign_request(fields, config.api_secret);
      return res.json({
        id,
        endpoint: `https://api.cloudinary.com/v1_1/${config.cloud_name}/${resourceType}/upload`,
        fields: { ...fields, signature, api_key: config.api_key },
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });
  router.delete('/uploads/:id', async (req, res) => {
    try {
      if (!/^[\da-f-]{36}$/i.test(req.params.id))
        return res.status(400).json({ message: 'Invalid upload session.' });
      await discardUpload(
        db,
        cloudinary,
        db.collection('mediaUploads').doc(req.params.id),
        req.user.uid
      );
      return res.sendStatus(204);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  });
  return router;
}
