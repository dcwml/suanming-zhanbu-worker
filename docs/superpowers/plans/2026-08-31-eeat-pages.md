# EEAT 信任基建（About 页 + 方法论页）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 About 页与方法论/来源页两个双语固定页面，并接入 footer「关于」栏，补齐站点 EEAT 信任缺口。

**Architecture:** 走仓库固定页面两步流程——content 片段（zh/en）+ `registry.ts` 的 `PAGES` 注册，SEO/sitemap/语言切换自动派生；footer.ts「关于」栏从单项首页链接扩为三项。无新模块、无路由改动、无布局层改动。

**Tech Stack:** Cloudflare Workers + Hono + TypeScript；vitest（@cloudflare/vitest-pool-workers，`SELF.fetch` 集成测试）。

**Spec:** `docs/superpowers/specs/2026-08-31-seo-eeat-pages-design.md`

## Global Constraints

- 双语对称：每个改动必须同时覆盖 zh 与 en，中英内容一一对应。
- 文案红线（spec 措辞边界）：页面可见文本禁出现「AI」字样；生产方式只写「依传统文献整理成文，经编校后发布」——不提生成方式、不改称人工撰写。
- URL 一律经 `pagePath(lang, slug)` 生成；测试断言基于 `SITE_ORIGIN` 常量，禁止硬编码域名。
- 内容片段是只有正文的受信 HTML（无 html/head/body），`<h1>` 自带、`<p class="lead">` 导语、`<section><h2>` 分节——对齐现有 `chouqian.zh.html` 风格；内链用 `/zh/xxx/`、`/en/xxx/` 带尾斜杠相对路径。
- 测试命令：`npx vitest run <files>`；全量 `npm test` + `npm run typecheck`。Windows 下测试结束出现 miniflare 临时目录 EBUSY 警告属无害噪音，不代表失败。
- 提交信息：conventional 前缀 + 英文短句（如 `feat(about): ...`）；每任务一提交。

---

### Task 1: About 页（内容 + 注册 + 测试）

**Files:**
- Create: `src/content/about.zh.html`
- Create: `src/content/about.en.html`
- Modify: `src/pages/registry.ts`（import 区 + `PAGES` 数组尾部）
- Test: `test/registry.test.ts`、`test/integration.test.ts`

**Interfaces:**
- Consumes: `PageEntry`（registry.ts 既有类型：slug/inNav/meta/content）、`findPage()`、`pagePath()`。
- Produces: `findPage("about")` 返回完整 PageEntry；页面路由 `/zh/about/`、`/en/about/`（经 registry 自动生效，Task 3 的 footer 依赖 slug `about` 存在）。

- [ ] **Step 1: 写失败测试（registry + integration + 红线断言）**

`test/registry.test.ts` 末尾（`});` 之前）追加：

```ts
  it("about page exists, out of flat nav, entered via footer", () => {
    const about = findPage("about");
    expect(about).toBeDefined();
    // 经 footer「关于」栏进入（见 layout/footer.ts），不在顶部导航
    expect(about!.inNav).toBe(false);
  });

  it("about copy never mentions AI", () => {
    const about = findPage("about");
    expect(about).toBeDefined();
    for (const lang of ["zh", "en"] as const) {
      expect(about!.content[lang], `about/${lang}`).not.toMatch(/\bAI\b/);
    }
  });
```

`test/integration.test.ts` 末尾追加 describe 块：

