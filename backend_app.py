from __future__ import annotations

import json
import os
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent
CONTENT_PATH = BASE_DIR / "content.json"
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "change-me")
PORT = int(os.getenv("PORT", "8000"))

ROUTES = {
    "/": "index.html",
    "/admin": "admin.html",
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
        ]
    }


def load_content() -> dict:
    if not CONTENT_PATH.exists():
        data = default_content()
        save_content(data)
        return data

    with CONTENT_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_content(content: dict) -> None:
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


class RequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

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

        if path.endswith((".pdf", ".jpg", ".png", ".ico")):
            return super().do_GET()

        self.send_error(HTTPStatus.NOT_FOUND, "Not Found")

    def do_PUT(self):
        path = urlparse(self.path).path
        if path != "/api/content":
            self.send_error(HTTPStatus.NOT_FOUND, "Not Found")
            return

        token = self.headers.get("X-Admin-Token", "")
        if token != ADMIN_TOKEN:
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
