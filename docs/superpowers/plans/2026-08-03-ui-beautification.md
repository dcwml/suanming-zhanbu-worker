# 全站视觉美化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 传统中式典雅方向美化全站——header 加印章 LOGO 品牌位、footer 改深墨多栏式、首页新增特色优势/使用流程/用户评价/横幅 CTA 四个模板板块，中英双语对称。

**Architecture:** 纯 SSR HTML + CSS，零 JS 依赖。LOGO 由 ImageGen 生成（`public/assets/logo.png`），header/footer/首页共用。样式集中在 `public/assets/style.css`：先升级 `:root` 变量与全局细节，再重写 header/footer 样式、追加首页板块样式。文案双语对称改写 `home.zh.html` / `home.en.html`。

**Tech Stack:** Hono SSR（HTML 片段经 wrangler Text rules 导入）、纯 CSS、Vitest + @cloudflare/vitest-pool-workers、ImageGen（LOGO）

**Spec:** `docs/superpowers/specs/2026-08-03-ui-beautification-design.md`

---

## File Structure

| 文件 | 职责 | 操作 |
|---|---|---|
| `public/assets/logo.png` | 印章 LOGO（header/footer/favicon 共用） | Create（ImageGen） |
| `test/render.test.ts` | nav 品牌块、footer 多栏、favicon 断言 | Modify |
| `test/meta.test.ts` | buildHead/buildPlainHead favicon 断言 | Modify |
| `test/integration.test.ts` | 首页 4 个新板块 class 钩子断言（双语） | Modify |
| `src/layout/nav.ts` | 加 site-brand 品牌块 | Modify |
| `src/layout/footer.ts` | 重写多栏式 | Rewrite |
| `src/seo/meta.ts` | 两个 head 函数各加 favicon link | Modify |
| `src/content/home.zh.html` | 7 板块中文首页 | Rewrite |
| `src/content/home.en.html` | 7 板块英文首页 | Rewrite |
| `public/assets/style.css` | 视觉系统升级 | Modify |

---

### Task 1: 生成印章 LOGO

**Files:**
- Create: `public/assets/logo.png`

- [ ] **Step 1: ImageGen 生成 LOGO**

工具：ImageGen，参数：
- name: `xuanming-seal-logo`
- size: `1024x1024`
- prompt: `Traditional Chinese seal stamp (yin zhang) design, square cinnabar red background (#8a3324), single white Chinese character "玄" carved in ancient seal script (zhuan shu) style at center, white-on-red baiwen carving, subtle aged stone texture with slightly worn edges, minimalist, flat design, no other text, no border frame, centered composition`

- [ ] **Step 2: 复制到 assets 目录**

Run: `Copy-Item "<ImageGen 返回路径>" "public/assets/logo.png"`
Verify: 文件存在且为有效 PNG（用 Read 工具查看图像确认质量；若文字错误或风格偏离，调整 prompt 重新生成）。

---

### Task 2: header/footer/favicon 测试（TDD 红灯）

**Files:**
- Modify: `test/render.test.ts`
- Modify: `test/meta.test.ts`

- [ ] **Step 1: render.test.ts 新增断言**

在 `describe("renderPage", ...)` 块内、`"renders language switch..."` 测试之后插入 3 个测试：

```ts
  it("renders brand link with seal logo pointing to language home", () => {
    expect(html).toContain('class="site-brand" href="/zh/"');
    expect(html).toContain('class="brand-logo" src="/assets/logo.png" alt="玄命阁"');
    expect(enHtml).toContain('class="site-brand" href="/en/"');
    expect(enHtml).toContain('alt="Xuanming Pavilion"');
  });

  it("renders multi-column footer with brand, links and disclaimer", () => {
    expect(html).toContain('class="footer-main"');
    expect(html).toContain('class="footer-bottom"');
    expect(html).toContain("命理 · 占卜 · 传统文化");
    expect(html).toContain("内容仅供娱乐参考");
    expect(enHtml).toContain("Fortune · Divination · Tradition");
    expect(enHtml).toContain("For entertainment purposes only");
  });

  it("links favicon to the seal logo", () => {
    expect(html).toContain('<link rel="icon" type="image/png" href="/assets/logo.png">');
  });
```

注意：`html` 变量是 `renderPage(findPage("")!, "zh")`（首页），`enHtml` 是 `renderPage(findPage("sample")!, "en")`——两者都已存在于测试文件顶部，直接可用。

