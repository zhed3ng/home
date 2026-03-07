# Personal Academic Website (Standardized, Lightweight)

这个版本保持**轻量**，但采用了更“商业网站风格”的标准目录组织：

```text
.
├── public/
│   ├── index.html
│   ├── admin.html
│   └── assets/
│       ├── css/site.css
│       └── js/{site.js,admin.js}
├── server/
│   └── backend_app.py
├── data/
│   └── content.json
└── backend_app.py   # 启动入口（兼容）
```

## Features

- 单页官网（完整学术内容）
- 后端 API 管理内容（当前管理 News）
- Admin Console 在线编辑 `content.json`
- 前端样式与脚本分离，便于维护与扩展

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
- `PUT /api/content` → update content (header: `X-Admin-Token`)

Example:

```bash
curl -X PUT http://127.0.0.1:8000/api/content \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Token: your_token_here' \
  -d '{"news":[{"date":"2026 · Update","text":"New item"}]}'
```

## Why this structure

相比把所有内容塞在单文件里，这个结构更清晰；
相比完整前端工程（React/Vite + 很多目录），这个结构更轻，适合个人主页长期维护。
