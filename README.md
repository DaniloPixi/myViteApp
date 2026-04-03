# WE App (Vue + Vite + Firebase + Netlify Functions)

A relationship-focused planning app built with Vue 3 that combines:
- **Moments (memos)**
- **Plans**
- **Time capsules**
- **Daily quests + calendar view**
- **PWA push notifications**

The frontend is a Vite/Vue app, while API routes are served via Netlify Functions (`/.netlify/functions/api/*`) and backed by Firebase.

## Tech stack

- **Frontend:** Vue 3, Vite, V-Calendar, PWA service worker
- **Backend/API:** Netlify Functions + Express
- **Data/Auth/Push:** Firebase (Auth, Firestore, FCM)
- **Media:** Cloudinary (photo storage/deletion support)

## Project structure

```txt
src/
  components/        # shared UI pieces
  views/             # route-like main screens (Login, Plans, Capsules, etc.)
  composables/       # reusable logic hooks
  firebase.js        # client Firebase initialization
  firebaseConfig.js  # client Firebase config values

netlify/functions/
  api.mjs            # express app entrypoint
  routes/
    memos.mjs
    plans.mjs
    quests.mjs
    timeCapsules.mjs
```

## Prerequisites

- Node.js 18+
- npm
- Firebase project (Auth + Firestore + Cloud Messaging)
- (Optional) Cloudinary account for media cleanup support

## Install

```bash
npm install
```

## Run locally

### 1) Frontend only

```bash
npm run dev
```

### 2) Frontend + Netlify Functions (recommended)

If you want `/api/*` routes working locally, run with Netlify Dev:

```bash
npx netlify dev
```

This respects your `netlify.toml` redirects so `/api/*` maps to `netlify/functions/api.mjs`.

## Configuration

### Frontend Firebase config

Frontend Firebase config is defined in `src/firebaseConfig.js`.

### Function-side Firebase Admin credentials

`netlify/functions/api.mjs` supports two modes:

1. **Production mode (environment variables):**
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_CLIENT_ID`
   - `FIREBASE_CLIENT_X509_CERT_URL`

2. **Local mode (file fallback):**
   - `netlify/functions/serviceAccountKey.json`

### Function-side Cloudinary credentials

Also in dual mode:

1. **Production mode (environment variables):**
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

2. **Local mode (file fallback):**
   - `netlify/functions/cloudinaryCreds.json`

## Build

```bash
npm run build
npm run preview
```

## PWA icons

```bash
npm run generate:pwa-icons
```

## Next practical improvements

1. Add linting + formatting scripts (`eslint`, `prettier`) and a pre-deploy check.
2. Add smoke tests for API routes and one frontend happy-path flow.
3. Add a simple backup/export routine for Firestore data.


## Environment isolation (recommended)

For safe feature development, maintain two channels:

- **production**: real users + real notifications
- **staging**: test users only, no production side-effects

### Frontend env files

Create `.env.production` and `.env.staging` from `.env.example`.

Key variables:

- `VITE_APP_ENV` (`production` or `staging`)
- `VITE_TEST_MODE` (`true` disables client notification registration/actions)
- `VITE_FIREBASE_*` (use separate Firebase projects per environment)
- `VITE_CLOUDINARY_*` (use separate upload presets/folders per environment)

### Function env variables (Netlify)

Set these per-site/per-context:

- `APP_ENV=production|staging`
- `TEST_MODE=true|false`
- `ALLOW_PUSH_IN_NON_PROD=true|false`

Push logic behavior:

- Push payloads and tokens are tagged with `appEnv`.
- Sender exclusion is applied in production.
- Non-production push is blocked unless `ALLOW_PUSH_IN_NON_PROD=true`.
- `TEST_MODE=true` hard-disables push sending.

### Safe testing checklist

1. Use a dedicated staging Firebase project and staging users.
2. Keep `VITE_TEST_MODE=true` while validating CRUD + upload flows.
3. Enable `ALLOW_PUSH_IN_NON_PROD=true` only when you explicitly test push.
4. Verify staging app writes only staging Firestore/RTDB data.
5. Deploy production only from production env vars.
