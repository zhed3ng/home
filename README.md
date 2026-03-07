# Joe Deng Personal Website

A lightweight personal academic website with a small backend for content updates.

## Project structure

- `index.html`: public homepage.
- `admin.html`: admin panel to edit website content JSON.
- `backend_app.py`: zero-dependency Python backend API and static file server.
- `content.json`: editable website content source (currently used for News updates).

## Run locally

1. Start server (set your own admin token first):

```bash
export ADMIN_TOKEN='replace-with-your-secret'
python backend_app.py
```

2. Open:

- Homepage: `http://localhost:8000/`
- Admin panel: `http://localhost:8000/admin`

## Update content workflow

1. Open `/admin`.
2. Click **Load** to fetch current JSON.
3. Edit the `news` list in JSON.
4. Enter the `ADMIN_TOKEN` value.
5. Click **Save**.
6. Refresh homepage to see updates.

## API

- `GET /api/content`: get current content JSON.
- `PUT /api/content`: update content JSON, requires header `X-Admin-Token`.
