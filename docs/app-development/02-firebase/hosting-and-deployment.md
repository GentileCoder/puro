# Firebase Hosting and deployment

## Config files

`firebase.json` at the repo root:

```json
{
  "hosting": {
    "site": "your-site-name",
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

The `rewrites` entry is what makes Vue Router's normal `createWebHistory()` mode work — every
unmatched path falls back to `index.html`, and the SPA's own router takes over from there. This is
the thing GitHub Pages can't do natively (see `../01-frontend-vue/stack-and-structure.md`'s router
table).

`.firebaserc`:

```json
{ "projects": { "default": "your-gcp-project-id" } }
```

## No `base` path needed in `vite.config.js`

Unlike a GitHub Pages *project* page (which needs `base: '/repo-name/'` because it's served under a
subpath), Firebase Hosting serves from the domain root — `https://your-site.web.app/` or a custom
domain, never a subpath. Leave `base` unset (Vite's default, `/`).

## Deploying

```bash
npm run build
npx firebase-tools deploy --only hosting
```

First time, authenticate: `npx firebase-tools login`. **This may not auto-open a browser in every
CLI environment** (observed: it fell back to a manual-code-paste flow when run from an automated
shell) — if that happens, run it from a genuinely interactive terminal instead, where it can launch
a real browser and use the local-callback flow.

### Switching `firebase-tools` to a different Google account on the same machine

`firebase-tools` keeps its own login, separate from `gcloud`'s (`gcloud auth login <email>` does
**not** also switch `firebase-tools`). To change which account it uses:

```bash
npx firebase-tools logout
npx firebase-tools login
```

In a context where it can't launch a real browser (see above), `login` prints a URL + a short session
ID instead of hanging. Open that URL on **any** device, signed into the Google account you want
`firebase-tools` to use, approve it, and it shows a session ID to confirm (make sure it matches what
the CLI printed) and then an authorization code. Paste that code back in as the argument to a second
command the CLI tells you to run — `firebase login <authorizationCode>` — to finish. There's no
browser-launch retry needed on the CLI side once you have that code; one `logout` + `login` round trip
is enough, even across machines, as long as the final code gets back to the CLI session that initiated
it.

## Getting a custom `*.web.app` name instead of the project-ID-based default

A project's default Hosting site is named after the project ID
(`your-project-id.web.app`), which might not be the name you want for a specific app sharing a GCP
project with other things. Firebase supports multiple named "sites" within one project:

```bash
npx firebase-tools hosting:sites:create your-app-name --project your-project-id
```

The name **must be globally unique across every Firebase project on Earth**, not just yours — be
ready to try a second choice:

```
Error: ... HTTP Error: 400, Invalid name: `your-app-name` is reserved by another project;
try something like `your-app-name-a1b2c` instead
```

The CLI's own suggested fallback (a short random suffix) is a perfectly fine second choice if nothing
better comes to mind — it keeps the name you wanted, just disambiguated.

Then point `firebase.json` at it:

```json
{ "hosting": { "site": "your-app-name", "public": "dist", "rewrites": [...] } }
```

and redeploy. **Additional named sites are automatically covered by the project's Firebase Auth
authorized domains** — no manual "authorized domains" edit was needed after creating a second site
and logging in from it; verified by testing a real login attempt against the new domain rather than
assuming.

### 403 "The caller does not have permission" creating a site, right after being granted access

If the account running `hosting:sites:create` was *just* added to the project (freshly granted
`roles/owner`, or any role), it can fail with a bare 403 even though the grant is actually correct:

```
Error: Request to https://firebasehosting.googleapis.com/v1beta1/projects/your-project/sites?siteId=... had HTTP Error: 403, The caller does not have permission
```

This is **not** a missing-permission problem — confirm that directly before assuming it is:

```bash
gcloud projects get-iam-policy your-project \
  --flatten="bindings[].members" --filter="bindings.members:you@example.com" \
  --format="table(bindings.role)"
# shows roles/owner — the grant is real
```

It's **Firebase Hosting's own authorization cache lagging behind core Cloud IAM** for a newly-added
principal — core IAM (what `get-iam-policy` reads) updates immediately, but Hosting's service-level
check can take longer to catch up, with no fixed SLA observed. One way to confirm this specific cause
rather than guess: run the same `hosting-tools` command with `--debug` and compare the two requests it
actually makes —

```
>>> POST .../projects/<numeric-project-number>/sites siteId=...&validateOnly=true   → 200 (dry run succeeds)
>>> POST .../projects/your-project/sites siteId=...                                  → 403 (real request fails)
```

The dry-run validation addresses the project by its **numeric project number** and succeeds; the real
creation call addresses it by the **project ID string** and fails — both really mean the same project,
so this is specifically about which address format the (still-catching-up) permission check resolves
correctly for this principal, not about the site name or the request body.

**Fix:** there's nothing to configure — it resolves itself, typically within a few minutes but
sometimes longer. If you need the site created *right now* and another account with longer-standing
access to the same project is available, create it with that account instead (the resulting site
belongs to the project, not to whichever account created it) and continue with the original account
for everything else.

## Custom domain (a domain you actually own)

A separate, later step, independent of which registrar you bought the domain from: Console →
Hosting → "Add custom domain" → follow the DNS verification steps it gives you. Two things regardless
of host:

- A DNS record at your registrar pointing at the host.
- Adding that domain to Firebase Auth's **Authorized domains** list (Authentication → Settings) —
  *this* one is not automatic the way a second `*.web.app` site is.

## CI auto-deploy on push

Don't hand-roll the GitHub Actions workflow and service-account secret for this — Firebase's own
CLI scaffolds it:

```bash
npx firebase-tools init hosting:github
```

This needs your interactive GitHub + Google login to create the service account and wire up the
repo secret; it can't be done non-interactively from an automated session. Until you've run it,
deploying is a manual `npm run build && npx firebase-tools deploy --only hosting` — which is a
perfectly fine way to operate for a personal app that deploys a few times a week, not something to
feel obligated to automate immediately.

## Cost

For a personal app at this traffic scale, this is effectively free: Firebase Hosting's free tier is
10GB storage / 360MB per day of transfer, several orders of magnitude more than a small SPA bundle
needs. Being on the Blaze (pay-as-you-go) plan doesn't change this — it only means charges are
*possible* if you exceed the free tier, not that hosting a small personal app costs anything by
default.
