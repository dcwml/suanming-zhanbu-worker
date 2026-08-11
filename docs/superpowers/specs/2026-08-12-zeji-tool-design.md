# 择吉工具（zeji）设计文档

- 日期：2026-08-12
- 状态：已定稿，待实施计划
- 需求来源：`docs/2026-08-11-择吉工具-需求.md`（方向讨论稿）
- 范围：**一次交付，不分期**（原 MVP + 一点五期 + 二期全部内容）

---

## 1. 概述

新增交互式择吉工具页面（`/zh/zeji/`、`/en/zeji/`）：用户选事项 → 工具扫描未来窗口内宜该事项的日子 → 按个性化避冲与凶日规则过滤 → 三因子加权排序 → 输出候选日卡片（双层模板解读 + 吉时 + 方位），并可为单个候选日请求 LLM 详解。

核心原则：

- **纯前端历法计算**：lunar-javascript 经 CDN 引入浏览器（主源 + 回退源），Worker 运行时不引入历法库。
- **后端零重算**：LLM 详解端点只消费前端传入的结构化候选日数据（与六爻页"零算法"、八字页"前端算盘后端解读"同一原则）。
- **两步加页面**：正文片段 + `registry.ts` 注册，SEO/sitemap/导航自动派生。

## 2. 决策记录（需求稿第 7 节开放问题的最终结论）

| # | 问题 | 结论 |
|---|------|------|
| 1 | 事项菜单 | **全量收录**库 `getDayYi` 词表，按语义分组展示 |
| 2 | 库版本一致性 | 已验证：宜忌/干支/冲生肖两版一致，**吉神凶煞 730 天中 236 处不同** → 全站统一到 **1.7.7**（含八字页 CDN） |
| 3 | 月破/杨公忌字段 | 月破在 `getDayXiongSha()`（约 29 天/年）；杨公忌库无接口 → **自建农历月日 13 项静态表** |
| 4 | 六害/三刑 | 六冲必选；六害/三刑**可选开关，默认关**；三刑只含寅巳申、丑戌未、子卯，**自刑不纳入** |
| 5 | 人数上限 | **2 人** |
| 6 | 默认日期范围 | 30/60/90/180 天预设，**默认 90 天** |
| 7 | slug 与命名 | `zeji`；中文"择吉日"；英文 "Auspicious Date Finder" |
| 8 | 模板解读话术 | **双层**：通书体事实行 + 口语体提示行，中英一一对应 |
| 9 | 排序权重 | 三因子加权：黄黑道 ±3、建除 ±2/±1、二十八宿 ±1 |

追加决策（讨论中新增）：

- **周末过滤不做**；候选日卡片直接显示星期几，用户自行判断。
- **全站报错文案统一为"天师"口吻**（择吉 + 八字 + 六爻三页），见第 10 节。
- **八字输入双模式**：直接选四柱干支，或输入公历/农历生日转换；四柱是唯一内部表示，见第 5.3 节。

## 3. 已验证的技术事实

以下结论由本次设计阶段实际运行验证，实施时可直接依赖：

1. **版本对比**（730 天、8 个字段）：1.7.5 与 1.7.7 的 `getDayYi/getDayJi/getDayInGanZhi/getDayChongShengXiao/getDayTianShenLuck/getZhiXing` 全部一致；`getDayJiShen/getDayXiongSha` 有 236 处不同（非错位，是数据修订）。
2. **时辰接口可用**：`getTimeYi()/getTimeJi()/getTimeTianShenLuck()` 在 1.7.7 存在且返回有效数据。
3. **二十八宿接口可用**：`getXiu()` 返回宿名、`getXiuLuck()` 返回"吉/凶"。
4. **建除接口**：`getZhiXing()` 返回值星名（如"开"）。
5. **杨公忌无接口**：`Lunar` 原型上无 YangGong 相关方法，库导出中无 `YangGong` 类。
6. **cdnjs 有 1.7.7**（latest 即 1.7.7），主源可用；回退源 staticfile.org 是否有 1.7.7 在实现期验证，无则换 jsdelivr。
7. **煞方位无接口**：按日支三合自建查表（寅午戌煞北、申子辰煞南、巳酉丑煞东、亥卯未煞西），与 `scripts/almanac.ts` 同一规则。

## 4. 架构与文件清单