- [ ] **Step 2: meta.test.ts 新增 favicon 断言**

在 `describe("buildHead", ...)` 块末尾（`"home uses website og:type..."` 之后）插入：

```ts
  it("emits favicon link", () => {
    expect(head).toContain('<link rel="icon" type="image/png" href="/assets/logo.png">');
  });
```

在 `describe("buildPlainHead", ...)` 的测试中追加一行断言（404/500 也应有 favicon）：

```ts
    expect(head).toContain('<link rel="icon" type="image/png" href="/assets/logo.png">');
```

- [ ] **Step 3: 运行测试，确认失败**

Run: `npx vitest run test/render.test.ts test/meta.test.ts`
Expected: 新增 4 处断言 FAIL（site-brand/footer-main/favicon 均不存在），旧断言全部 PASS。

---

### Task 3: nav.ts 品牌块（TDD 绿灯 1/3）

**Files:**
- Modify: `src/layout/nav.ts`

- [ ] **Step 1: 全文替换 nav.ts**

```ts
import { OTHER_LANG, SITE_NAME, SITE_NAME_EN, pagePath, type Lang } from "../config/site";
import { navPages } from "../pages/registry";
import { escapeHtml } from "../seo/meta";

/** langSwitchSlug 缺省时语言切换指向当前页的另一语言版本；
 *  404/500 等无真实页面的场景应显式传 "" 指向对方语言首页。 */
export function renderNav(lang: Lang, currentSlug: string, langSwitchSlug?: string): string {
  const links = navPages()
    .map((p) => {
      const active = p.slug === currentSlug ? ' class="active" aria-current="page"' : "";
      return `<a href="${pagePath(lang, p.slug)}"${active}>${escapeHtml(p.meta[lang].title)}</a>`;
    })
    .join("\n        ");

  const other = OTHER_LANG[lang];
  const switchLabel = other === "en" ? "English" : "中文";
  const siteName = lang === "zh" ? SITE_NAME : SITE_NAME_EN;

  return `<nav class="site-nav" aria-label="${lang === "zh" ? "主导航" : "Main navigation"}">
      <a class="site-brand" href="${pagePath(lang, "")}">
        <img class="brand-logo" src="/assets/logo.png" alt="${escapeHtml(siteName)}" width="36" height="36">
        <span class="brand-name">${escapeHtml(siteName)}</span>
      </a>
      <div class="nav-links">
        ${links}
      </div>
      <a class="lang-switch" href="${pagePath(other, langSwitchSlug ?? currentSlug)}">${switchLabel}</a>
    </nav>`;
}
```

要点：`site-brand` 链接经 `pagePath(lang, "")` 生成（URL 纪律）；站名过 `escapeHtml`；`class="brand-logo"` 在 `src` 与 `alt` 之前（测试断言的属性顺序）。

- [ ] **Step 2: 运行 render.test.ts，确认品牌断言转绿**

Run: `npx vitest run test/render.test.ts`
Expected: `"renders brand link..."` PASS；footer/favicon 断言仍 FAIL（后续任务解决）。

---

### Task 4: footer.ts 多栏重写（TDD 绿灯 2/3）

**Files:**
- Rewrite: `src/layout/footer.ts`

- [ ] **Step 1: 全文替换 footer.ts**

