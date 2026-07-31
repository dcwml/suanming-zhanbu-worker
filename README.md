# 玄命阁 · Cloudflare Workers SSR 网站

中英双语服务端渲染网站，运行于 Cloudflare Workers。页面正文为仓库内 HTML 片段，Worker 运行时统一渲染布局并自动生成完整 SEO 元素（title/description/canonical/hreflang/og/twitter/JSON-LD）。

## 本地开发

```powershell
npm install
npm run dev        # http://localhost:8787
npm test           # vitest（含 Workers 运行时集成测试）
npm run typecheck
```

八字解读接口需要 LLM 密钥：本地在 `.dev.vars` 配置 `LLM_API_KEY`（不入库）；`LLM_BASE_URL`/`LLM_MODEL` 在 `wrangler.jsonc` 的 `vars` 中。

## 新增一个页面（三步）

1. 在 `src/content/` 下新建 `xxx.zh.html` 与 `xxx.en.html`，只写正文（不要 html/head/body 标签）。
2. 在 `src/pages/registry.ts` 的 `PAGES` 中注册：`slug`、`inNav`、双语 `title`/`description`，可选 `jsonldType`（`Article`/`FAQPage`）。
3. 提交推送。canonical、hreflang、og/twitter、JSON-LD、sitemap、导航全部自动生成。

## 部署（GitHub → Cloudflare Workers Builds）

1. Workers & Pages → Create → **Connect to Git**，选择本 GitHub 仓库。
2. Build settings：Build command 填 `npx wrangler deploy`，Build output directory 留空。
3. 保存后，每次 push 到 `main` 即自动构建部署。

## API

接口挂在 `/api/*`，统一响应壳 `{ ok, data | error: { code, message } }`。示例：`POST /api/echo`。已接入 LLM 的实例：`POST /api/bazi/interpret`（八字解读，见 `src/routes/bazi.ts`，带限流 10 req/60s），后续 LLM 接口按同模式新增。

## 上线前检查清单

- [ ] 将 `src/config/site.ts` 的 `SITE_ORIGIN` 改为正式域名（canonical/hreflang/sitemap 全部依赖它）。
- [ ] 替换 `public/assets/og-default.png` 为正式 1200×630 分享图。
- [ ] 确认 Cloudflare Git 集成已连接并完成首次部署。
- [ ] 执行 `wrangler secret put LLM_API_KEY` 配置生产 LLM 密钥。
- [ ] 部署后用 Google Rich Results Test 抽查 JSON-LD。