| 文件 | 类型 | 职责 |
|---|---|---|
| `src/content/zeji.zh.html` / `zeji.en.html` | 新增 | 正文片段：工具区容器 + FAQ 段落 + 尾部 script 标签 |
| `src/pages/registry.ts` | 改动 | `PAGES` 加 `{ slug: "zeji", inNav: true, ... }`；`PageEntry` 新增可选字段 `faq?: Record<Lang, { question: string; answer: string }[]>` |
| `public/assets/zeji.js` | 新增 | 全部前端逻辑（预计 800-1000 行单文件，与 bazi.js 同风格、无构建步骤） |
| `src/zeji/validate.ts` | 新增 | LLM 详解请求体校验 |
| `src/zeji/prompt.ts` | 新增 | 提示词组装（zh/en） |
| `src/zeji/types.ts` | 新增 | 请求体共享类型 |
| `src/routes/zeji.ts` | 新增 | `POST /api/zeji/interpret`，挂载进 `routes/api.ts` |
| `src/seo/jsonld.ts` | 改动 | 新增 `faqJsonLd(lang, items)`（输出 `mainEntity`） |
| `src/layout/render.ts` | 改动 | zeji 页 head 并列注入 FAQPage JSON-LD |
| `src/content/bazi.zh.html` / `bazi.en.html` | 改动 | CDN 主源 + 回退源 1.7.5 → 1.7.7 |
| `public/assets/bazi.js`、`public/assets/liuyao.js` | 改动 | 报错/状态文案换天师口吻（第 10 节映射表） |
| `test/zeji-validate.test.ts` / `zeji-prompt.test.ts` / `zeji-api.test.ts` | 新增 | 后端部分 TDD |
| `test/jsonld.test.ts` / `registry.test.ts` / `render.test.ts` / `integration.test.ts` | 改动 | 扩展断言 |

**zeji.js 内部分节**：

1. CDN 加载（1.7.7 主源 + `onerror` 回退 + 失败提示）
2. 事项词表（中文原词为匹配键，zh/en 显示名映射）+ 分组定义
3. 查表常量：六冲、六害、三刑（不含自刑）、煞方位、杨公忌 13 项
4. `scan`：从今天起遍历 N 天取历法属性
5. `filter`：事项包含 → 避冲 → 凶日排除
6. `score`：三因子加权排序
7. `render`：候选日卡片（含展开区：吉时 Top 3 + 方位）
8. `interpret`：LLM 详解（按钮级 loading/错误态，marked + DOMPurify 渲染）

## 5. 表单与输入语义

### 5.1 表单组成

| 输入项 | 控件 | 默认 |
|---|---|---|
| 事项 | 分组下拉（全量词表） | 预选第一项（嫁娶） |
| 日期范围 | 下拉 30/60/90/180 天 | 90 |
| 第 1 人·生肖 | 下拉（含"不指定"） | 不指定 |
| 第 1 人·八字（进阶折叠区） | 双模式，见 5.3 | 空 |
| 第 2 人 | 默认隐藏，"再加一人"按钮唤出，结构同第 1 人 | 空 |
| 六害/三刑开关 | 复选框 | 关 |

### 5.2 选填项自动处理（核心约定）

**任何选填项留空都等价于"关闭对应过滤"，永不报错、永不阻断查询。**

| 状态 | 行为 |
|---|---|
| 生肖不指定 + 八字空 | 不做避冲过滤，仅事项过滤 + 凶日排除 |
| 只填生肖 | 按年支避六冲 |
| 填了八字 | 四柱取年支 + 日支避冲；生肖下拉自动由年支推导并锁定 |
| 第 2 人不填 | 不参与过滤 |
| 六害/三刑开关 | 仅在至少一人有生肖/八字时可开启，否则禁用置灰 |

### 5.3 八字输入双模式（一次成柱）

进阶输入区两个标签页：

1. **直接选四柱**：年/月/日/时各一组干支下拉；选项联动过滤保证**阴阳相配**（阳干只配阳支、阴干只配阴支），非法组合不出现。
2. **生日转换**：公历/农历切换（农历含闰月勾选，与八字页同一交互）+ 年/月/日/时 → 前端 `EightChar` 一次排盘。**不考虑真太阳时**；时辰缺省用 12:00（只影响时柱，不影响年支/日支，避冲结果不受时辰影响）。

**四柱是唯一内部表示**：无论哪条路径，得到四柱后固定为 `persons[i].pillars`，后续避冲与 LLM 请求体直接使用，任何环节不再回查出生日期。日期非法（2 月 30 日、农历无此闰月）沿用八字页往返校验 + 行内报错，不阻断其他输入。

## 6. 筛选与排序规则

### 6.1 硬过滤（任一不满足即出局）

1. **事项过滤**：`getDayYi()` 精确包含所选事项（中文原词匹配）。
2. **避冲过滤**：
   - 六冲（必选）：候选日日支不冲任何相关人的年支（生肖模式）或年支 + 日支（八字模式）。
   - 六害/三刑（开关开启时追加）：六害查表（子未、丑午、寅巳、卯辰、申亥、酉戌）；三刑只取寅巳申、丑戌未两组三刑与子卯互刑，自刑（辰午酉亥）不纳入。
   - 多人：候选日须同时不冲所有相关人（条件交集）。
   - 六冲/六害/三刑映射表前端自建（库不提供生肖关系查询）。
