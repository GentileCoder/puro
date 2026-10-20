import json
import os
import uuid
import functions_framework
import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import exceptions as firebase_exceptions
from google.cloud import storage

BUCKET_NAME = "puro-data"
BUSINESS_INDEX_FILE = "businesses.json"


def business_file(business_id):
    return f"business-{business_id}.json"


# Break-glass account that administers the gentilecoder GCP project itself
# (Console/gcloud/firebase-tools) — never deletable or demotable through this
# API, even by another admin, since losing it means losing infrastructure
# access, not just app access. The UI already hides the delete button and
# role selector for it; this is the actual enforcement, since the UI guard
# alone doesn't stop a direct API call.
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
    client = storage.Client()
    bucket = client.bucket(BUCKET_NAME)

    # --- User management endpoints (admin only) ---
    if path == "/users":
        if role != "admin":
            return (json.dumps({"error": "Forbidden"}), 403, JSON_HEADERS)

        if request.method == "GET":
            page = firebase_auth.list_users()
            users = [
                {
                    "uid": u.uid,
                    "email": u.email,
                    "role": (u.custom_claims or {}).get("role", ""),
                    "businessId": (u.custom_claims or {}).get("businessId", ""),
                }
                for u in page.users
            ]
            return (json.dumps(users), 200, JSON_HEADERS)

        if request.method == "POST":
            body = request.get_json()
            try:
                user = firebase_auth.create_user(email=body["email"], password=body["password"])
            except firebase_auth.EmailAlreadyExistsError:
                return (json.dumps({"error": "That email is already in use"}), 400, JSON_HEADERS)
            except (ValueError, firebase_exceptions.FirebaseError) as e:
                # Covers e.g. a password under Firebase's 6-character minimum,
                # or a malformed email — without this, any Admin SDK rejection
                # crashed the whole handler into a raw, message-less 500.
                return (json.dumps({"error": str(e)}), 400, JSON_HEADERS)
            firebase_auth.set_custom_user_claims(user.uid, {
                "role": body.get("role", "staff"),
                "businessId": body.get("businessId", ""),
            })
            return (json.dumps({"uid": user.uid}), 200, JSON_HEADERS)

        if request.method == "PUT":
            body = request.get_json()
            try:
                target = firebase_auth.get_user(body["uid"])
            except firebase_auth.UserNotFoundError:
                return (json.dumps({"error": "User not found"}), 404, JSON_HEADERS)
            if target.email == PROTECTED_ADMIN_EMAIL and body["role"] != "admin":
                return (json.dumps({"error": "This account's role can't be changed"}), 403, JSON_HEADERS)
            claims = dict(target.custom_claims or {})
            claims["role"] = body["role"]
            if "businessId" in body:
                claims["businessId"] = body["businessId"]
            firebase_auth.set_custom_user_claims(body["uid"], claims)
            return (json.dumps({"ok": True}), 200, JSON_HEADERS)

        if request.method == "DELETE":
            body = request.get_json()
            try:
                target = firebase_auth.get_user(body["uid"])
            except firebase_auth.UserNotFoundError:
                return (json.dumps({"error": "User not found"}), 404, JSON_HEADERS)
            if target.email == PROTECTED_ADMIN_EMAIL:
                return (json.dumps({"error": "This account can't be deleted"}), 403, JSON_HEADERS)
            firebase_auth.delete_user(body["uid"])
            return (json.dumps({"ok": True}), 200, JSON_HEADERS)

        return (json.dumps({"error": "Method not allowed"}), 405, JSON_HEADERS)

    # --- Business management endpoints (admin only) ---
    if path == "/businesses":
        if role != "admin":
            return (json.dumps({"error": "Forbidden"}), 403, JSON_HEADERS)

        index_blob = bucket.blob(BUSINESS_INDEX_FILE)

        if request.method == "GET":
            if not index_blob.exists():
                return (json.dumps({"businesses": []}), 200, JSON_HEADERS)
            return (index_blob.download_as_text(), 200, JSON_HEADERS)

        if request.method == "POST":
            body = request.get_json()
            name = (body.get("name") or "").strip()
            if not name:
                return (json.dumps({"error": "Name is required"}), 400, JSON_HEADERS)
            index = json.loads(index_blob.download_as_text()) if index_blob.exists() else {"businesses": []}
            new_business = {"id": uuid.uuid4().hex[:10], "name": name}
            index["businesses"].append(new_business)
            index_blob.upload_from_string(json.dumps(index), content_type="application/json")
            return (json.dumps(new_business), 200, JSON_HEADERS)

        return (json.dumps({"error": "Method not allowed"}), 405, JSON_HEADERS)

    # --- Data endpoint: whole-blob GET/POST, scoped + authorized per business ---
    business_id = request.args.get("business")
    if not business_id:
        return (json.dumps({"error": "Missing business"}), 400, JSON_HEADERS)
    if role != "admin" and decoded.get("businessId") != business_id:
        return (json.dumps({"error": "Forbidden"}), 403, JSON_HEADERS)

    blob = bucket.blob(business_file(business_id))

    if request.method == "GET":
        if not blob.exists():
            return ("{}", 200, JSON_HEADERS)
        return (blob.download_as_text(), 200, JSON_HEADERS)

    if request.method == "POST":
        data = request.get_data(as_text=True)
        blob.upload_from_string(data, content_type="application/json")
        return (json.dumps({"ok": True}), 200, JSON_HEADERS)

    return (json.dumps({"error": "Method not allowed"}), 405, JSON_HEADERS)