```ts
import { SITE_NAME, SITE_NAME_EN, SITE_SLOGAN, SITE_SLOGAN_EN, pagePath, type Lang } from "../config/site";
import { findPage } from "../pages/registry";
import { escapeHtml } from "../seo/meta";

export function renderFooter(lang: Lang): string {
  const name = lang === "zh" ? SITE_NAME : SITE_NAME_EN;
  const slogan = lang === "zh" ? SITE_SLOGAN : SITE_SLOGAN_EN;
  const note = lang === "zh" ? "内容仅供娱乐参考" : "For entertainment purposes only";
  const desc =
    lang === "zh"
      ? "以传统术数与 AI 解读，在线提供八字排盘与六爻起卦。"
      : "Traditional Chinese divination with AI readings — BaZi charts and I Ching casting online.";
  const toolsLabel = lang === "zh" ? "工具" : "Tools";
  const aboutLabel = lang === "zh" ? "关于" : "About";

  // 链接标题一律取 registry 单一来源，避免双语两处维护
  const title = (slug: string): string => escapeHtml(findPage(slug)!.meta[lang].title);
  const toolLinks = ["bazi", "liuyao"]
    .map((slug) => `<a href="${pagePath(lang, slug)}">${title(slug)}</a>`)
    .join("\n          ");
  const aboutLinks = ["", "sample"]
    .map((slug) => `<a href="${pagePath(lang, slug)}">${title(slug)}</a>`)
    .join("\n          ");

  return `<footer class="site-footer">
      <div class="footer-main">
        <div class="footer-brand">
          <img class="brand-logo" src="/assets/logo.png" alt="${escapeHtml(name)}" width="40" height="40">
          <p class="footer-name">${escapeHtml(name)}</p>
          <p class="footer-slogan">${escapeHtml(slogan)}</p>
          <p class="footer-desc">${escapeHtml(desc)}</p>
        </div>
        <nav class="footer-col" aria-label="${toolsLabel}">
          <h2>${toolsLabel}</h2>
          ${toolLinks}
        </nav>
        <nav class="footer-col" aria-label="${aboutLabel}">
          <h2>${aboutLabel}</h2>
          ${aboutLinks}
        </nav>
      </div>
      <div class="footer-bottom">
        <p>© ${new Date().getFullYear()} ${escapeHtml(name)} · ${escapeHtml(note)}</p>
      </div>
    </footer>`;
}
```

要点：工具列（bazi/liuyao）与关于列（首页/sample）的标题全部从 `findPage(slug)!.meta[lang].title` 派生（registry 单一来源）；这些 slug 必然存在，`!` 断言安全且被测试覆盖。

- [ ] **Step 2: 运行 render.test.ts，确认 footer 断言转绿**

Run: `npx vitest run test/render.test.ts`
Expected: `"renders multi-column footer..."` PASS；favicon 断言仍 FAIL。

---

### Task 5: meta.ts favicon（TDD 绿灯 3/3）

**Files:**
- Modify: `src/seo/meta.ts`

- [ ] **Step 1: buildHead 数组加 favicon**

在 `buildHead` 返回数组中、`<meta name="viewport" ...>` 之后插入一行：

```ts
    `<link rel="icon" type="image/png" href="/assets/logo.png">`,
```

- [ ] **Step 2: buildPlainHead 数组加 favicon**

同样在其 viewport 行之后插入同一行。

- [ ] **Step 3: 运行 render + meta 测试，全部转绿**

Run: `npx vitest run test/render.test.ts test/meta.test.ts`
Expected: 全部 PASS。

---

### Task 6: 首页新板块集成测试（TDD 红灯）

**Files:**
- Modify: `test/integration.test.ts`

- [ ] **Step 1: 新增双语板块断言**

在 `describe("pages", ...)` 块内、`"en home renders tool cards with CTA links"` 之后插入：

```ts
  it("zh home renders new template sections", async () => {
    const res = await fetchNoFollow("/zh/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("home-features");
    expect(html).toContain("home-steps");
    expect(html).toContain("home-testimonials");
    expect(html).toContain("home-cta-banner");
  });

  it("en home renders new template sections", async () => {
    const res = await fetchNoFollow("/en/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("home-features");
    expect(html).toContain("home-steps");
    expect(html).toContain("home-testimonials");
    expect(html).toContain("home-cta-banner");
  });
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run test/integration.test.ts`
Expected: 2 个新测试 FAIL，其余 PASS。

---

### Task 7: home.zh.html 重写（TDD 绿灯 1/2）

**Files:**
- Rewrite: `src/content/home.zh.html`

- [ ] **Step 1: 全文替换**

