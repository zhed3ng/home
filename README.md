# Zhe (Joe) Deng Website — Next.js / Vercel Full Stack

这个版本已经从原来的 Python + 静态 HTML 结构，升级为 **Next.js App Router + Vercel 全栈架构**：

- 官网内容页继续保持简洁。
- Admin 页面升级为双层保护的生产化后台。
- AskJoe 直接走服务端 AI route。
- 内容数据不再依赖本地 `content.json`。
- 内容与后台会话/验证码统一迁移到 **Vercel KV** 托管存储。

## Stack

- **Framework:** Next.js 15 (App Router)
- **Hosting:** Vercel
- **Content storage:** Vercel KV
- **Admin email delivery / alerts:** Resend
- **AI route:** OpenAI Responses API

## Local development

```bash
npm install
npm run dev
```

默认访问：

- `/`：主页
- `/admin`：Admin Console（默认可访问；配置 gateway allowlist 后会先经过第一层保护）
- `/admin/api/content`：读取/保存站点内容
- `/api/ask-joe`：AskJoe AI route

## Admin security model

Admin 现在采用“更强版本”的四层保护：

1. 当你配置了 gateway 相关环境变量后，`/admin*` 和 `/admin/api/*` 会先经过 gateway allowlist，并建议走 `admin.joedeng.net` 子域名。
2. 如果没有配置 gateway，`/admin` 仍可直接打开，并回退到站内邮箱验证码登录。
3. gateway 支持以下任一条件通过：
   - 允许的 Google 身份头（如 Cloudflare Access / Google IAP 注入）
   - 固定设备 token
   - 固定国家
   - 固定 IP
4. 未启用 gateway 时，通过管理员邮箱验证码创建站内 session cookie；启用 gateway 时，可直接使用代理注入的管理员身份。
5. 管理接口全部迁移到 `/admin/api/*`，session cookie 只作用于 `/admin`。

此外还增加了：

- 验证码请求限流
- 验证失败锁定
- 审计日志（KV）
- 安全告警邮件（Resend）

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

## Recommended admin environment variables

```bash
PUBLIC_SITE_URL=https://joedeng.net
ADMIN_HOST=admin.joedeng.net
ADMIN_EMAIL=you@gmail.com
ADMIN_ALLOWED_GOOGLE_EMAILS=you@gmail.com
ADMIN_ALLOWED_IPS=203.0.113.10
ADMIN_ALLOWED_COUNTRIES=US
ADMIN_ALLOWED_DEVICE_TOKENS=your-fixed-device-token
ADMIN_GATEWAY_BYPASS_SECRET=shared-secret-for-trusted-proxy
ADMIN_ALERT_EMAIL=you@gmail.com
ADMIN_AUDIT_LOG_LIMIT=200
```

## Example deployment pattern

推荐把公开站点继续部署在 `joedeng.net`，并把后台入口迁移到 `admin.joedeng.net`。后台子域名在进入应用前，应先经过如下第一层身份保护：

- **Cloudflare Access**：将 Google 登录邮箱断言写入 `cf-access-authenticated-user-email`
- **Google IAP / 其他可信代理**：将登录邮箱写入 `x-goog-authenticated-user-email` 或 `x-auth-request-email`
- **固定办公网 / 家庭网络**：利用 Vercel / 代理传入的 IP / country 头
- **固定设备**：由受控浏览器或代理注入 `admin_device` cookie 或 `x-admin-device-token`

## Content model

当前内容由 `Vercel KV` 中的 `site:content` 键保存，结构包括：

- `hero`
- `askJoe`
- `news`

首次启动时如果 KV 里没有内容，会自动写入默认内容。

## Admin flow

1. 如果已经配置 `ADMIN_ALLOWED_*` 之类的 gateway 变量，优先访问 `https://admin.joedeng.net/`；中间件会把根路径重写到 `/admin`，并要求请求先通过 gateway allowlist。
2. Cloudflare Access（或其他可信代理）为已批准身份注入邮箱 header。
3. 应用验证该 header 是否属于授权管理员邮箱，验证通过后直接加载后台编辑器。
4. 如果没有配置 gateway，直接访问 `/admin`，输入管理员邮箱，请求一次性验证码，再校验验证码创建 `/admin` 范围内的 session cookie。
5. 登录后保存内容继续调用 `PUT /admin/api/content`，审计日志继续写入 KV。

## Notes

- `public/` 继续保留图片与 PDF 等静态资源。
- 仓库中的旧版 Python / 静态页面实现已移除，生产入口仅保留 Next.js。