```ts
describe("about page", () => {
  it("renders zh about with canonical head and key sections", async () => {
    const res = await fetchNoFollow("/zh/about/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/zh/about/">`);
    expect(html).toContain("关于玄命阁");
    expect(html).toContain("玄命阁是什么");
    expect(html).toContain("内容怎么来");
    expect(html).toContain("文化定位");
    expect(html).toContain("如何核实");
  });

  it("renders en about with canonical head and key sections", async () => {
    const res = await fetchNoFollow("/en/about/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/en/about/">`);
    expect(html).toContain("About Xuanming Pavilion");
    expect(html).toContain("How content is produced");
    expect(html).toContain("Cultural framing");
  });

  it("redirects /zh/about to trailing slash", async () => {
    const res = await fetchNoFollow("/zh/about");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/zh/about/");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/registry.test.ts test/integration.test.ts`
Expected: FAIL——`findPage("about")` 为 undefined；integration 三个用例 404/断言失败。

- [ ] **Step 3: 写 `src/content/about.zh.html`（完整内容如下）**

```html
<h1>关于玄命阁</h1>
<p class="lead">玄命阁是一个以传统术数为本的双语网站：一边提供排盘、起卦、择吉、求签的在线工具，一边按日、周、月持续更新运势与历法内容，为你详解，细说分明。</p>

<section>
  <h2>玄命阁是什么</h2>
  <p>本站提供两类内容：</p>
  <ul>
    <li>四类在线工具：命理排盘（<a href="/zh/bazi/">八字排盘</a>、<a href="/zh/ziwei/">紫微斗数</a>、<a href="/zh/hehun/">八字合婚</a>）、占卜起卦（<a href="/zh/liuyao/">六爻起卦</a>、<a href="/zh/meihua/">梅花易数</a>、<a href="/zh/xiaoliuren/">小六壬</a>）、<a href="/zh/zeji/">择吉日</a>与<a href="/zh/chouqian/">灵签抽签</a>；</li>
    <li>四个运势栏目：<a href="/zh/daily/">每日宜忌</a>、<a href="/zh/weekly/">每周运势</a>、<a href="/zh/monthly/">每月运势</a>与<a href="/zh/tuiyan/">时辰推演</a>。</li>
  </ul>
</section>

<section>
  <h2>内容怎么来</h2>
  <p>所有排盘与历法数据——干支四柱、节气、神煞、宜忌——由基于传统历法的规则引擎计算得出；解读文案依传统文献整理成文，经编校后发布。更新节奏：每日宜忌每天更新；每周运势覆盖下周一至周日，每周日发布；每月运势覆盖下月，每月最后一日发布；时辰推演按农历月更新。</p>
</section>

<section>
  <h2>文化定位</h2>
  <p>传统术数是流传千年的文化框架，本站内容侧重文化推演，仅供参考：健康之事请询专业医师，投资之事请咨询持牌顾问，婚恋等人生大事请结合现实情况综合判断。</p>
</section>

<section>
  <h2>如何核实</h2>
  <p>各工具的计算依据与文献来源在<a href="/zh/methodology/">数据与方法</a>页逐项公开，欢迎查证。</p>
</section>
```

- [ ] **Step 4: 写 `src/content/about.en.html`（完整内容如下，与中文一一对应）**

```html
<h1>About Xuanming Pavilion</h1>
<p class="lead">Xuanming Pavilion is a bilingual site rooted in traditional Chinese divination: online tools for charting, casting, date selection and oracle sticks on one side, and daily, weekly and monthly fortune and calendar content on the other — with in-depth readings, explained clearly.</p>

<section>
  <h2>What this site is</h2>
  <p>The site offers two kinds of content:</p>
  <ul>
    <li>Four families of online tools: destiny charting (<a href="/en/bazi/">BaZi</a>, <a href="/en/ziwei/">Zi Wei Dou Shu</a>, <a href="/en/hehun/">marriage matching</a>), divination casting (<a href="/en/liuyao/">I Ching</a>, <a href="/en/meihua/">Plum Blossom</a>, <a href="/en/xiaoliuren/">Xiao Liu Ren</a>), <a href="/en/zeji/">auspicious date selection</a> and <a href="/en/chouqian/">oracle sticks</a>;</li>
    <li>Four fortune columns: <a href="/en/daily/">daily almanac</a>, <a href="/en/weekly/">weekly horoscope</a>, <a href="/en/monthly/">monthly horoscope</a> and <a href="/en/tuiyan/">hour omens</a>.</li>
  </ul>
</section>

<section>
  <h2>How content is produced</h2>
  <p>All chart casting and calendar data — stems and branches, solar terms, spirits and auspiciousness — are computed by a rules engine built on the traditional calendar. Reading texts are compiled from traditional literature, then edited and reviewed before publishing. The rhythm: the daily almanac updates every day; the weekly horoscope, covering Monday through Sunday, is published each Sunday; the monthly horoscope is published on the last day of the preceding month; hour omens follow the lunar month.</p>
</section>

<section>
  <h2>Cultural framing</h2>
  <p>Traditional divination is a cultural framework passed down over millennia. Everything on this site is cultural reasoning offered for reference: for health, consult qualified physicians; for investments, consult licensed advisors; for marriage and other major decisions, weigh your own circumstances.</p>
</section>

<section>
  <h2>How to verify</h2>
  <p>The computation basis and source references behind each tool are laid out openly on the <a href="/en/methodology/">Methods &amp; Sources</a> page.</p>
</section>
```

注意：`href="/zh/methodology/"`、`/en/methodology/` 在 Task 2 前指向 404——属预期（Task 2 完成后即通），两任务连续执行无需单独处理。

- [ ] **Step 5: registry.ts 注册**

import 区（`notfoundEn` 之后）加：

```ts
import aboutZh from "../content/about.zh.html";
import aboutEn from "../content/about.en.html";
```

`PAGES` 数组尾部（yuelao 条目之后、`];` 之前）加：

```ts
  {
    slug: "about",
    // 经 footer「关于」栏进入（见 layout/footer.ts），不在顶部导航
    inNav: false,
    meta: {
      zh: { title: "关于玄命阁", description: "玄命阁是什么：站点定位、内容生产方式、更新节奏与文化边界，细说分明。" },
      en: { title: "About Us", description: "What Xuanming Pavilion is — our mission, how content is produced and updated, and the cultural framing behind every reading." },
    },
    content: { zh: aboutZh, en: aboutEn },
  },
```

- [ ] **Step 6: 跑测试确认通过**

Run: `npx vitest run test/registry.test.ts test/integration.test.ts`
Expected: PASS（全部用例，含既有用例）。

- [ ] **Step 7: typecheck**

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 8: Commit**

```bash
git add src/content/about.zh.html src/content/about.en.html src/pages/registry.ts test/registry.test.ts test/integration.test.ts
git commit -m "feat(about): add bilingual about page for EEAT trust"
```

---

### Task 2: 方法论/来源页（内容 + 注册 + 测试）

**Files:**
- Create: `src/content/methodology.zh.html`
- Create: `src/content/methodology.en.html`
- Modify: `src/pages/registry.ts`（import 区 + `PAGES` 数组尾部）
- Test: `test/registry.test.ts`、`test/integration.test.ts`

**Interfaces:**
- Consumes: Task 1 的模式（PageEntry 注册流程）；about 页正文中已有的 `/zh/methodology/`、`/en/methodology/` 内链等本任务落地。
- Produces: `findPage("methodology")`；路由 `/zh/methodology/`、`/en/methodology/`（Task 3 footer 依赖）。

- [ ] **Step 1: 写失败测试**

`test/registry.test.ts` 追加：

```ts
  it("methodology page exists, out of flat nav", () => {
    const methodology = findPage("methodology");
    expect(methodology).toBeDefined();
    // 经 footer「关于」栏进入（见 layout/footer.ts），不在顶部导航
    expect(methodology!.inNav).toBe(false);
  });
```

同时把 Task 1 的红线断言从单页扩为两页（替换原用例体）：

```ts
  it("about and methodology copy never mention AI", () => {
    for (const slug of ["about", "methodology"] as const) {
      const page = findPage(slug);
      expect(page, slug).toBeDefined();
      for (const lang of ["zh", "en"] as const) {
        expect(page!.content[lang], `${slug}/${lang}`).not.toMatch(/\bAI\b/);
      }
    }
  });
```

`test/integration.test.ts` 追加 describe 块：

```ts
describe("methodology page", () => {
  it("renders zh methodology with canonical head and key sections", async () => {
    const res = await fetchNoFollow("/zh/methodology/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/zh/methodology/">`);
    expect(html).toContain("数据与方法");
    expect(html).toContain("历法与排盘引擎");
    expect(html).toContain("运势评分规则");
    expect(html).toContain("择吉规则集");
    expect(html).toContain("签文版本考据");
    expect(html).toContain("参考文献");
  });

  it("renders en methodology with canonical head and key sections", async () => {
    const res = await fetchNoFollow("/en/methodology/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/en/methodology/">`);
    expect(html).toContain("Methods");
    expect(html).toContain("Calendar and chart engines");
    expect(html).toContain("Fortune scoring rules");
  });

  it("redirects /en/methodology to trailing slash", async () => {
    const res = await fetchNoFollow("/en/methodology");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/en/methodology/");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/registry.test.ts test/integration.test.ts`
Expected: FAIL——`findPage("methodology")` undefined；integration 三个用例 404。

- [ ] **Step 3: 写 `src/content/methodology.zh.html`（完整内容如下；事实来源：wrangler.jsonc/前端加载链（引擎版本）、src/fortune/rules.ts 与 AGENTS.md（评分规则）、zeji 页 FAQ（择吉规则）、docs/qian-data-sources/（考据原则，改写公开、不列采集 URL））**

```html
<h1>数据与方法</h1>
<p class="lead">本站每个工具怎么算、每篇内容依何而写，在此逐项公开：历法引擎、运势评分规则、择吉规则集、签文版本考据与参考文献。</p>

<section>
  <h2>历法与排盘引擎</h2>
  <p>干支历计算（四柱干支、节气、神煞、宜忌）基于开源历法引擎 lunar-javascript 1.7.7；紫微斗数安星基于开源引擎 iztro 2.6.0。两者均遵循传统历法与安星规则，版本在此明示。六爻起卦、梅花易数与小六壬起课为本站依传统规则自行实现，起卦逻辑在页面上完整可见。</p>
</section>

<section>
  <h2>运势评分规则</h2>
  <p>每周运势的生肖排名按「逐日关系计数」：一周内某生肖与当日地支形成六合或三合的天数计吉，相冲或相害的天数计凶，吉减凶得评分，从高到低排序——前三为特吉、次三为次吉、最低者为忠告生肖。此口径经与香港黄大仙祠公开的周运排名回测比对一致。</p>
</section>

<section>
  <h2>择吉规则集</h2>
  <p>择吉日工具综合三项传统指标：黄黑道十二神（黄道为吉、黑道为凶）、建除十二神与二十八宿，再排除与所用生肖相冲之日、月破日与杨公忌日，按整体吉凶排序输出。传统择吉流派众多、规则互有出入，本站采用这一套公开透明的规则集，而非某一门派秘传。</p>
</section>

<section>
  <h2>签文版本考据</h2>
  <p>黄大仙、观音、月老三种灵签各一百签。签诗、签题与等级以主流通行版本为准，经多来源交叉核对：存疑之处依多数来源定稿，疑难字取正字，异文取舍逐条记录在案。各签种的等级分布以核对后的数据为准，如黄大仙灵签为上上三签、上吉十签、中吉三十二签、中平三十七签、下下十八签。</p>
</section>

<section>
  <h2>参考文献</h2>
  <ul>
    <li>《协纪辨方书》（清代官修）——神煞、宜忌与择吉规则的主要文献依据；</li>
    <li>《玉匣记》——民间择吉与吉神凶煞的传统参照；</li>
    <li>《续玄怪录·定婚店》（唐·李复言）——月下老人掌姻缘传说的文献出处；</li>
    <li>《周易》及历代易注——六爻与梅花易数卦爻推演的依据。</li>
  </ul>
  <p>解读文案以上述传统文献与当代通行整理本为基础整理成文，经编校后发布。</p>
</section>
```

- [ ] **Step 4: 写 `src/content/methodology.en.html`（完整内容如下，与中文一一对应）**

```html
<h1>Methods &amp; Sources</h1>
<p class="lead">How every tool on this site computes, and what every text draws on — laid out item by item: calendar engine, fortune scoring rules, date-selection rule set, oracle text collation and references.</p>

<section>
  <h2>Calendar and chart engines</h2>
  <p>Stem-branch calendar computation (four pillars, solar terms, spirits, auspiciousness) runs on the open-source lunar-javascript 1.7.7; Zi Wei Dou Shu star placement runs on the open-source iztro 2.6.0. Both follow traditional calendar and star-placement rules, with versions stated here. I Ching casting, Plum Blossom Numerology and Xiao Liu Ren are implemented by this site following traditional rules, with the casting logic fully visible on each page.</p>
</section>

<section>
  <h2>Fortune scoring rules</h2>
  <p>The weekly zodiac ranking counts day-by-day relations: for each sign, days forming a six-harmony or three-harmony with the day branch count as favorable, while clash and harm days count as unfavorable; the net score sorts the field — top three as luckiest, next three as favorable, lowest as the cautioned sign. This method reproduces the publicly posted weekly rankings of Hong Kong's Wong Tai Sin Temple on backtesting.</p>
</section>

<section>
  <h2>Date-selection rule set</h2>
  <p>The auspicious date finder weighs three traditional indicators — the twelve celestial officers (Yellow Road versus Black Road), the twelve day officers and the 28 lunar mansions — then excludes days clashing with your zodiac, Month-Broken days and Yang Gong taboo days, ranking the remainder. Traditional date-selection schools disagree with one another; this site applies one open, transparent rule set rather than any school's private tradition.</p>
</section>

<section>
  <h2>Oracle text collation</h2>
  <p>The Wong Tai Sin, Guanyin and Yue Lao oracles carry one hundred sticks each. Poems, titles and grades follow the widely circulated mainstream versions, cross-checked against multiple sources: doubtful entries follow the majority, obscure characters are set to standard forms, and every variant choice is kept on record. Grade distributions follow the verified data — the Wong Tai Sin set, for instance, holds three Supremely Auspicious, ten Very Auspicious, thirty-two Auspicious, thirty-seven Neutral and eighteen Very Inauspicious sticks.</p>
</section>

<section>
  <h2>References</h2>
  <ul>
    <li>Xie Ji Bian Fang Shu (Qing imperial compendium) — principal source for spirits, auspiciousness and date selection;</li>
    <li>Jade Box Records (Yu Xia Ji) — traditional folk reference for auspicious days and spirits;</li>
    <li>Xu Xuan Guai Lu, "The Inn of Fixed Marriages" (Tang dynasty, Li Fuyan) — literary origin of the Old Man Under the Moon;</li>
    <li>The Zhouyi (I Ching) and its commentaries — basis for hexagram reasoning in I Ching casting and Plum Blossom Numerology.</li>
  </ul>
  <p>Reading texts are compiled from the traditional literature above and current standard editions, then edited before publishing.</p>
</section>
```

- [ ] **Step 5: registry.ts 注册**

import 区（`aboutEn` 之后）加：

```ts
import methodologyZh from "../content/methodology.zh.html";
import methodologyEn from "../content/methodology.en.html";
```

`PAGES` 数组尾部（about 条目之后）加：

```ts
  {
    slug: "methodology",
    // 经 footer「关于」栏进入（见 layout/footer.ts），不在顶部导航
    inNav: false,
    meta: {
      zh: { title: "数据与方法", description: "本站各工具的计算依据与文献来源：历法引擎、运势评分规则、择吉规则集、签文版本考据，公开透明。" },
      en: { title: "Methods & Sources", description: "How this site computes — calendar engine, fortune scoring, date-selection rules and oracle text collation, with source references." },
    },
    content: { zh: methodologyZh, en: methodologyEn },
  },
```

- [ ] **Step 6: 跑测试确认通过**

Run: `npx vitest run test/registry.test.ts test/integration.test.ts`
Expected: PASS。

- [ ] **Step 7: typecheck**

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 8: Commit**

```bash
git add src/content/methodology.zh.html src/content/methodology.en.html src/pages/registry.ts test/registry.test.ts test/integration.test.ts
git commit -m "feat(methodology): add bilingual methods and sources page"
```

---

### Task 3: footer「关于」栏接入 + 全量验证

**Files:**
- Modify: `src/layout/footer.ts:29`（`homeLink` 定义处）与「关于」栏 nav 块
- Test: `test/integration.test.ts`

**Interfaces:**
- Consumes: `findPage(slug)`（registry）、`pagePath(lang, slug)`——footer.ts 既有 `title()` 辅助函数直接可用；依赖 Task 1/2 已注册的 `about`、`methodology` slug。
- Produces: 两语言页脚「关于」栏三项链接（首页/关于/方法论）。无后续任务依赖。

- [ ] **Step 1: 写失败测试**

`test/integration.test.ts` 末尾追加：

```ts
describe("footer about column", () => {
  it("zh footer carries home, about and methodology links", async () => {
    const res = await fetchNoFollow("/zh/");
    const html = await res.text();
    expect(html).toContain('aria-label="关于"');
    expect(html).toContain('href="/zh/about/"');
    expect(html).toContain('href="/zh/methodology/"');
  });

  it("en footer carries home, about and methodology links", async () => {
    const res = await fetchNoFollow("/en/");
    const html = await res.text();
    expect(html).toContain('aria-label="About"');
    expect(html).toContain('href="/en/about/"');
    expect(html).toContain('href="/en/methodology/"');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run test/integration.test.ts`
Expected: FAIL——`href="/zh/about/"` 不存在（关于栏尚无此链接）。

- [ ] **Step 3: 改 footer.ts**

将第 29 行的 homeLink 定义：

```ts
  const homeLink = `<a href="${pagePath(lang, "")}">${title("")}</a>`;
```

替换为（链接标题仍取 registry 单一来源，与工具列写法一致）：

```ts
  const aboutLinks = ["", "about", "methodology"]
    .map((slug) => `<a href="${pagePath(lang, slug)}">${title(slug)}</a>`)
    .join("\n          ");
```

「关于」栏 nav 块中 `${homeLink}` 改为 `${aboutLinks}`。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run test/integration.test.ts`
Expected: PASS（含既有 footer 用例——`render.test.ts` 若因 homeLink 移除断言失败，一并修正其断言而非回退实现；预期不受影响，因其断言的是 footer-main/footer-bottom 类名与文案）。

- [ ] **Step 5: 全量验证**

Run: `npm test`
Expected: 全部 PASS（EBUSY 警告无害）。

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 6: Commit**

```bash
git add src/layout/footer.ts test/integration.test.ts
git commit -m "feat(footer): link about and methodology in the about column"
```

---

## Self-Review 结论

- **Spec 覆盖**：About 页四块（Task 1）、方法论页五块（Task 2）、footer 接入（Task 3）、红线断言（Task 1/2）、双语对称（各任务）、「明确不做」清单未引入任何对应改动——全覆盖。
- **占位符**：无 TBD/TODO；四份 HTML 与全部测试代码完整给出。
- **类型一致性**：slug `about`/`methodology`、`findPage`/`pagePath`/`title()` 签名在各任务间一致；Task 1 红线断言数组在 Task 2 扩展为两页（已写明替换）。
- **已知衔接点**：Task 1 的 about 正文内链 `/zh/methodology/` 在 Task 2 前暂为 404，两任务连续执行即闭合，无需处理。