```html
<div class="home-hero">
  <h1>玄命阁</h1>
  <p class="lead">以传统命理与占卜的智慧，观照当下，启迪未来。</p>
  <div class="hero-divider" aria-hidden="true">◆</div>
  <div class="hero-cta-group">
    <a class="hero-cta primary" href="/zh/bazi/">开始排盘</a>
    <a class="hero-cta secondary" href="/zh/liuyao/">立即起卦</a>
  </div>
</div>

<div class="home-tools">
  <div class="tool-card">
    <h2><span class="tool-icon" aria-hidden="true">䷀</span>八字排盘</h2>
    <p>输入出生时间，排出四柱八字，解读命局走势。</p>
    <p class="tool-features">四柱排盘 · 十神纳音 · 大运流年解读</p>
    <a class="tool-cta" href="/zh/bazi/">开始排盘</a>
  </div>
  <div class="tool-card">
    <h2><span class="tool-icon" aria-hidden="true">䷜</span>六爻起卦</h2>
    <p>铜钱摇卦成卦，以周易卦辞爻辞解读吉凶趋势。</p>
    <p class="tool-features">铜钱起卦 · 六十四卦 · 卦象解读</p>
    <a class="tool-cta" href="/zh/liuyao/">立即起卦</a>
  </div>
</div>

<section class="home-features">
  <h2>为什么选择玄命阁</h2>
  <div class="features-grid">
    <div class="feature-card">
      <span class="feature-icon" aria-hidden="true">☵</span>
      <h3>传统算法</h3>
      <p>排盘起卦遵循传统历法与周易规则，结果严谨可考。</p>
    </div>
    <div class="feature-card">
      <span class="feature-icon" aria-hidden="true">✦</span>
      <h3>AI 解读</h3>
      <p>智能解读命局卦象，深入浅出，娓娓道来。</p>
    </div>
    <div class="feature-card">
      <span class="feature-icon" aria-hidden="true">☷</span>
      <h3>即开即用</h3>
      <p>无需注册下载，打开网页即可排盘起卦。</p>
    </div>
    <div class="feature-card">
      <span class="feature-icon" aria-hidden="true">⚮</span>
      <h3>隐私安心</h3>
      <p>出生信息仅用于当次排盘，不作留存。</p>
    </div>
  </div>
</section>

<section class="home-steps">
  <h2>三步开启解读</h2>
  <ol class="steps-list">
    <li class="step-item">
      <span class="step-num" aria-hidden="true">一</span>
      <h3>输入信息</h3>
      <p>填写出生时间，或默念所问之事摇卦。</p>
    </li>
    <li class="step-item">
      <span class="step-num" aria-hidden="true">二</span>
      <h3>排盘起卦</h3>
      <p>自动排出四柱八字或六爻卦象。</p>
    </li>
    <li class="step-item">
      <span class="step-num" aria-hidden="true">三</span>
      <h3>获取解读</h3>
      <p>AI 为你解读命局走势与吉凶趋势。</p>
    </li>
  </ol>
</section>

<section class="knowledge-card">
  <h2>天干地支</h2>
  <p>天干地支是中国传统历法与术数的基本符号：十天干（甲乙丙丁戊己庚辛壬癸）与十二地支（子丑寅卯辰巳午未申酉戌亥）依次相配，组成六十甲子，周而复始。八字排盘以出生时刻的四组干支刻画命局，六爻起卦同样以干支纪时成卦——天干地支是理解这两门学问的共同基础。</p>
</section>

<section class="knowledge-card">
  <h2>五行</h2>
  <p>金、木、水、火、土五种基本要素，构成了古人认识世界的基本框架。五行之间相生相克：木生火、火生土、土生金、金生水、水生木；木克土、土克水、水克火、火克金、金克木。在八字命理中，每个天干地支都有其五行属性，五行的旺衰平衡是解读命局的重要线索。</p>
</section>

<section class="home-testimonials">
  <h2>用户怎么说</h2>
  <div class="testimonials-grid">
    <blockquote class="testimonial-card">
      <p>排盘结果很详细，大运解读对我很有启发。</p>
      <cite>—— 用户甲</cite>
    </blockquote>
    <blockquote class="testimonial-card">
      <p>起卦的过程很有仪式感，解读也言之有物。</p>
      <cite>—— 用户乙</cite>
    </blockquote>
    <blockquote class="testimonial-card">
      <p>页面干净雅致，随时随地都能为自己占上一卦。</p>
      <cite>—— 用户丙</cite>
    </blockquote>
  </div>
</section>

<section class="home-cta-banner">
  <h2>即刻探索你的命理</h2>
  <a class="banner-cta" href="/zh/bazi/">免费排盘</a>
</section>
```

要点：保留 `lead` 文案与 `class="tool-cta" href="/zh/..."`（既有测试依赖）；hero CTA 用独立 `hero-cta` class（避免与 tool-cta 断言混淆）；卦象/八卦符号均 `aria-hidden="true"`。

- [ ] **Step 2: 运行集成测试 zh 用例转绿**

Run: `npx vitest run test/integration.test.ts -t "zh home"`
Expected: zh 相关用例 PASS，en 新板块用例仍 FAIL。

---

### Task 8: home.en.html 重写（TDD 绿灯 2/2）

