# Giving a second Google account access to the project

Comes up when the account that originally set up a GCP/Firebase project (via `gcloud`/Console, maybe
years ago) isn't the account you want administering it going forward. There's no "transfer project"
button — what you actually do is **grant the new account full access, confirm it works, then** (if you
want) **remove the old account's access**. Both accounts can hold Owner simultaneously in the
meantime; nothing about the project itself changes.

## You can't do this with `gcloud` alone

```bash
gcloud projects add-iam-policy-binding your-project \
  --member="user:new-owner@example.com" --role="roles/owner"
```

```
ERROR: (gcloud.projects.add-iam-policy-binding) INVALID_ARGUMENT: Request contains an invalid argument.
  type: SOLO_MUST_INVITE_OWNERS
```

Granting **Owner** to a principal that doesn't already have *any* access to the project is a
Google-enforced exception to the normal "just set the IAM policy" flow — it requires the Console's own
invite-and-accept flow instead, specifically so a single API call can't silently hand over full control
of a project to an account that never agreed to it.

## Do it from the Console instead

1. As the **current** owner, go to
   `https://console.cloud.google.com/iam-admin/iam?project=your-project` → **"+ GRANT ACCESS"** → new
   principal: the other account's email → role: **Owner** → **Save**. This sends a real invitation,
   not an immediate grant.
2. Confirm it's actually pending (the Console UI can feel like nothing happened):
   ```bash
   gcloud projects get-iam-policy your-project \
     --flatten="bindings[].members" --filter="bindings.members:new-owner@example.com" \
     --format="table(bindings.role)"
   # roles/resourcemanager.projectOwnerInvitee ⇒ sent but not yet accepted
   ```
3. **The invited account has to accept it themselves** — there's no way around this from the inviter's
   side. Easiest path: that account checks its Gmail inbox for an invitation email and clicks Accept.
   (A direct link to `console.cloud.google.com/iam-admin/iam?project=your-project` from that account,
   before accepting, can fall back to a generic "select a project" screen rather than showing the
   project — that's expected, not a sign anything's wrong; use the email's Accept link instead.)
4. Re-check the same `get-iam-policy` command — the role flips from
   `roles/resourcemanager.projectOwnerInvitee` to plain `roles/owner` once accepted.

Any Google account works for step 3 with no separate signup — the first visit to Cloud Console just
asks that account to accept Google Cloud's general terms of service once, which doesn't require a
billing setup of its own. **Billing is a property of the project**, not of each account with access to
it — the new owner doesn't need their own billing account to manage or deploy to this one; it keeps
using whichever billing account is already linked, regardless of who's listed as Owner.

## Then point your CLI tools at the new account

`gcloud` and `firebase-tools` each need telling separately — switching one doesn't switch the other
(see `../03-backend/gcloud-cli-setup.md`'s "Authenticating" section for the `gcloud` side, and
`hosting-and-deployment.md`'s "Switching `firebase-tools` to a different Google account" for the
`firebase-tools` side). If `gcloud auth login <email>` reports reusing already-cached local
credentials instead of opening a browser, that's fine — it means this machine already authenticated
that account at some point before.

## Order matters

Grant → verify the new account actually works (can see the project, can deploy, whatever matters for
your case) → **only then** consider removing the old account's access. Removing the old account first,
before confirming the new one works, risks a project nobody currently signed in can manage.