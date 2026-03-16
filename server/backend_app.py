from __future__ import annotations

import json
import os
import secrets
import smtplib
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from email.message import EmailMessage
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

ROOT_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT_DIR / "public"
DATA_DIR = ROOT_DIR / "data"
CONTENT_PATH = DATA_DIR / "content.json"
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "change-me")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "zhe.joe.deng@gmail.com").strip().lower()
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() != "false"
MAIL_FROM = os.getenv("MAIL_FROM", SMTP_USERNAME or "no-reply@example.com")
LOGIN_CODE_TTL_MINUTES = int(os.getenv("LOGIN_CODE_TTL_MINUTES", "10"))
PORT = int(os.getenv("PORT", "8000"))

pending_login_codes: dict[str, dict[str, object]] = {}
active_admin_tokens: dict[str, datetime] = {}

ROUTES = {
    "/": "index.html",
    "/index.html": "index.html",
    "/public/index.html": "index.html",
    "/admin": "admin.html",
    "/admin/": "admin.html",
    "/admin.html": "admin.html",
}


def default_content() -> dict:
    return {
        "news": [
            {
                "date": "2024 · Publication",
                "text": "From Smartphones to Smart Students accepted at Information Systems Research.",
            },
            {
                "date": "2024 · Media",
                "text": "Interviewed on classroom smartphone policies and student learning outcomes.",
            },
            {
                "date": "2023 · Talk",
                "text": "Invited talk on AI in education and digital experimentation.",
            },
        ]
    }


def load_content() -> dict:
    if not CONTENT_PATH.exists():
        CONTENT_PATH.parent.mkdir(parents=True, exist_ok=True)
        data = default_content()
        save_content(data)
        return data

    with CONTENT_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_content(content: dict) -> None:
    CONTENT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CONTENT_PATH.open("w", encoding="utf-8") as file:
        json.dump(content, file, ensure_ascii=False, indent=2)
        file.write("\n")


def validate_content(payload: object) -> tuple[bool, str]:
    if not isinstance(payload, dict):
        return False, "payload must be an object"

    news = payload.get("news")
    if not isinstance(news, list):
        return False, "news must be an array"

    for idx, item in enumerate(news):
        if not isinstance(item, dict):
            return False, f"news[{idx}] must be an object"
        if not isinstance(item.get("date"), str):
            return False, f"news[{idx}].date must be a string"
        if not isinstance(item.get("text"), str):
            return False, f"news[{idx}].text must be a string"

    return True, ""


def _cleanup_expired_tokens() -> None:
    now = datetime.now(timezone.utc)
    for token in list(active_admin_tokens.keys()):
        if active_admin_tokens[token] <= now:
            del active_admin_tokens[token]


def _is_valid_session_token(token: str) -> bool:
    _cleanup_expired_tokens()
    return token in active_admin_tokens


def _issue_session_token() -> str:
    token = secrets.token_urlsafe(32)
    active_admin_tokens[token] = datetime.now(timezone.utc) + timedelta(hours=8)
    return token


def _send_verification_email(email: str, code: str) -> tuple[bool, str]:
    if not SMTP_HOST:
        return False, "SMTP_HOST is not configured"

    msg = EmailMessage()
    msg["Subject"] = "Your admin verification code"
    msg["From"] = MAIL_FROM
    msg["To"] = email
    msg.set_content(
        f"Your admin verification code is: {code}\n\n"
        f"This code will expire in {LOGIN_CODE_TTL_MINUTES} minutes."
    )

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            if SMTP_USE_TLS:
                server.starttls()
            if SMTP_USERNAME and SMTP_PASSWORD:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
    except Exception as exc:
        return False, str(exc)

    return True, ""


class RequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)

    def _send_json(self, code: int, payload: dict) -> None:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _parse_json_body(self) -> object:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/api/health":
            self._send_json(HTTPStatus.OK, {"ok": True})
            return

        if path == "/api/content":
            self._send_json(HTTPStatus.OK, load_content())
            return

        if path in ROUTES:
            self.path = "/" + ROUTES[path]
            return super().do_GET()

        if path.startswith("/assets/"):
            return super().do_GET()

        if path in {"/ZheDeng_CV_Jan2026.pdf", "/ZheDeng_CV_May2025.pdf", "/zhe-deng-sju-headshot-min.jpg"}:
            self.path = path
            self.directory = str(ROOT_DIR)
            return super().do_GET()

        self.send_error(HTTPStatus.NOT_FOUND, "Not Found")

    def do_POST(self):
        path = urlparse(self.path).path

        if path == "/api/admin/request-code":
            try:
                payload = self._parse_json_body()
            except Exception:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid JSON payload"})
                return

            email = str(payload.get("email", "")).strip().lower() if isinstance(payload, dict) else ""
            if not email:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "email is required"})
                return

            if email != ADMIN_EMAIL:
                self._send_json(HTTPStatus.FORBIDDEN, {"error": "email is not allowed"})
                return

            code = f"{secrets.randbelow(1000000):06d}"
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=LOGIN_CODE_TTL_MINUTES)
            pending_login_codes[email] = {"code": code, "expires_at": expires_at}

            ok, err = _send_verification_email(email, code)
            if not ok:
                self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": f"failed to send email: {err}"})
                return

            self._send_json(HTTPStatus.OK, {"ok": True})
            return

        if path == "/api/admin/verify-code":
            try:
                payload = self._parse_json_body()
            except Exception:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid JSON payload"})
                return

            if not isinstance(payload, dict):
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "payload must be an object"})
                return

            email = str(payload.get("email", "")).strip().lower()
            code = str(payload.get("code", "")).strip()

            record = pending_login_codes.get(email)
            if not record:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "invalid or expired code"})
                return

            if datetime.now(timezone.utc) > record["expires_at"]:
                del pending_login_codes[email]
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "invalid or expired code"})
                return

            if code != record["code"]:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "invalid or expired code"})
                return

            del pending_login_codes[email]
            session_token = _issue_session_token()
            self._send_json(HTTPStatus.OK, {"ok": True, "sessionToken": session_token})
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Not Found")

    def do_PUT(self):
        path = urlparse(self.path).path
        if path != "/api/content":
            self.send_error(HTTPStatus.NOT_FOUND, "Not Found")
            return

        token = self.headers.get("X-Admin-Token", "")
        if token != ADMIN_TOKEN and not _is_valid_session_token(token):
            self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "unauthorized"})
            return

        try:
            payload = self._parse_json_body()
        except Exception:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid JSON payload"})
            return

        ok, message = validate_content(payload)
        if not ok:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": message})
            return

        save_content(payload)
        self._send_json(HTTPStatus.OK, {"ok": True})


def main() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", PORT), RequestHandler)
    print(f"Serving http://0.0.0.0:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
