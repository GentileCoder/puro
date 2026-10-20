# PURO

<img src="public/logo.svg" width="64" height="64" alt="PURO logo" />

A multi-tenant restaurant/bar management PWA — one deployment, many independent businesses. Vue 3 +
Vite + Pinia frontend, Google Cloud Identity Platform (= Firebase Auth) for login/roles/business
assignment, Firebase Hosting, and a Python Cloud Run worker (`puro-worker`) proxying per-business
JSON blobs in Google Cloud Storage (`puro-data` bucket).

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
| Auth | Google Cloud Identity Platform (Firebase Auth), JWT custom claims: `role` (`admin`/`staff`/`manager`) + `businessId` |
| Hosting | Firebase Hosting (`createWebHistory()`, clean URLs) |
| Backend | `puro-worker` — Python Cloud Run function (`backend/`), dedicated to this app |
| Storage | One JSON blob per business (`business-<id>.json`) + an index (`businesses.json`) in the `puro-data` GCS bucket |
| i18n | Hand-rolled `es`/`en`/`de` dictionary + `useI18n()` composable (`src/i18n/`) — no `vue-i18n` |
| Theming | 7 selectable themes (`src/theme/`), each with light+dark — admin-only, per business |

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
| Negocio | ✅ | ❌ | ✅ |
| Usuarios | ✅ | ❌ | ❌ |

Users are managed from the Usuarios tab (admin only), which calls the worker's `/users` endpoints
(backed by the Identity Platform Admin SDK — see `docs/Authentication_Implementation_Guide.md` for
the backend side, already deployed).

## Multi-tenant: businesses

Every tab except Usuarios operates on **whichever business is currently active** — its own sections,
reservations, menu, staffing, theme, everything. `admin` is the only role not scoped to one business:
a "+ Business" control and a business picker appear in the header for admin only, backed by
`GET`/`POST /businesses` on the worker. `staff`/`manager` accounts are each assigned to exactly one
business from the Usuarios tab (a `businessId` select next to the role select); an account with no
business assigned yet sees a blocked "no restaurant assigned" screen instead of the app. The backend
enforces this server-side on every data request — a non-admin's token only unlocks their own
`businessId`'s blob, regardless of what the client asks for.

There's no auto-migration from the single-tenant data that existed before this — each business
(including re-adding the restaurant that was already live) is created fresh from the UI.

### Plan: draft, lock, publish

The Plan tab's staffing grid is generated from the Negocio tab's config (opening days, staff per
day, planning frequency), not hardcoded. Admin/manager edit a **draft**; staff always see the last
**published** version, never the draft. Editing is only possible while the plan is unlocked;
clicking **Lock & publish** copies the draft to what staff see and freezes it until explicitly
unlocked again. The grid itself adapts to the configured frequency — one week at a time (weekly),
two weeks (biweekly), or a full calendar month (monthly/quarterly — identical layout, the only
difference is the expected replan cadence).

## Theme

The "⚙ Theme" header button (admin role only) opens a picker for 7 themes × light/dark, ported
from `docs/app-development/06-design-system/themes/` (Deepwork, Paper, Pulse, Sunset, Real Madrid,
Cuba, Brazil). The choice is saved to the active business's own blob, so it applies for everyone on
that business on every device — not a per-device preference, and independent of any other business's
theme choice. `src/theme/themes.js` holds the token tables; `applyTheme.js` sets them as CSS custom
properties (`--t-*`) on `:root`, which `styles/tokens.css` derives every component-facing token from,
so no component styling needed to change per theme.

## App structure

```
src/
  main.js, App.vue        bootstrap + chrome
  firebase.js              Identity Platform config
  router/index.js          routes + role guard
  stores/auth.js            session, role, businessId, token refresh
  stores/business.js         which business is active; admin's list/switch/create
  stores/puro.js             the active business's domain store — matches the backend's
                              per-business-blob save unit; load(id) resets state, then applies
  services/                  httpClient + puroApi (per-business blob GET/POST) + businessApi + usersApi
  utils/                      pure helpers (time, tables, reservations, plan)
  i18n/                       es/en/de dictionary + composable
  views/, components/         one view per tab, thin; shared UI in components/
    views/BusinessView.vue      opening days/hours/staffing/frequency config (admin+manager) —
                                 NOT to be confused with stores/business.js (which business/tenant
                                 is active); this is one tenant's own operating config
    components/plan/            PlanWeekRow.vue — the reusable week-row the Plan tab composes
                                 per frequency (1 row weekly, 2 biweekly, N for a month)
    components/layout/          CreateBusinessModal.vue, BlockedNoBusiness.vue
  styles/                     tokens.css (palette) + base.css + utilities.css
```

## Known limitations (carried over from the legacy app)

- History (Historial) is in-memory only — cleared on page refresh, not persisted.
- No offline support — requires connectivity for the worker and Identity Platform.
- The entire data blob is re-saved on every change (no partial updates), debounced ~800ms client-side.
