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


## PR 冲突（GitHub 显示 *This branch has conflicts*）怎么处理

如果页面提示冲突文件是 `README.md`、`backend_app.py`、`index.html`，按下面做：

```bash
# 1) 先同步远端
git fetch origin

# 2) 切到你的 PR 分支
git checkout <your-pr-branch>

# 3A) 推荐：rebase 到目标分支（例如 main）
git rebase origin/main
# 或 3B) merge 也可以
# git merge origin/main

# 4) 逐个解决冲突文件（删掉 <<<<<<< ======= >>>>>>> 标记）
# 5) 标记已解决
git add README.md backend_app.py index.html

# 6A) rebase 流程继续
# git rebase --continue
# 6B) merge 流程提交
# git commit

# 7) 推送分支
# rebase 后要 --force-with-lease
git push --force-with-lease origin <your-pr-branch>
# merge 流程则普通 push
# git push origin <your-pr-branch>
```

### 冲突选择建议（针对本仓库）
- `backend_app.py`：保留根入口转发到 `server/backend_app.py` 的版本。
- `index.html`：保留根目录兼容页（redirect 到 `/`），主页面内容维护在 `public/index.html`。
- `README.md`：保留“public/server/data”目录结构说明，再补充你这次改动说明。


## Compatibility Routes

- `/index.html` 与 `/public/index.html` 都会映射到首页，避免历史链接 404。
- `/admin.html` 会映射到后台页。
