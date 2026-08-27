# LLM 生成端点（POST /api/llm/generate）设计

日期：2026-08-28
状态：已与作者逐节确认

## 背景与目的

历法数据 API（`/api/almanac`、`/api/fortune/week`、`/api/fortune/month`）已上线，下一步是把每日/每周/每月博客的内容生产做成 crontab 定时任务：shell 脚本先调历法数据 API 拿骨架，再调一个 **纯 LLM 生成端点** 产出文案，组装成博客 HTML 片段后 git push 发布。

本设计新增一个**类型驱动**的 LLM 生成端点。现有 7 个 interpret 端点（bazi/liuyao/meihua/xiaoliuren/zeji/ziwei/hehun）**一字不动**——它们是站内工具页的前端功能，与本端点无关。

## 端点契约

`POST /api/llm/generate`，仅作者自用（shell 脚本），不对外公开。

**请求体**：

```json
{
  "type": "daily-zodiac",
  "data": {
    "lang": "zh",
    "date": "2026-09-01",
    "almanac": { "…GET /api/almanac 的 data 原样…" }
  }
}
```

- `type`：字符串，必须是注册表内的类型（见下表）
- `data`：对象，形状由 type 决定；`lang` 必填（`"zh" | "en"`）

**成功响应**：`{ ok: true, data: { type, lang, markdown } }`

- 回显 `type`/`lang` 便于批量生成时对账防串号
- `markdown`：与现有 interpret 端点的数据形状一致。结构控制权在 shell 端（marked 转 HTML 或套模板），**不让 LLM 直接产 HTML**

**错误码**（沿用全站 `{ ok: false, error: { code, message } }` 壳）：

| code | HTTP | 场景 |
|---|---|---|
| `unauthorized` | 401 | x-api-key 缺失/不匹配 |
| `not_configured` | 503 | SITE_API_KEY 未配置（防忘配裸奔，优先判定） |
| `invalid_json` | 400 | body 非合法 JSON |
| `payload_too_large` | 413 | body 超过 64KB |
| `invalid_request` | 400 | type 未注册 / data 缺必填字段 / lang 非法 |
| `not_configured` | 500 | LLM_API_KEY 等未配置（callLlm 返回） |
| `upstream_error` | 502 | LLM 上游错误 |
| `upstream_timeout` | 504 | LLM 上游超时（60s，callLlm 默认） |

**校验深度**：type 查注册表、`lang` 合法、栏目必填字段（date/monday/month/almanac/week/skeleton）存在且为对象。**不做深递归校验**——数据来自自家 API，结构演化不用同步改这里（边界见「已知取舍」）。

## 首批 9 个 type

分段生成：每次调用产出一小块文案，输出短、质量可控、局部不满意只重调该段。

| type | 生成内容 | data 形状 |
|---|---|---|
| `daily-reading` | A 段解读（基于宜忌/冲煞/神煞的 2-4 句） | `{ lang, date, almanac }` |
| `daily-zodiac` | B 段当日生肖主角运势 | `{ lang, date, almanac }` |
| `daily-story` | C 段科普典故 | `{ lang, date, almanac }` |
| `weekly-summary` | 导语 + 特吉/次吉/忠告排名解读 | `{ lang, monday, week }` |
| `weekly-zodiac` | 12 生肖 × 六行（一次生成，data 含排名以协调语气） | `{ lang, monday, week }` |
| `weekly-days` | 七日要点点评 | `{ lang, monday, week }` |
| `monthly-summary` | 月柱总览 + 节气 + 排名解读 | `{ lang, month, skeleton }` |
| `monthly-zodiac` | 12 生肖 × 六维深化（一次生成） | `{ lang, month, skeleton }` |
| `monthly-lucky` | 吉日速查五类解读 | `{ lang, month, skeleton }` |

其中 `almanac` = `GET /api/almanac` 的 data、`week` = `GET /api/fortune/week` 的 data、`skeleton` = `GET /api/fortune/month` 的 data，原样塞入。

## system / user 组装规则

- **system 按 lang 出中/英两版**，内容写死在后端（`src/llmgen/` 各文件），结构要素：
  - 角色设定（传统命理/黄历文化作者口吻）
  - 任务描述（按 type）
  - 输出要求：markdown、段落结构与长度约束
  - 数据纪律：只依据传入数据推演，不编造历法数据
  - **防线句**：「输出勿自称或提及人工智能」（全站文案红线，zh/en 各写一版，嵌入每个 system 模板）
