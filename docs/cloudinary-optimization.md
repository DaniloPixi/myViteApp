# Cloudinary media workflow

## Delivery

- Memo cards, both edit forms, and the capsule reader use resized image URLs with automatic format and quality selection.
- Remote video previews use still-frame posters for MP4, MOV, WebM, and other video extensions. Local, unuploaded videos use blob URLs with metadata-only preloading.
- Gallery and preview images use lazy loading, asynchronous decoding, and width-based `srcset`. `sizes="auto, ..."` uses the rendered size on supporting browsers and a fallback elsewhere.
- Fullscreen renders only the active media element. Photos use `c_limit` to preserve the complete picture. Videos use `f_auto:video`, automatic quality, a width limit, and a poster.
- Canonical upload URLs remain in Firestore. Transformations are generated only for display, which keeps deletion and URL reuse predictable.
- Cloudinary/browser HTTP caching remains in use; no additional service-worker media cache was added.

## Uploads

Both forms use the same pipeline. Files stay local until Save, and object URLs are released on removal or unmount.

| Setting                                    | Value                       |
| ------------------------------------------ | --------------------------- |
| Attachments per memo/capsule               | 10                          |
| Selected image size limit                  | 25 MiB                      |
| Selected video size limit                  | 250 MiB                     |
| JPEG/static PNG maximum processed edge     | 2560 pixels                 |
| Encoding quality                           | 0.85                        |
| Chunk size for files larger than one chunk | 6 MiB                       |
| Automatic retries per chunk                | 2 after the initial attempt |

PNG processing preserves alpha using WebP where supported. GIF, animated PNG, WebP, and other formats pass through without flattening animation. A processed file replaces the original only if smaller; unsupported decoding falls back to the original. Cloudinary account limits may be stricter than these application limits. Video bytes are not transcoded in the browser.

The authenticated `/api/media/uploads/:id` endpoint reserves a server-generated public ID and returns signed parameters. It never returns the API secret. Stable public IDs and `overwrite=false` prevent duplicate assets. A manual retry checks whether a previous upload completed before sending the file again. Each chunk transfer uses a fresh transfer ID; chunk retries retain that ID.

Required server configuration: `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `CLOUDINARY_CLOUD_NAME` (the existing cloud name is the fallback). Local `cloudinaryCreds.json` remains supported. No unsigned upload preset is needed by this client. Existing dashboard preset settings were not changed.

## Save and cleanup

- Successful upload results are retained in the form after a failed save or partial batch; already uploaded files are not resent.
- Create requests carry a stable request ID so a lost response does not create a second document.
- Saving a document and claiming its `mediaUploads` reservations happen in one Firestore transaction. Cleanup cannot claim those assets concurrently.
- Cancelling/removing a newly uploaded attachment requests cleanup. Leaving during an in-flight document save avoids a competing cleanup request.
- `cleanup-media.mts` runs hourly on published Netlify deployments. It sweeps up to 20 reservations older than 24 hours and retries up to 10 deletion jobs per run. Larger backlogs drain over subsequent runs.
- Cancelled reservations remain until expiration so the scheduled sweep can catch uploads that finished after cancellation. Successfully claimed reservations are removed immediately.
- Editing/deleting a saved document queues removed media atomically with the database change. Immediate cleanup is attempted; failures remain in `mediaDeletionJobs` for retry. Images and videos are deleted in their respective resource namespaces, with CDN invalidation.
- Both internal collections are accessed through Firebase Admin; the current Firestore rules do not grant client access to them. No new composite index is required.

This manages new upload sessions and future removals. It does not identify or bulk-delete assets orphaned before this change.

## Verification

Run `npm run test:media` for the mocked upload, transaction, cleanup, and rendered-viewer regression checks. Run `npm run build` for frontend/PWA compilation.

On a configured deployment, verify one image and video upload, save retry, removal, and cancellation. Confirm transformed responses in browser Network tools and confirm the scheduled cleanup function is registered. Automated checks do not measure live Cloudinary bandwidth, account limits, or production cache headers.

References: [Cloudinary upload signatures](https://cloudinary.com/documentation/authentication_signatures), [chunked uploads](https://cloudinary.com/documentation/upload_images#chunked_asset_upload), [image optimization](https://cloudinary.com/documentation/image_optimization).
