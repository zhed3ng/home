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


def default_content() -> dict:
    return {
        "news": [
            {
                "date": "2024 · Publication",
                "text": "\"From Smartphones to Smart Students\" accepted at Information Systems Research.",
            },
            {
                "date": "2024 · Media",
                "text": "Interviewed by [Media Outlet] on the impact of classroom smartphone policies on student learning outcomes.",
            },
            {
                "date": "2023 · Talk",
                "text": "Gave an invited talk on AI in education and digital experimentation at [Institution / Workshop Name].",
            },
        ]
    }


def load_content() -> dict:
    if not CONTENT_PATH.exists():
        content = default_content()
        save_content(content)
        return content

    with CONTENT_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_content(content: dict) -> None:
    with CONTENT_PATH.open("w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)
        f.write("\n")


def validate_content(payload: object) -> tuple[bool, str]:
    if not isinstance(payload, dict):
        return False, "payload must be a JSON object"

    news = payload.get("news")
    if not isinstance(news, list):
        return False, "'news' must be an array"

    for i, item in enumerate(news, 1):
        if not isinstance(item, dict):
            return False, f"news[{i}] must be object"
        if not isinstance(item.get("date"), str) or not isinstance(item.get("text"), str):
            return False, f"news[{i}] must include string fields: date, text"

    return True, ""


class RequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def _send_json(self, code: int, payload: dict) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_text(self, code: int, text: str) -> None:
        data = text.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/api/content":
            self._send_json(HTTPStatus.OK, load_content())
            return

        if path == "/admin":
            self.path = "/admin.html"
        elif path == "/":
            self.path = "/index.html"

        return super().do_GET()

    def do_PUT(self):
        path = urlparse(self.path).path
        if path != "/api/content":
            self._send_text(HTTPStatus.NOT_FOUND, "Not Found")
            return

        token = self.headers.get("X-Admin-Token", "")
        if token != ADMIN_TOKEN:
            self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "unauthorized"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            payload = json.loads(raw.decode("utf-8"))
        except Exception:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "invalid json"})
            return

        ok, error = validate_content(payload)
        if not ok:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": error})
            return

        save_content(payload)
        self._send_json(HTTPStatus.OK, {"ok": True})


def main() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", PORT), RequestHandler)
    print(f"Serving at http://0.0.0.0:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
