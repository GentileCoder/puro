import json
import os
import functions_framework
import firebase_admin
from firebase_admin import auth as firebase_auth
from google.cloud import storage

BUCKET_NAME = "puro-data"
FILE_NAME = "puro.json"

# Break-glass account that administers the gentilecoder GCP project itself
# (Console/gcloud/firebase-tools) — never deletable through this API, even by
# another admin, since losing it means losing infrastructure access, not just
# app access. The UI already hides the delete button for it; this is the
# actual enforcement, since the UI guard alone doesn't stop a direct API call.
PROTECTED_ADMIN_EMAIL = "gentile.leon0511@gmail.com"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
}
JSON_HEADERS = {**CORS, "Content-Type": "application/json"}

# No key file, no extra credential setup — Cloud Run provides Application
# Default Credentials via the service account attached to the service.
if not firebase_admin._apps:
    firebase_admin.initialize_app()


def verify_token(request):
    header = request.headers.get("Authorization", "")
    token = header.replace("Bearer ", "").strip()
    if not token:
        return None, None
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded, decoded.get("role", "")
    except Exception:
        return None, None


@functions_framework.http
def organizer(request):
    if request.method == "OPTIONS":
        return ("", 204, CORS)

    decoded, role = verify_token(request)
    if not decoded:
        return (json.dumps({"error": "Unauthorized"}), 401, JSON_HEADERS)

    path = request.path.rstrip("/")

    # --- User management endpoints (admin only) ---
    if path == "/users":
        if role != "admin":
            return (json.dumps({"error": "Forbidden"}), 403, JSON_HEADERS)

        if request.method == "GET":
            page = firebase_auth.list_users()
            users = [
                {"uid": u.uid, "email": u.email, "role": (u.custom_claims or {}).get("role", "")}
                for u in page.users
            ]
            return (json.dumps(users), 200, JSON_HEADERS)

        if request.method == "POST":
            body = request.get_json()
            user = firebase_auth.create_user(email=body["email"], password=body["password"])
            firebase_auth.set_custom_user_claims(user.uid, {"role": body.get("role", "staff")})
            return (json.dumps({"uid": user.uid}), 200, JSON_HEADERS)

        if request.method == "PUT":
            body = request.get_json()
            firebase_auth.set_custom_user_claims(body["uid"], {"role": body["role"]})
            return (json.dumps({"ok": True}), 200, JSON_HEADERS)

        if request.method == "DELETE":
            body = request.get_json()
            target = firebase_auth.get_user(body["uid"])
            if target.email == PROTECTED_ADMIN_EMAIL:
                return (json.dumps({"error": "This account can't be deleted"}), 403, JSON_HEADERS)
            firebase_auth.delete_user(body["uid"])
            return (json.dumps({"ok": True}), 200, JSON_HEADERS)

        return (json.dumps({"error": "Method not allowed"}), 405, JSON_HEADERS)

    # --- Data endpoint: whole-blob GET/POST, any authenticated role ---
    client = storage.Client()
    bucket = client.bucket(BUCKET_NAME)
    blob = bucket.blob(FILE_NAME)

    if request.method == "GET":
        if not blob.exists():
            return ("{}", 200, JSON_HEADERS)
        return (blob.download_as_text(), 200, JSON_HEADERS)

    if request.method == "POST":
        data = request.get_data(as_text=True)
        blob.upload_from_string(data, content_type="application/json")
        return (json.dumps({"ok": True}), 200, JSON_HEADERS)

    return (json.dumps({"error": "Method not allowed"}), 405, JSON_HEADERS)