**Files:**
- Rewrite: `src/content/home.en.html`

- [ ] **Step 1: 全文替换**

```html
<div class="home-hero">
  <h1>Xuanming Pavilion</h1>
  <p class="lead">Time-honoured Chinese fortune-telling and divination — insight into the present, guidance for what lies ahead.</p>
  <div class="hero-divider" aria-hidden="true">◆</div>
  <div class="hero-cta-group">
    <a class="hero-cta primary" href="/en/bazi/">Build My Chart</a>
    <a class="hero-cta secondary" href="/en/liuyao/">Cast a Hexagram</a>
  </div>
</div>

<div class="home-tools">
  <div class="tool-card">
    <h2><span class="tool-icon" aria-hidden="true">䷀</span>BaZi Chart</h2>
    <p>Enter your birth date and time to build your Four-Pillars chart and read your destiny's course.</p>
    <p class="tool-features">Four Pillars · Ten Gods &amp; Nayin · Luck-cycle readings</p>
    <a class="tool-cta" href="/en/bazi/">Build My Chart</a>
  </div>
  <div class="tool-card">
    <h2><span class="tool-icon" aria-hidden="true">䷜</span>I Ching Casting</h2>
    <p>Toss coins to cast a hexagram and read its meaning through the Zhou Yi judgement and line texts.</p>
    <p class="tool-features">Coin casting · 64 hexagrams · Hexagram readings</p>
    <a class="tool-cta" href="/en/liuyao/">Cast a Hexagram</a>
  </div>
</div>

<section class="home-features">
  <h2>Why Xuanming Pavilion</h2>
  <div class="features-grid">
    <div class="feature-card">
      <span class="feature-icon" aria-hidden="true">☵</span>
      <h3>Traditional Methods</h3>
      <p>Charts and hexagrams follow the classical calendar and Zhou Yi rules.</p>
    </div>
    <div class="feature-card">
      <span class="feature-icon" aria-hidden="true">✦</span>
      <h3>AI Readings</h3>
      <p>Thoughtful interpretations of your chart and hexagram, in plain language.</p>
    </div>
    <div class="feature-card">
      <span class="feature-icon" aria-hidden="true">☷</span>
      <h3>Instant Access</h3>
      <p>No sign-up or download — cast and read right in your browser.</p>
    </div>
    <div class="feature-card">
      <span class="feature-icon" aria-hidden="true">⚮</span>
      <h3>Privacy First</h3>
      <p>Birth details are used only for the reading, never stored.</p>
    </div>
  </div>
</section>

<section class="home-steps">
  <h2>Three Steps to Your Reading</h2>
  <ol class="steps-list">
    <li class="step-item">
      <span class="step-num" aria-hidden="true">1</span>
      <h3>Enter Details</h3>
      <p>Birth date and time, or focus your question and toss the coins.</p>
    </li>
    <li class="step-item">
      <span class="step-num" aria-hidden="true">2</span>
      <h3>Chart &amp; Cast</h3>
      <p>Your Four Pillars or hexagram is built instantly.</p>
    </li>
    <li class="step-item">
      <span class="step-num" aria-hidden="true">3</span>
      <h3>Read the Signs</h3>
      <p>Receive an AI reading of your chart or hexagram.</p>
    </li>
  </ol>
</section>

<section class="knowledge-card">
  <h2>Heavenly Stems &amp; Earthly Branches</h2>
  <p>The Heavenly Stems and Earthly Branches are the basic symbols of traditional Chinese calendrics and divination: ten stems (Jia, Yi, Bing, Ding, Wu, Ji, Geng, Xin, Ren, Gui) pair with twelve branches (Zi, Chou, Yin, Mao, Chen, Si, Wu, Wei, Shen, You, Xu, Hai) to form the sixty-unit Jiazi cycle. A BaZi chart is built from the four stem-branch pairs at your birth moment, and I Ching casting likewise marks time in stems and branches — the shared foundation of both arts.</p>
</section>

<section class="knowledge-card">
  <h2>The Five Elements</h2>
  <p>Metal, Wood, Water, Fire and Earth — the five basic elements of the classical Chinese worldview. They generate one another (Wood feeds Fire, Fire creates Earth, Earth bears Metal, Metal collects Water, Water nourishes Wood) and overcome one another (Wood parts Earth, Earth dams Water, Water quenches Fire, Fire melts Metal, Metal chops Wood). In BaZi, every stem and branch carries an elemental nature, and the balance of the five elements is a key thread in reading a chart.</p>
</section>

<section class="home-testimonials">
  <h2>What Our Readers Say</h2>
  <div class="testimonials-grid">
    <blockquote class="testimonial-card">
      <p>The chart was remarkably detailed, and the luck-cycle reading gave me plenty to reflect on.</p>
      <cite>— A. Reader</cite>
    </blockquote>
    <blockquote class="testimonial-card">
      <p>Casting the coins felt genuinely ritualistic, and the reading was thoughtful.</p>
      <cite>— M. Chen</cite>
    </blockquote>
    <blockquote class="testimonial-card">
      <p>A clean, elegant page — I can consult the hexagrams whenever I like.</p>
      <cite>— S. Wong</cite>
    </blockquote>
  </div>
</section>

<section class="home-cta-banner">
  <h2>Explore Your Destiny Today</h2>
  <a class="banner-cta" href="/en/bazi/">Free Chart Reading</a>
</section>
```

