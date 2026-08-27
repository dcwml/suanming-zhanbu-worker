# 历法数据 API（almanac / fortune skeleton）设计文档

- 日期：2026-08-27
- 状态：待实施
- 需求来源：用户提出把本地生成期工具（`npm run almanac` / `fortune:week` / `fortune:month`）产出的确定性历法数据做成线上 API，供内容生产时线上直接取数

---

## 1. 概述

把现有本地 CLI 的确定性计算能力（lunar-javascript 历法 + `src/fortune/rules.ts` 规则）以 GET API 形式挂到 Worker `/api/*` 下，鉴权后线上可查。三条端点分别对应三个本地命令，`data` 输出结构与本地工具 stdout 的 JSON **完全一致**。

核心改动 = 一次代码下沉：计算核心从 `scripts/` 移入 `src/`，本地 CLI 与线上 API 共享同一实现，输出永不漂移。

- 不改变现有内容生产流程：每日/每周/每月栏目仍是烘焙静态 HTML，API 只是新增的取数路径
- 本地 npm 命令永久保留（各生产手册依赖它们）
- 纯计算、零 LLM、零外部请求；lunar-javascript 1.7.7 为单文件无依赖纯计算库（浏览器已在用），可入 Worker bundle（约 436KB 未压缩 / gzip 后约 100KB，远低于 Workers 限制）

## 2. 决策记录

| # | 问题 | 结论 |
|---|------|------|
| 1 | 受众 | 自己内容生产用（线上 curl 取数写内容），不对公众开放、不做文档页 |
| 2 | 鉴权 | `x-api-key` 请求头与 secret `ALMANAC_API_KEY` 比对；**未配置 secret 时端点返回 503 `not_configured`**，防止忘配 secret 裸奔上线（与 LLM 接口 not_configured 模式一致） |
| 3 | 限流 | 不加（纯计算零成本，鉴权已兜底；现有 ratelimit 绑定是为付费 LLM 调用设的） |
| 4 | 「今天」的时区 | 固定 **Asia/Shanghai**。Workers 的 `new Date()` 是 UTC，不处理的话北京时间早 8 点前会拿到"昨天" |
| 5 | 缓存 | 不做（纯计算毫秒级，自用流量极小） |
| 6 | 方案 | 核心逻辑下沉 `src/`，CLI 与 API 双壳复用（否决：API 层复制一份逻辑——双实现漂移；Cron+KV 预生成——任意日期查询无法预生成全覆盖，过度设计） |
| 7 | stats | 三条路径接入现有 `recordApiCall`（D1），与全站 API 一致 |

## 3. API 设计

| 端点 | 参数 | 对应本地命令 | data 内容 |
|---|---|---|---|
| `GET /api/almanac` | `?date=YYYY-MM-DD`，缺省=今天（上海时区） | `npm run almanac -- <date>` | 单日黄历：四柱干支、宜忌、冲煞、方位神、节气、吉神凶煞等 |
| `GET /api/fortune/week` | `?monday=YYYY-MM-DD`，缺省=本周周一（上海时区） | `npm run fortune:week -- <date>` | 7 天骨架 + 生肖评分 + 特吉/次吉/忠告排序 |
| `GET /api/fortune/month` | `?month=YYYY-MM`，缺省=本月（上海时区） | `npm run fortune:month -- <ym>` | 月柱分段、节气、生肖月关系、五类吉日速查 |

- 响应壳沿用全站约定：`{ ok: true, data }` / `{ ok: false, error: { code, message } }`
- 错误码：`unauthorized`（401，key 缺失/不匹配）、`invalid_request`（400，日期/月份格式错；week 参数非周一时 message 提示该周正确周一，复用本地脚本纠错文案）、`not_configured`（503）
- 「今天/本周一/本月」用 `toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" })` 取 ISO 形态日期；周一偏移、月份边界均基于该日期推导（复用下沉后的纯函数）
- 调用方式：`curl -H "x-api-key: <key>" "https://suanming-zhanbu.com/api/almanac?date=2026-09-01"`

## 4. 代码组织

```
src/
  almanac/
    compute.ts        ← 新：compute() + 天干五行表 + 五鼠遁（自 scripts/almanac.ts 原样移入）
  fortune/
    rules.ts          ← 不动
    skeleton.ts       ← 新：buildWeek / buildMonth / LUCKY_CATEGORIES / yearZodiacOf（自 scripts/fortune.ts 原样移入）
  routes/
    almanac.ts        ← 新：鉴权 → 参数校验 → 调核心 → JSON 响应；export AlmanacEnv { ALMANAC_API_KEY?: string }
scripts/
  almanac.ts          ← 薄壳：argv 解析 → 调 src/almanac/compute → console.log（CLI 行为不变）
  fortune.ts          ← 薄壳：argv 解析 → 调 src/fortune/skeleton → console.log（CLI 行为不变）
```

- 唯一逻辑适配：`buildWeek` 遇非周一参数时 `process.exit(1)` 改为**抛 Error**（信息原样保留）；CLI 壳 catch 后照旧 `console.error + exit(1)`，API 层 catch 后转 400 `invalid_request`
- `package.json`：`lunar-javascript` 从 devDependencies 移到 **dependencies**
- `src/routes/api.ts`：import 并注册 `registerAlmanacRoutes(api)`，Bindings 并入 `AlmanacEnv`
- `src/index.ts` 无需改动（api 子应用已挂载）
- 部署前：`wrangler secret put ALMANAC_API_KEY`；本地 `.dev.vars` 加一行同名变量（测试与 dev 用）

## 5. 测试策略（TDD）

新增 `test/almanac-api.test.ts`（SELF.fetch 集成测试，env 注入 `ALMANAC_API_KEY`）：

1. 503 `not_configured`：env 未配 key 时三条端点均拒绝
2. 401 `unauthorized`：无 `x-api-key` / 错误 key
3. 400 `invalid_request`：date 非 `YYYY-MM-DD`、month 非 `YYYY-MM`、week 参数非周一（断言 message 含正确周一日期）
4. 200 一致性：已知日期（2026-08-17 周、2026-08 月）断言关键字段（dayGanZhi / yi / ji / ranks.teJi / monthPillarSegments / luckyDays 非空等），与本地工具输出一致
5. 缺省参数：不传 date/monday/month 时返回上海时区"今天/本周一/本月"（测试注入固定时钟不可行时，接受按当前日期动态断言格式与 200）

完成后的开发验证：`npm run almanac -- 2026-08-17` 与 `curl` 同参数的 `data` 人工 diff 一次，确认完全一致。

## 6. 已知取舍

- 不做响应缓存层、不做公开 API 文档页、不做跨域配置（自己 curl / 同站调用够用）
- key 比对用普通 `===`，不做 timing-safe 比较（自用场景，密钥熵足够，过度防护无收益）
- `GET` 无幂等外副作用，重复调用只耗 CPU 微秒级；不设 ratelimit 绑定，省 wrangler 配置
- 未来若要对外开放，再评估：加 ratelimit、加缓存（Cache API / KV）、加文档页——本设计刻意不做