- **user 由 data 组装**：必含 lang 对应语言的日期/骨架数据序列化（如干支、宜忌、评分排名等关键字段）
- 防线有测试断言（同现有 7 个 `prompt.ts` 惯例）

## 鉴权：提取共享模块 + secret 改名

- `src/routes/almanac.ts` 的私有 `authProblem` 提取到 `src/auth.ts`，改为读 `SITE_API_KEY`：

```ts
export interface SiteAuthEnv { SITE_API_KEY?: string; }
export function authProblem(env, apiKeyHeader): { code; message; status: 503 | 401 } | null
```

- almanac 3 端点 + 新 generate 端点统一走它（almanac 行为不变，只换 secret 名）
- **零停机切换顺序**：先 `wrangler secret put SITE_API_KEY`（新旧 secret 并存互不影响）→ push 代码 → 代码只读新名。旧 `ALMANAC_API_KEY` 可顺手 delete
- 本地 `.dev.vars`：`ALMANAC_API_KEY` 行改名 `SITE_API_KEY`，值不变
- 不做旧名兼容读取（一次性切换）

## 代码组织

```
src/
  auth.ts              # SiteAuthEnv + authProblem（从 almanac.ts 提取，读 SITE_API_KEY）
  llmgen/
    types.ts           # { type, data } 请求类型 + 各栏目 data 形状 + GenType 联合类型
    registry.ts        # GENERATORS: Record<GenType, { validate(data), system(lang), user(data) }>
    daily.ts           # daily-reading / daily-zodiac / daily-story 三个条目
    weekly.ts          # weekly-summary / weekly-zodiac / weekly-days
    monthly.ts         # monthly-summary / monthly-zodiac / monthly-lucky
  routes/
    llmgen.ts          # POST /api/llm/generate
    api.ts             # 挂载 registerLlmgenRoutes + Bindings 并集
```

handler 链（与现有 interpret 端点同构）：stats 记录 → 鉴权 → 64KB 上限 → JSON parse → type 查表 → validate → 组 system/user → callLlm → 响应（上游错误码映射复用 bazi 的 messages 表模式）。

加新 type（如年度运势 `yearly-summary`）= 注册表加一个条目 + prompt 测试，路由零改动。

## 测试策略

- `test/llmgen-prompt.test.ts`：9 个 type × 双语 system 含防线句断言；user 组装含关键数据字段（用 2026-08-17 锚点数据）
- `test/llmgen-api.test.ts`：503/401、invalid_json、payload_too_large、type 未注册、data 缺字段、成功路径（LLM stub 沿用 `bazi-api.test.ts` 既有模式）；`api.fetch(req, env)` 直调注入 env
- 鉴权迁移回归：`almanac-api.test.ts` 现有 16 用例把注入的 env 名改为 `SITE_API_KEY`，断言不变

## 决策记录

| 决策 | 备选 | 理由 |
|---|---|---|
| 类型驱动 `{ type, data }`，system 后端写死 | `{ system, user }` 裸代理 | 防线统一、按 type 演化 prompt，未来加类型零路由改动 |
| type 细分到段（如 `daily-zodiac`） | `{ type, section }` 三字段 | 保持两字段契约；注册表键即生成目标 |
| 分段生成 | 整篇生成 | 输出短、质量可控、局部重试粒度小 |
| markdown 输出 | LLM 直出 HTML | HTML 结构风险高；与现有 interpret 数据形状一致，shell 端掌控结构 |
| secret 改名 SITE_API_KEY | 沿用 ALMANAC_API_KEY | 名字通用化一次到位；迁移成本仅一次 `wrangler secret put` |
| 注册表单模块（方案 A） | 每 type 目录三件套 | 每 type 只是 prompt 组装，几十行一个条目；目录级组织是开销 |
| 复用 callLlm（60s 非流式） | 新 LLM 客户端 | 分段输出短，60s 足够；零新依赖 |

## 已知取舍（勿顺手修复）

- **无限流**：与 almanac 数据端点一致——key 即门槛，自用信任；泄露风险由 key 保管承担。
- **weekly/monthly-zodiac 一次生成 12 生肖**：输出较长，若实测截断或质量差，后续拆分为逐生肖 type（注册表架构天然支持，无需改路由）。
- **data 不做深校验**：传错结构不会 400 而是 LLM 输出劣化——自用可接受（数据来自自家 API）。
- **无缓存**：重复调用重复计费；crontab 场景无重放需求。
- **无旧 secret 名兼容读取**：部署顺序保证零中断。

## 文档同步

AGENTS.md（鉴权段、目录结构、端点清单）与 README.md 随实现同步更新。