- [ ] **Step 2: 运行全部集成测试转绿**

Run: `npx vitest run test/integration.test.ts`
Expected: 全部 PASS。

---

### Task 9: style.css 视觉系统升级

**Files:**
- Modify: `public/assets/style.css`

- [ ] **Step 1: 替换 `:root` 变量块（文件开头）**

```css
:root {
  --fg: #2b2622;
  --muted: #7a7168;
  --accent: #8a3324;
  --accent-dark: #6e271b;
  --gold: #b08d57;
  --bg: #faf7f2;
  --border: #e5ddd2;
  --paper: #fffdf9;
  --ink: #241f1b;
}
```

- [ ] **Step 2: body 渐变 + 标题字距**

`body` 的 `background: var(--bg);` 改为：

```css
  background: linear-gradient(to bottom, #fbf8f3, #f6f0e6);
```

标题规则改为：

```css
h1 { font-size: 2.1rem; line-height: 1.35; letter-spacing: 0.05em; }
h2 { font-size: 1.35rem; letter-spacing: 0.03em; }
```

- [ ] **Step 3: 全文件 `#e5ddd2` 统一为 `var(--border)`**

SearchReplace `replace_all`：`#e5ddd2` → `var(--border)`（变量已定义，视觉不变，DRY）。

- [ ] **Step 4: 重写 header 样式块**

将现有 `.site-header` ~ `.lang-switch` 段（含 `.site-nav`、`.nav-links` 规则）整体替换为：

```css
.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--border);
  background: rgba(250, 247, 242, 0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.site-nav {
  max-width: 920px;
  margin: 0 auto;
  padding: 0.7rem 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.site-brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--fg);
  text-decoration: none;
}

.brand-logo { display: block; border-radius: 6px; }

.brand-name {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.nav-links {
  display: flex;
  gap: 1.25rem;
  margin-left: auto;
}

.nav-links a {
  position: relative;
  color: var(--fg);
  text-decoration: none;
  padding: 0.15rem 0;
}

.nav-links a::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -2px;
  width: 100%;
  height: 2px;
  background: var(--accent);
  transform: translateX(-50%) scaleX(0);
  transition: transform 0.2s ease;
}

.nav-links a:hover::after,
.nav-links a.active::after { transform: translateX(-50%) scaleX(1); }

.nav-links a.active { color: var(--accent); font-weight: 600; }

.lang-switch {
  font-size: 0.85rem;
  color: var(--accent);
  border: 1px solid var(--gold);
  border-radius: 999px;
  padding: 0.15rem 0.7rem;
  text-decoration: none;
  transition: background 0.2s ease, color 0.2s ease;
}

.lang-switch:hover { background: var(--accent); border-color: var(--accent); color: #fff; }

@media (max-width: 640px) {
  .site-nav { flex-wrap: wrap; }
  .nav-links { order: 3; width: 100%; margin-left: 0; justify-content: space-around; gap: 0.5rem; }
}
```

- [ ] **Step 5: main 宽度 720 → 920**

`main { max-width: 720px; ... }` 改为 `max-width: 920px`。

- [ ] **Step 6: 重写 footer 样式块**

将现有 `.site-footer` 规则整体替换为：

