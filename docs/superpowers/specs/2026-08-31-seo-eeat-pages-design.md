# SEO EEAT 信任基建：About 页与方法论页设计

日期：2026-08-31
状态：已确认（范围经用户两次收窄，见「决策记录」）

## 背景与问题

站点技术 SEO 已完备（hreflang / canonical / sitemap alternates / WebSite·WebPage·Article·BreadcrumbList·FAQPage·CollectionPage 六类 JSON-LD），但从 EEAT（经验·专业·权威·可信）视角存在明显缺口：

- footer「关于」栏只有首页一个链接，无 About 页；
- 全站无方法论/来源说明页：各工具 FAQ 反复声称「基于传统文献整理」，但无处可考；
- 签文版本考据（`docs/qian-data-sources/`）只存在于仓库内部，未公开；
- 命理/占卜属 YMYL 边缘领域，搜索引擎对信任信号的要求高于普通站点。

用户对站点的 SEO 判断：两大问题为**素材**与 **EEAT**。

## 决策记录（对话结论）

| 议题 | 决策 |
|---|---|
| 「素材」含义 | 多媒体素材（非信息型文章） |
| 博客配图（daily 每日文章，新/旧） | **不做**（用户明确否决，含 og:image 联动） |
| AI 生成图集（12 生肖 + 24 节气） | 不做（随博客配图一并移出） |
| SVG 工具页示意图 | 设计已确认，**实施延后**——用户需逐张目检视觉，单独成期触发，不在本 spec 范围 |
| EEAT 署名主体（机构/虚拟人设/真人） | 跳过，不做任何署名体系 |
| 联系方式页、Organization JSON-LD、图片 sitemap | 不做 |
| EEAT 本轮范围 | **About 页 + 方法论/来源页 + footer「关于」栏接入**，仅此三项 |

## 页面设计

两页均走固定页面两步流程：`src/content/` 加 `<slug>.zh.html` + `<slug>.en.html` → `registry.ts` 的 `PAGES` 加一条 `PageEntry`。SEO、sitemap、语言切换自动派生，不手写任何 meta。均 `inNav: false`（不进顶部导航，经 footer 进入）。

### About 页（slug: `about`）

内容四块：

1. **站点定位**——玄命阁是什么：以传统术数为本的双语工具与内容站；四类工具（命理排盘/占卜起卦/择吉/灵签）与四个运势栏目（每日宜忌/每周/每月/时辰推演）一览；
2. **内容生产方式**——排盘计算由传统历法规则引擎自动完成；解读文案依传统文献整理成文，经编校后发布；每日/每周/每月/时辰推演的更新节奏；
3. **文化定位与边界**——传统术数是文化框架，提供参考视角，不构成医疗、投资、婚恋等重大决策建议；
4. **核实入口**——内链方法论页与各工具页。

措辞红线（全站既有规范）：正文不出现「AI」字样；生产方式只写「依传统文献整理成文、经编校后发布」——既不提生成方式，也**不改称人工撰写**。

### 方法论/来源页（slug: `methodology`）

内容五块，全部来自仓库既有事实，不做新考据：

1. **历法与排盘引擎**——干支历计算、紫微安星所用开源引擎与版本（lunar-javascript 1.7.7、iztro 2.6.0）；六爻/梅花/小六壬为前端自实现规则；
2. **运势评分规则**——周运评分 = 逐日六合/三合计数 − 冲/害计数，排序取特吉/次吉/忠告；注明评分口径已回测复现黄大仙祠公开周排名，加权方案已否决；
3. **择吉规则集**——黄黑道十二神 + 建除十二神 + 二十八宿三项综合，避六冲，排除杨公忌与月破；明示「传统择吉流派众多、规则互有矛盾，本站采用一套公开透明的规则集」；
4. **签文版本考据**——以 `docs/qian-data-sources/` 的结论为基础**改写公开**（黄大仙/观音/月老三签种的通行版本与异文取舍），不照搬内部文档原文；
5. **参考文献清单**——所依典籍与文献（如《协纪辨方书》《玉匣记》《续玄怪录》等，以实际引用为准）。

两页双语对称，中英一一对应；方法论页内链各工具页，顺带增强内链结构。

### footer 接入

`layout/footer.ts` 的「关于」栏（现状仅首页）改为三项：首页 + 关于 + 方法论。顶部导航不动。

## 测试计划

- `test/registry.test.ts`：about / methodology 各加双语用例（title 非空、双语 meta 对称）；
- `test/integration.test.ts`：`/zh/about/`、`/en/about/`、`/zh/methodology/`、`/en/methodology/` 返回 200 且 title/canonical 基于 `SITE_ORIGIN` 断言；无尾斜杠 301；正文片段关键 heading 存在；
- footer 断言：两语言页脚均含关于/方法论链接；
- 文案红线断言：两页四种正文片段均不含「AI」（大小写敏感、词边界，避免误伤 said/daily 等含 "ai" 子串的词）。

视觉与文案质量由用户目检，不做快照测试。

## 明确不做（防顺手扩权）

- 署名/作者体系（含 JSON-LD author 变更——`articleJsonLd` 维持现状 Organization）；
- 博客配图与 AI 图集（新/旧文章均不配图，og:image 维持 og-default.png）；
- SVG 工具页示意图（延后独立成期）；
- 联系方式页、Organization JSON-LD / publisher 实体、图片 sitemap、固定页 OG 差异化。

## 后续（延后项，不在本 spec）

SVG 示意图清单（用户逐张目检后推进）：bazi 五行生克图 / liuyao 六爻卦象结构图 / meihua 本互变卦图 / xiaoliuren 六宫环形图 / ziwei 十二宫环形图 / hehun 地支关系盘。实现方式：内联 SVG 写入 content 片段，`<figure>` + `<figcaption>` 包裹，SVG 本体 `aria-hidden`，`style.css` 加 figure 布局类。
