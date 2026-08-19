# 玄命阁 · Cloudflare Workers SSR 网站

中英双语服务端渲染网站，运行于 Cloudflare Workers。页面正文为仓库内 HTML 片段，Worker 运行时统一渲染布局并自动生成完整 SEO 元素（title/description/canonical/hreflang/og/twitter/JSON-LD）。

## 本地开发

```powershell
npm install
npm run dev        # http://localhost:8787
npm test           # vitest（含 Workers 运行时集成测试）
npm run typecheck
npm run fortune:week -- 2026-08-17   # 周运数据骨架生成器（参数必须是周一）
npm run fortune:month -- 2026-08     # 月运数据骨架生成器
```

LLM 解读接口（八字、六爻、梅花易数、小六壬、择吉）需要 LLM 密钥：本地在 `.dev.vars` 配置 `LLM_API_KEY`（不入库）；`LLM_BASE_URL`/`LLM_MODEL` 在 `wrangler.jsonc` 的 `vars` 中。

## 运势栏目（每日 / 每周 / 每月）

三个纯静态、零运行时 LLM 的内容栏目：正文烘焙进仓库内 HTML 片段，历法数据一律来自 lunar-javascript（生成期运行 `npm run almanac` / `fortune:week` / `fortune:month` 获取）。

- **每日宜忌** `/:lang/daily/YYYY-MM-DD/`：黄历宜忌 + 当日生肖 + 玄学科普，生产流程见 [每日内容生产手册](docs/superpowers/daily-content-playbook.md)。
- **每周运势** `/:lang/weekly/YYYY-MM-DD/`（周一为键）：特吉/次吉/忠告生肖 + 十二生肖六维 + 逐日速览，每周日发布，生产流程见 [周运内容生产手册](docs/superpowers/weekly-content-playbook.md)。
- **每月运势** `/:lang/monthly/YYYY-MM/`：月柱节气总览 + 十二生肖六维 + 吉日速查，每月末发布，生产流程见 [月运内容生产手册](docs/superpowers/monthly-content-playbook.md)。

新增周运/月运文章只需两步：`src/content/weekly|monthly/` 加中英两份片段 → `src/pages/weekly.ts|monthly.ts` 的 POSTS 数组加一条。SEO、sitemap、导航全部自动派生。设计决策见 [weekly/monthly 栏目设计文档](docs/superpowers/specs/2026-08-17-weekly-monthly-columns-design.md)。

## 新增一个页面（三步）

1. 在 `src/content/` 下新建 `xxx.zh.html` 与 `xxx.en.html`，只写正文（不要 html/head/body 标签）。
2. 在 `src/pages/registry.ts` 的 `PAGES` 中注册：`slug`、`inNav`、双语 `title`/`description`，可选 `jsonldType`（`Article`/`FAQPage`）与 `faq`（双语问答，存在时自动注入 FAQPage JSON-LD，参考择吉页）。
3. 提交推送。canonical、hreflang、og/twitter、JSON-LD、sitemap、导航全部自动生成。

## 部署（GitHub → Cloudflare Workers Builds）

1. Workers & Pages → Create → **Connect to Git**，选择本 GitHub 仓库。
2. Build settings：Build command 填 `npx wrangler deploy`，Build output directory 留空。
3. 保存后，每次 push 到 `main` 即自动构建部署。

## API

接口挂在 `/api/*`，统一响应壳 `{ ok, data | error: { code, message } }`。示例：`POST /api/echo`。已接入 LLM 的实例：`POST /api/bazi/interpret`（八字解读，见 `src/routes/bazi.ts`，限流 10 req/60s）、`POST /api/liuyao/interpret`（六爻解读，见 `src/routes/liuyao.ts`，限流 10 req/60s）、`POST /api/meihua/interpret`（梅花易数解读，见 `src/routes/meihua.ts`，限流 10 req/60s）、`POST /api/xiaoliuren/interpret`（小六壬解读，见 `src/routes/xiaoliuren.ts`，限流 10 req/60s）、`POST /api/zeji/interpret`（择吉日解读，见 `src/routes/zeji.ts`，限流 10 req/60s）、`POST /api/ziwei/interpret`（紫微斗数解读，见 `src/routes/ziwei.ts`，限流 10 req/60s），后续 LLM 接口按同模式新增。

## 上线前检查清单

- [x] 将 `src/config/site.ts` 的 `SITE_ORIGIN` 改为正式域名（已设为 `https://suanming-zhanbu.com`，canonical/hreflang/sitemap 全部依赖它）。
- [ ] 替换 `public/assets/og-default.png` 为正式 1200×630 分享图。
- [ ] 确认 Cloudflare Git 集成已连接并完成首次部署。
- [ ] 执行 `wrangler secret put LLM_API_KEY` 配置生产 LLM 密钥。
- [ ] 部署后用 Google Rich Results Test 抽查 JSON-LD。