```css
.site-footer {
  background: var(--ink);
  color: #d9cfc0;
  font-size: 0.9rem;
}

.footer-main {
  max-width: 920px;
  margin: 0 auto;
  padding: 2.5rem 1rem 1.5rem;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 2rem;
}

.footer-name {
  margin: 0.6rem 0 0.1rem;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #f0e9df;
}

.footer-slogan {
  margin: 0;
  color: var(--gold);
  font-size: 0.85rem;
  letter-spacing: 0.05em;
}

.footer-desc { margin: 0.6rem 0 0; color: #b8ab99; font-size: 0.85rem; }

.footer-col h2 {
  font-size: 0.95rem;
  color: var(--gold);
  margin: 0 0 0.6rem;
  letter-spacing: 0.05em;
}

.footer-col a {
  display: block;
  color: #d9cfc0;
  text-decoration: none;
  padding: 0.15rem 0;
  transition: color 0.2s ease;
}

.footer-col a:hover { color: var(--gold); }

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
  padding: 1rem;
  color: #9c9081;
  font-size: 0.82rem;
}

.footer-bottom p { margin: 0; }

@media (max-width: 640px) {
  .footer-main { grid-template-columns: 1fr; gap: 1.5rem; }
}
```

- [ ] **Step 7: 工具卡与按钮细节升级**

- `.tool-card` 增加 `border-top: 2px solid var(--gold);`、`background: var(--paper);`、`box-shadow: 0 1px 3px rgba(43, 38, 34, 0.05);`、`transition: transform 0.2s ease, box-shadow 0.2s ease;`（`border` 行中的颜色已在 Step 3 变量化）。
- `.tool-card` 后追加：

```css
.tool-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(43, 38, 34, 0.1);
}

.tool-icon { color: var(--accent); margin-right: 0.4rem; }
```

- `.tool-cta:hover { opacity: 0.9; }` 改为 `.tool-cta:hover { background: var(--accent-dark); }`，并给 `.tool-cta` 加 `transition: background 0.2s ease;`。
- `.bazi-submit:hover { opacity: 0.9; }` 改为 `.bazi-submit:hover { background: var(--accent-dark); }`（全站按钮悬停统一），`.bazi-submit` 加同样的 transition。

- [ ] **Step 8: 文件末尾追加首页新板块样式**

```css
/* ---------- 首页新板块 ---------- */

.hero-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  color: var(--gold);
  font-size: 0.7rem;
  margin: 1.4rem 0 0;
}

.hero-divider::before,
.hero-divider::after {
  content: "";
  width: 64px;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--gold));
}

.hero-divider::after { background: linear-gradient(to left, transparent, var(--gold)); }

.hero-cta-group {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1.6rem;
}

.hero-cta {
  border-radius: 6px;
  padding: 0.55rem 1.8rem;
  text-decoration: none;
  transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.hero-cta.primary {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 2px 6px rgba(138, 51, 36, 0.25);
}

.hero-cta.primary:hover {
  background: var(--accent-dark);
  transform: translateY(-1px);
}

.hero-cta.secondary {
  border: 1px solid var(--accent);
  color: var(--accent);
}

.hero-cta.secondary:hover { background: rgba(138, 51, 36, 0.06); }

.home-features,
.home-steps,
.home-testimonials { margin: 3rem 0; }

.home-features > h2,
.home-steps > h2,
.home-testimonials > h2 {
  text-align: center;
  margin-bottom: 1.6rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.feature-card {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.25rem 1rem;
  text-align: center;
}

.feature-icon {
  display: block;
  font-size: 1.6rem;
  color: var(--gold);
  margin-bottom: 0.4rem;
}

.feature-card h3 { margin: 0.2rem 0 0.4rem; font-size: 1.05rem; }
.feature-card p { margin: 0; font-size: 0.88rem; color: var(--muted); }

.steps-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.step-item {
  position: relative;
  text-align: center;
  padding: 0.5rem 1rem;
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 1.1rem;
  margin-bottom: 0.6rem;
  box-shadow: 0 0 0 4px rgba(176, 141, 87, 0.25);
}

.step-item h3 { margin: 0.2rem 0 0.3rem; }
.step-item p { margin: 0; font-size: 0.9rem; color: var(--muted); }

@media (min-width: 641px) {
  .step-item:not(:last-child)::after {
    content: "";
    position: absolute;
    top: 30px;
    left: calc(50% + 34px);
    width: calc(100% - 68px);
    border-top: 1px dashed var(--gold);
  }
}

.knowledge-card {
  background: var(--paper);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  margin: 1.25rem 0;
}

.knowledge-card h2 { margin-top: 0; color: var(--accent); }
.knowledge-card p { margin-bottom: 0; }

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.testimonial-card {
  position: relative;
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem 1.25rem 1rem;
  margin: 0;
}

.testimonial-card::before {
  content: "\201C";
  position: absolute;
  top: 0.1rem;
  left: 0.7rem;
  font-size: 2.6rem;
  color: var(--gold);
  opacity: 0.5;
}

.testimonial-card p { margin: 0.8rem 0; }
.testimonial-card cite { font-style: normal; color: var(--muted); font-size: 0.85rem; }

.home-cta-banner {
  margin: 3rem 0 1rem;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent), var(--accent-dark));
  color: #fff;
  text-align: center;
  padding: 2.5rem 1.5rem;
  box-shadow: 0 8px 24px rgba(110, 39, 27, 0.25);
}

.home-cta-banner h2 { color: #fff; margin: 0 0 1.2rem; letter-spacing: 0.06em; }

.banner-cta {
  display: inline-block;
  border: 1px solid var(--gold);
  color: #fff;
  border-radius: 999px;
  padding: 0.55rem 2.2rem;
  text-decoration: none;
  letter-spacing: 0.05em;
  transition: background 0.2s ease, color 0.2s ease;
}

.banner-cta:hover { background: var(--gold); color: var(--ink); }

@media (max-width: 800px) {
  .features-grid { grid-template-columns: 1fr 1fr; }
  .testimonials-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .steps-list { grid-template-columns: 1fr; }
}

@media (max-width: 560px) {
  .features-grid { grid-template-columns: 1fr; }
}
```

