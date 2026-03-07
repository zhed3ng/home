# Personal Academic Website (Simplified)

This project is intentionally kept **simple**:
- `index.html`: main website page (your full academic homepage)
- `admin.html`: small admin page to edit content JSON
- `backend_app.py`: lightweight backend API + static file server
- `content.json`: editable content data (currently News)

## Run locally

```bash
export ADMIN_TOKEN=your_token_here
python backend_app.py
```

Open:
- Site: http://127.0.0.1:8000/
- Admin: http://127.0.0.1:8000/admin

## API

- `GET /api/health` → health check
- `GET /api/content` → read content
- `PUT /api/content` → update content (requires header `X-Admin-Token`)

Example update:

```bash
curl -X PUT http://127.0.0.1:8000/api/content \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Token: your_token_here' \
  -d '{"news":[{"date":"2026 · Update","text":"New item"}]}'
```

This keeps maintenance easy while still allowing backend-managed updates.
