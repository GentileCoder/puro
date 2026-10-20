# A minimal Python Cloud Run backend

## When you actually need this layer

Per `docs/frontend_building/FRONTEND_BUILD_PLAYBOOK.md` §9: only when the frontend would otherwise
need a secret client-side, or needs to sit behind one CORS/auth boundary in front of storage it
doesn't talk to directly (e.g. a GCS bucket, which has no browser-safe way to expose per-user
access control on its own). If a new app can talk to Firestore/Firebase Storage directly with
Firebase's own security rules doing the access control, skip this layer entirely — it's one more
service to run, deploy, and keep in sync for no benefit.

## The shape

A single `functions_framework`-decorated HTTP handler, deployed to Cloud Run, doing three things:
CORS, auth, and a thin proxy to storage.

```python
import json, os
import functions_framework
import firebase_admin
from firebase_admin import auth as firebase_auth
from google.cloud import storage

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

# No args needed — Cloud Run provides Application Default Credentials via the
# service account attached to the service. No key file, no extra IAM role.
firebase_admin.initialize_app()

def get_user_file(request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if not token:
        return None
    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception:
        return None
    allowed_users = json.loads(os.environ.get("ALLOWED_USERS", "{}"))
    return allowed_users.get(decoded["uid"])   # the actual access-control gate

@functions_framework.http
def handler(request):
    if request.method == "OPTIONS":
        return ("", 204, CORS)
    file_name = get_user_file(request)
    if not file_name:
        return (json.dumps({"error": "Unauthorized"}), 401, {**CORS, "Content-Type": "application/json"})
    # ...GET reads a GCS blob, POST overwrites it. See authentication.md for why a
    # valid Firebase login alone isn't the whole access-control story.
```

`requirements.txt` needs `firebase-admin` in addition to whatever storage client you're using
(`google-cloud-storage`, `google-cloud-firestore`, …).

## Why "GET the whole blob, POST the whole blob" is fine for a small app

A single JSON document read/written whole, with no partial-update endpoint, is a legitimate and
simple choice for an app with a small state size and a small number of users — it avoids ever having
to reconcile partial updates or handle merge conflicts. It stops being fine once either the document
gets large enough that re-saving it on every keystroke is slow, or more than one person edits
concurrently often enough that last-write-wins data loss becomes a real problem. Don't build
partial-update/merge logic preemptively; add it if and when that actually happens.

## The debounce belongs on the frontend, not the backend

Since there's no partial-update endpoint, the frontend should debounce writes (~400ms, see
`../01-frontend-vue/stack-and-structure.md`) so rapid interaction doesn't turn into a save-per-click
flood. The backend itself stays simple — it doesn't need to know or care how often it's called.

## Setting up a new app's bucket + worker from scratch

**One bucket, one Cloud Run service, per app — don't share a worker across apps.** Each app gets its
own blob and its own backend, same pattern as this doc's handler, even though every app's handler
looks nearly identical. This keeps blast radius small: redeploying or misconfiguring one app's worker
can't touch another app's data, and deleting an app later is "delete its bucket and its service," not
"carefully extract its code from a shared one."

```bash
gsutil mb -l your-region gs://your-app-data
```

No special setup beyond that — the bucket starts empty, and the backend's first successful `POST`
creates the actual JSON blob inside it. Don't pre-seed it.

Then deploy the worker itself (same command shape as `../03-backend/gcloud-cli-setup.md`'s "A Cloud
Run service with this name already exists" fix, used here for a first deploy rather than a fix):

```bash
gcloud run deploy your-app-worker \
  --region=your-region \
  --source=./backend \
  --function=your_entry_point \
  --allow-unauthenticated \
  --service-account=existing-worker@your-project.iam.gserviceaccount.com
```

**Reuse an existing app's service account rather than minting a dedicated one per app**, unless you
specifically need tighter IAM isolation between apps — one shared service account already has the
Storage + Firebase Admin roles a worker needs, and adding another app's worker under it is one line,
versus a new service account needing those roles granted again from scratch. The bucket-per-app and
service-per-app separation is what actually isolates apps from each other day to day (different
resources, different URLs, independently deployable/deletable); the service account being shared is a
convenience, not a security boundary you're relying on here.

`--allow-unauthenticated` makes the Cloud Run service itself publicly reachable at the network level —
that's intentional and matches the auth model in this doc: the handler's own `verify_token`/allowlist
check is what actually gates access, not Cloud Run's ingress setting. If an agent or tool flags this
flag as "weakening auth" before running it, that's a reasonable thing to pause on in isolation, but
it's the correct, intended setting for this pattern — Cloud Run's *other* option
(`--no-allow-unauthenticated`) would require every caller to carry a *Google Cloud* identity token on
top of the app's own Firebase one, which isn't how this frontend talks to the worker.