注意：原文件末尾已有 `@media (max-width: 560px) { .home-tools { grid-template-columns: 1fr; } }`，保留并与新媒体查询共存。

- [ ] **Step 9: 回归测试**

Run: `npm test`
Expected: 全部 PASS（CSS 改动不影响测试，此步为回归保障）。

---

### Task 10: 全量验证 + 浏览器视觉验证

- [ ] **Step 1: 全量测试与类型检查**

Run: `npm test`
Expected: 全部 PASS（125+ 测试；Windows 末尾 miniflare EBUSY 警告属无害噪音）。

Run: `npm run typecheck`
Expected: 无错误。

- [ ] **Step 2: 本地 dev + 浏览器验证**

Run: `npm run dev`（后台），RunPreview `http://localhost:8787`。
用 browser-use 依次检查 `/zh/`、`/en/`、`/zh/bazi/`、`/zh/liuyao/`：
- header：LOGO + 站名左侧、导航下划线动画、语言切换；滚动时吸顶
- footer：深墨三栏 + 底栏，链接可点
- 首页：hero 分隔符与双 CTA、4 特色卡、3 步骤（含虚线连接）、知识卡红边条、3 评价卡引号、朱红横幅
- 窄屏（约 480px 宽）布局不破：导航换行、网格堆叠
- LOGO 图像正常加载（无 404）

- [ ] **Step 3: 修复视觉验证发现的问题（如有）**

按发现问题微调 CSS 数值（间距/字号/断点），每处修改后刷新复查。

- [ ] **Step 4: 更新 AGENTS.md**

`目录结构与职责`一节中关于 `layout/nav.ts`、`layout/footer.ts` 的描述更新为新结构（品牌块/多栏页脚）；若 `README.md` 有界面结构描述也同步。

- [ ] **Step 5: 交接说明**

向用户展示预览与改动摘要。不执行 git commit（由用户审阅后自行提交）。

---

## Self-Review 记录

- **Spec 覆盖**：LOGO（T1）、favicon（T2/T5）、header 品牌块（T2/T3 + CSS T9S4）、footer 多栏（T2/T4 + CSS T9S6）、首页 7 板块（T6/T7/T8 + CSS T9S7/S8）、变量与全局细节（T9S1–S3、S5）——全覆盖。
- **保留断言**：`lang-switch` class、lead 文案、`tool-cta` class 与属性顺序、`site-footer` class——实现均保留，旧测试不破。
- **类型/命名一致**：class 名在测试、HTML、CSS 三处一致（site-brand/brand-logo/brand-name/footer-main/footer-col/footer-bottom/hero-divider/hero-cta/features-grid/feature-card/steps-list/step-item/step-num/knowledge-card/testimonials-grid/testimonial-card/home-cta-banner/banner-cta）。