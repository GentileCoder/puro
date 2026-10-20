# PURO

A restaurant management PWA for El Toro. Vue 3 + Vite + Pinia frontend, Google Cloud Identity
Platform (= Firebase Auth) for login and roles, Firebase Hosting, and a Python Cloud Run worker
(`el-toro-worker`) proxying a single JSON blob in Google Cloud Storage.

This app was migrated from a hand-built single-`index.html` vanilla-JS app (still available under
[`legacy/`](legacy/) for reference) onto the stack documented in
[`docs/app-development/`](docs/app-development/). See
[`docs/app-development/04-migrations/static-html-github-pages-to-vue-firebase.md`](docs/app-development/04-migrations/static-html-github-pages-to-vue-firebase.md)
for the migration playbook this followed.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Vue 3 (Composition API, `<script setup>`) + Vite + Pinia + Vue Router |
| Auth | Google Cloud Identity Platform (Firebase Auth), roles via JWT custom claims: `admin` / `staff` / `manager` |
| Hosting | Firebase Hosting (`createWebHistory()`, clean URLs) |
| Backend | `el-toro-worker` — Python Cloud Run function, unchanged by this migration |
| Storage | Single JSON blob (`eltoro.json`) in a GCS bucket, proxied by the worker |
| i18n | Hand-rolled `es`/`en`/`de` dictionary + `useI18n()` composable (`src/i18n/`) — no `vue-i18n` |

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # writes dist/
```

`.env` (git-ignored) needs:
```
VITE_FIREBASE_API_KEY=...   # non-secret, see docs/app-development/02-firebase/project-setup.md
VITE_WORKER_URL=https://el-toro-worker-....run.app
```
See `.env.example` for the required keys.

## Deploy

```bash
npm run build
npx firebase-tools deploy --only hosting
```

The Hosting site `placeurorder` (configured in `firebase.json`) is already created — `https://placeurorder.web.app`.

## Roles

| Tab | admin | staff | manager |
|---|---|---|---|
| Reservas | ✅ | ✅ | ✅ |
| Mesas | ✅ | ✅ | ✅ |
| Artículos | ✅ | ❌ | ✅ |
| Historial | ✅ | ❌ | ✅ |
| Plan | ✅ (edit) | view-only | ✅ (edit) |
| Usuarios | ✅ | ❌ | ❌ |

Users are managed from the Usuarios tab (admin only), which calls the worker's `/users` endpoints
(backed by the Identity Platform Admin SDK — see `docs/Authentication_Implementation_Guide.md` for
the backend side, already deployed).

## App structure

```
src/
  main.js, App.vue        bootstrap + chrome
  firebase.js              Identity Platform config
  router/index.js          routes + role guard
  stores/auth.js            session, role, token refresh
  stores/puro.js             the one domain store — matches the backend's single-blob save unit
  services/                  httpClient + puroApi (blob GET/POST) + usersApi
  utils/                      pure helpers (time, tables, reservations, plan)
  i18n/                       es/en/de dictionary + composable
  views/, components/         one view per tab, thin; shared UI in components/
  styles/                     tokens.css (palette) + base.css + utilities.css
```

## Known limitations (carried over from the legacy app)

- History (Historial) is in-memory only — cleared on page refresh, not persisted.
- No offline support — requires connectivity for the worker and Identity Platform.
- The entire data blob is re-saved on every change (no partial updates), debounced ~800ms client-side.
- **Plan (weekly schedule) note:** saving the Plan tab replaces the *entire* stored schedule with
  only the currently-viewed week's entries — a pre-existing behavior from the legacy app, not
  introduced by this migration. Worth a deliberate product decision before it causes real data loss.