3. **通用凶日排除**：
   - 凶煞列表含「月破」→ 排除；
   - 杨公忌静态表匹配（农历月/日）：正月十三、二月十一、三月初九、四月初七、五月初五、六月初三、七月初一、七月廿九、八月廿七、九月廿五、十月廿三、冬月廿一、腊月十九；
   - 「四离」「四绝」若出现在凶煞列表同样排除（确切凶煞名实现期以扫描实测枚举确认并加断言）。

### 6.2 内部排序（不向用户暴露规则）

| 因子 | 数据来源 | 计分 |
|---|---|---|
| 黄黑道 | `getDayTianShenLuck()` | 吉 +3 / 凶 −3 |
| 建除十二神 | `getZhiXing()` | 成 +2、开 +2、除 +1、定 +1、危 −1、破 −2、闭 −2，其余（建/满/平/收/执）0 |
| 二十八宿 | `getXiuLuck()` | 吉 +1 / 凶 −1 |

分数降序；同分按日期升序（近者优先）。UI 只传达"排在前面的日子更讲究"，不展示分数。

### 6.3 候选日卡片

**主行**：公历日期 + **星期几**（如"2026年8月15日 · 周六"）· 农历日期 · 日柱干支 · 黄黑道标签 · 建除值星 · 冲煞（冲某生肖 + 煞方）· 关键吉神凶煞（前 3 项）。

**双层解读**：

- 通书体事实行："黄道吉日，金匮值日，宜嫁娶；冲马煞南。"
- 口语体提示行："这天很适合办事，记得属马的朋友避开就好。"

两层均由模板拼接（结构化属性驱动），中英一一对应，零 LLM。

**展开区**：喜神/财神/福神方位 + 当日吉时 Top 3（遍历 12 时辰，`getTimeTianShenLuck` 吉且 `getTimeYi` 含所选事项者优先，取前 3，显示时辰名 + 时间区间 + 所宜摘要）。

**详解按钮**：触发 LLM 详解（第 8 节）。

### 6.4 空结果处理

过滤后无候选日：显示引导文案（"当前条件下暂无合适日子，可尝试放宽日期范围或关闭六害/三刑过滤"），不做自动放宽。

## 7. FAQ 与 JSON-LD

- 页面正文末尾内嵌 FAQ 段落：`<h2>` 问题 + `<p>` 答案，中英一一对应，各 4-5 条（如"择吉日为什么要避冲？""杨公忌日是什么？""黄道吉日是怎么定的？""这个工具的结果权威吗？"）。
- `src/seo/jsonld.ts` 新增 `faqJsonLd(lang, items)`：`@type: FAQPage` + `mainEntity`（Question/Answer 数组），文本经现有 `toJsonLdScript` 转义纪律（`<` → `\u003c`）。
- FAQ 数据挂 `registry.ts` 的 `PageEntry.faq?: Record<Lang, { question: string; answer: string }[]>`；`render.ts` 在 zeji 页 head 中于默认 `pageJsonLd`（WebPage）之外并列注入 FAQPage JSON-LD。
- 上线后用 Google Rich Results Test 验证。

## 8. LLM 详解端点

`POST /api/zeji/interpret`，严格复刻 bazi/liuyao 路由模式：限流（复用 `RateLimiter`）→ 校验 → 组提示词 → `callLlm` → Markdown 返回。

**请求体**（`src/zeji/types.ts`）：

```ts
interface ZejiInterpretRequest {
  lang: "zh" | "en";
  matter: string;               // 事项中文原词
  candidate: {
    solar: string;              // YYYY-MM-DD
    lunar: string;              // 农历描述
    dayGanZhi: string;          // 日柱，如"甲子"
    zhiXing: string;            // 建除值星
    tianShenLuck: "吉" | "凶";
    xiu: string;                // 二十八宿名
    jiShen: string[];           // 吉神
    xiongSha: string[];         // 凶煞
    chongShengXiao: string;     // 冲生肖
    shaDirection: string;       // 煞方
  };
  persons: Array<{
    yearBranch?: string;        // 生肖模式：年支（生肖），如"午"
    pillars?: { year: string; month: string; day: string; hour: string }; // 八字模式：完整四柱
  }>;
}
```

生肖模式只传 `yearBranch`；八字模式传 `pillars`（`yearBranch` 可由年支推导，前端两处都传以简化后端）。两者皆空的人不会出现在数组中。

**校验**（`validate.ts`）：字段白名单；干支格式正则 `^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$`（`yearBranch` 用单支正则 `^[子丑寅卯辰巳午未申酉戌亥]$`）；**每柱阴阳相配**；`persons` 上限 2；总长度上限（防 `payload_too_large`）。**后端不重算历法**。

