# Zhe (Joe) Deng Website — Next.js / Vercel Full Stack

这个版本已经从原来的 Python + 静态 HTML 结构，升级为 **Next.js App Router + Vercel 全栈架构**：

- 官网内容页继续保持简洁。
- Admin 页面改成更正式的生产化后台。
- AskJoe 直接走服务端 AI route。
- 内容数据不再依赖本地 `content.json`。
- 内容与后台会话/验证码统一迁移到 **Vercel KV** 托管存储。

## Stack

- **Framework:** Next.js 15 (App Router)
- **Hosting:** Vercel
- **Content storage:** Vercel KV
- **Admin email delivery:** Resend
- **AI route:** OpenAI Responses API

## Local development

```bash
npm install
npm run dev
```

默认访问：

- `/`：主页
- `/admin`：Admin Console
- `/api/content`：读取/保存站点内容
- `/api/ask-joe`：AskJoe AI route

## Required environment variables

```bash
KV_URL=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
ADMIN_EMAIL=zhe.joe.deng@gmail.com
RESEND_API_KEY=...
MAIL_FROM=admin@your-domain.com
OPENAI_API_KEY=...
ASK_JOE_MODEL=gpt-4.1-mini
```

可选：

```bash
LOGIN_CODE_TTL_MINUTES=10
```

## Content model

当前内容由 `Vercel KV` 中的 `site:content` 键保存，结构包括：

- `hero`
- `askJoe`
- `news`

首次启动时如果 KV 里没有内容，会自动写入默认内容。

## Admin flow

1. 在 `/admin` 输入授权邮箱。
2. 系统通过 Resend 发送验证码。
3. 验证成功后拿到 session token。
4. Admin 保存内容时调用 `PUT /api/content`。
5. 内容最终写入 Vercel KV，而不是本地 JSON 文件。

## Notes

- `public/` 继续保留图片与 PDF 等静态资源。
- 旧的 Python / 静态页面文件目前仍保留在仓库里，便于回滚或迁移对照；生产入口已改为 Next.js。