**错误码族**：`invalid_request` / `rate_limited` / `not_configured` / `upstream_error` / `upstream_timeout` / `payload_too_large` / `invalid_json`，响应形状 `{ ok: false, error: { code, message } }`，不回显未截断用户输入。

**提示词**（`prompt.ts`）：结合事项 + 候选日属性输出一两百字解读；有八字时附五行契合参考；强制措辞约束"仅供参考、流派有分歧"；zh/en 两套指令；不出现"AI/LLM"字样。

**前端交互**：卡片"详解"按钮 → 按钮级 loading/错误态 → marked + DOMPurify 渲染 Markdown。

## 9. 版本统一（1.7.7）

- `bazi.zh.html` / `bazi.en.html` CDN 主源 + 回退源改 1.7.7（已验证宜忌/干支/冲生肖一致，八字排盘不受影响）。
- zeji 页同样 1.7.7 主源 + 回退源。
- 回退源 staticfile.org 若无 1.7.7，实现期换 jsdelivr 兜底。
- **marked / DOMPurify 沿用全站现有版本**：`marked@12.0.2`、`dompurify@3.1.6`（八字页、六爻页已使用的版本，zeji 页不引新版本）。

## 10. 全站报错文案：天师口吻

择吉 + 八字 + 六爻三页的前端报错/状态文案统一为天师人格化措辞（沿用去 AI 化原则，不出现"AI/LLM/服务器"字样），中英一一对应：

| 场景/错误码 | 中文 | 英文 |
|---|---|---|
| `rate_limited` | 问卦的人有点多，天师正在逐一回复，请稍等片刻再来 | The Master is attending to many visitors — please return in a few moments. |
| `upstream_timeout` | 天师凝神推演超时了，请再试一次 | The Master's reading ran long — please try again. |
| `upstream_error` / `not_configured` | 天师暂时没空，稍后再来问问吧 | The Master is unavailable right now — please check back later. |
| `invalid_request` | 卦帖写得不太对，请核对后再递上来 | Something in your request looks off — please double-check and try again. |
| CDN 加载失败 | 历书没能送达，请刷新页面或检查网络 | The almanac failed to load — please refresh or check your connection. |

八字页/六爻页现有 i18n 文案字典同步替换，相关测试断言同步更新。

## 11. 错误处理（前端汇总）

| 场景 | 处理 |
|---|---|
| CDN 主源失败 | `onerror` 切回退源；双失败时工具区显示第 10 节文案，表单可见但查询按钮禁用 |
| 生日非法 | 行内红字提示（八字页同款往返校验），不弹框、不阻断 |
| 扫描结果为空 | 引导文案（6.4），按钮态复位 |
| LLM 详解失败 | 卡片内按钮级错误态，按第 10 节映射，不暴露技术细节 |

## 12. 测试策略

后端可测部分 TDD（vitest-pool-workers）：

- `zeji-validate.test.ts`：干支格式、阴阳相配、persons 上限、必填/选填边界、payload 上限
- `zeji-prompt.test.ts`：zh/en 双语、有/无八字、空 persons、措辞约束关键词
- `zeji-api.test.ts`：`SELF.fetch` + fetchMock 拦上游——200 形状、各错误码、限流
- `jsonld.test.ts` 扩展：`faqJsonLd` 的 `mainEntity` 结构 + 转义
- `registry.test.ts` / `render.test.ts` 扩展：zeji 进导航、双语路由 301、FAQPage JSON-LD 并列注入
- `integration.test.ts` 扩展：zeji 页面 200 + head 断言（`SITE_ORIGIN` 常量，不硬编码域名）

前端纯浏览器逻辑（scan/filter/score/查表）不在 vitest 运行时内（与 bazi.js/liuyao.js 现状一致）：实现期用 `npm run almanac` 交叉核对关键日（月破日、杨公忌日、某日排序），六冲/六害/三刑查表逐条对照断言式自查 + 浏览器实测。

## 13. 不做的事（明确排除）

- 周末过滤（已改为卡片显示星期几）
- 五行喜用择日、事项专属规则（行嫁月、红纱日等）——留给 LLM 参考解读措辞，不进确定性代码
- 自刑过滤
- 分享图片/Canvas 渲染
- 结果持久化/账号（无状态工具）
- 空结果自动放宽条件

## 14. 交付顺序

单次 PR 全量交付：版本统一（bazi CDN → 1.7.7）→ registry/内容片段/导航 → zeji.js → LLM 端点 → FAQ/JSON-LD → 全站文案统一 → 测试全绿后 push 自动部署 → 部署后 Google Rich Results Test 验证 FAQ 富结果。
