# 全站视觉美化设计（2026-08-03）

来源需求：用户反馈"页面样式不好看"，要求 ① 美化 header 与 footer（允许增减内容）；② 美化首页（允许增加模板 section，后续自行替换内容）；③ 允许使用替图，包括网站 LOGO。

## 关键决策（已与用户确认）

1. **风格方向：传统中式典雅**。在现有基调（米白底 `#faf7f2`、朱红 `--accent: #8a3324`、衬线字体）上精致化，不推倒重来。新增鎏金点缀色，细节向传统书卷气靠拢。
2. **LOGO：AI 生成图像**。方形朱砂印章风格（红底白文「玄」字，篆刻质感），存 `public/assets/logo.png`；同图用于 header、footer 品牌位与 favicon。
3. **Header**：左侧 LOGO + 站名（链接回首页）｜ 中间导航 ｜ 右侧语言切换胶囊。sticky 吸顶 + 半透米白背景 + 背景模糊。移动端不做汉堡菜单（仅 4 个链接），紧凑排列。
4. **Footer：多栏式**。深墨色底 + 米白文字 + 金色细节；三栏（品牌 / 工具 / 关于）+ 底栏版权与免责声明。
5. **首页新增 4 个模板 section**：特色优势（4 列图标卡）、使用流程（3 步）、用户评价（3 列占位）、横幅 CTA。文案为语义化双语占位，用户后续自行替换。
6. **工程约束**：双语对称（zh/en 同步）；TDD 先改测试；保留 `.lang-switch`、`.site-nav`、`.site-footer` 等现有 class 名；零 JS 依赖（纯 CSS + SSR HTML）；不引入图标库，装饰符号用八卦系 Unicode（☰ ☵ ☷ ⚮ ䷀）。

## 视觉系统（style.css）

### 配色变量

```css
:root {
  --fg: #2b2622;          /* 墨色正文（不变） */
  --muted: #7a7168;       /* 次要文字（不变） */
  --accent: #8a3324;      /* 朱红主色（不变） */
  --accent-dark: #6e271b; /* 朱红深色，按钮悬停 */
  --gold: #b08d57;        /* 鎏金点缀：分隔线、图标、footer 细节 */
  --bg: #faf7f2;          /* 米白底（不变） */
  --border: #e5ddd2;      /* 细边框（原散落的 #e5ddd2 统一为变量） */
  --paper: #fffdf9;       /* 卡片纸白 */
  --ink: #241f1b;         /* footer 深墨底 */
}
```

### 全局细节

- body 背景改为极淡的宣纸渐变（`--bg` → 略深米色的纵向渐变），平面感减弱。
- `main` 最大宽度 720px → **920px**，首页与工具页更宽松；文章页（sample）正文仍属可接受阅读宽度。
- 链接与按钮统一 0.2s 过渡；按钮悬停由 `opacity` 改为 `--accent-dark` 底色 + 微浮起（`translateY(-1px)` + 阴影）。
- 标题加 `letter-spacing`（h1 0.05em 级），中文标题下可加金色小菱形分隔（`◆`，纯 CSS `::after`）。
- 焦点态保留浏览器可见轮廓（不全局清除 outline，无障碍）。

## Header（nav.ts 结构调整）

```html
<nav class="site-nav" aria-label="主导航">
  <a class="site-brand" href="/zh/">
    <img class="brand-logo" src="/assets/logo.png" alt="玄命阁" width="36" height="36">
    <span class="brand-name">玄命阁</span>
  </a>
  <div class="nav-links"> …现有页面链接… </div>
  <a class="lang-switch" href="/en/">English</a>
</nav>
```

- 品牌链接经 `pagePath(lang, "")` 生成；站名用 `SITE_NAME` / `SITE_NAME_EN`，一律过 `escapeHtml`。
- 中间导航在当前页项保留 `.active` + `aria-current`，视觉上朱红加粗；链接悬停下划线从中间展开（`::after` 缩放动画）。
- 样式：`.site-header` 改 `position: sticky; top: 0; z-index: 10`，背景 `rgba(250,247,242,0.9)` + `backdrop-filter: blur(8px)`，底部 1px `--border`。
- 移动端（≤ 640px）：nav 允许换行为两行（品牌+语言切换一行、链接行横向均分），不溢出。

## Footer（footer.ts 重写为多栏）

```html
<footer class="site-footer">
  <div class="footer-main">
    <div class="footer-brand">
      <img class="brand-logo" src="/assets/logo.png" alt="玄命阁" width="40" height="40">
      <p class="footer-name">玄命阁</p>
      <p class="footer-slogan">命理 · 占卜 · 传统文化</p>
      <p class="footer-desc">以传统术数与 AI 解读，在线提供八字排盘与六爻起卦。</p>
    </div>
    <nav class="footer-col" aria-label="工具">
      <h2>工具</h2>
      <a href="/zh/bazi/">八字排盘</a>
      <a href="/zh/liuyao/">六爻起卦</a>
    </nav>
    <nav class="footer-col" aria-label="关于">
      <h2>关于</h2>
      <a href="/zh/">首页</a>
      <a href="/zh/sample/">示例文章</a>
    </nav>
  </div>
  <div class="footer-bottom">
    <p>© 2026 玄命阁 · 内容仅供娱乐参考</p>
  </div>
</footer>
```

- 链接全部经 `pagePath()` 生成（不手拼）；文案走 `SITE_NAME`/`SITE_SLOGAN` 常量 + 语言三元判断，过 `escapeHtml`。
- 「关于」列链接由 `navPages()` 中排除当前工具页的条目派生？——否，保持简单：写死「首页 + sample 示例文章」两条经 `pagePath()` 生成，sample 去留是独立议题，不在本次范围。
- 样式：深墨底 `--ink`，文字米白 `#f0e9df`，标题金色 `--gold`，链接悬停金色；三栏 grid，≤ 640px 堆叠单列。
- 页脚结构对 404/500 页面同样生效（`renderNotFound`/`renderError` 共用 `renderFooter`，无需特殊处理）。

## 首页（home.zh.html / home.en.html 重写）

板块顺序：Hero → 工具卡片 → 特色优势 → 使用流程 → 知识（天干地支/五行）→ 用户评价 → 横幅 CTA。

### S01 · Hero（美化）

- 保留站名 + 定位语文案（测试已有断言，不改文字），下方新增装饰分隔（金色 ◆ 居中，CSS 绘制）与两个 CTA：主按钮「开始排盘」→ `/zh/bazi/`，次按钮（描边）「立即起卦」→ `/zh/liuyao/`。
- Hero CTA 用独立 class（`hero-cta` / `hero-cta primary` / `hero-cta secondary`），不复用 `.tool-cta`，避免与既有集成测试断言（`class="tool-cta" href=...`）语义混淆。
- en 版对应：Build My Chart / Cast a Hexagram。

### S02 · 工具卡片（美化）

- 结构文案不变（含 `.tool-cta` class，集成测试依赖），视觉升级：卡片顶部 2px 金色线、悬停浮起 + 阴影加深、标题左侧加卦象符号装饰（䷁/䷀ 等 Unicode，`<span class="tool-icon" aria-hidden="true">`）。

### S03 · 特色优势（新增 `.home-features`）

4 列卡片（≤ 800px 2 列，≤ 560px 1 列），每卡：Unicode 符号 + `<h3>` + 一句话。

| 符号 | zh 标题 / 文案 | en 标题 / 文案 |
|---|---|---|
| ☵ | 传统算法 / 排盘起卦遵循传统历法与周易规则，结果严谨可考。 | Traditional Methods / Charts and hexagrams follow classical calendar and Zhou Yi rules. |
| ✦ | AI 解读 / 智能解读命局卦象，深入浅出，娓娓道来。 | AI Readings / Thoughtful interpretations of your chart and hexagram, in plain language. |
| ☷ | 即开即用 / 无需注册下载，打开网页即可排盘起卦。 | Instant Access / No sign-up or download — cast and read right in your browser. |
| ⚮ | 隐私安心 / 出生信息仅用于当次排盘，不作留存。 | Privacy First / Birth details are used only for the reading, never stored. |

### S04 · 使用流程（新增 `.home-steps`）

3 步横向（移动端纵向），序号朱红圆形 + 连接线（CSS 伪元素）：

1. 输入信息 / 填写出生时间，或默念所问之事摇卦。 — Enter Details / Birth date and time, or focus your question and toss the coins.
2. 排盘起卦 / 自动排出四柱八字或六爻卦象。 — Chart & Cast / Your Four Pillars or hexagram is built instantly.
3. 获取解读 / AI 为你解读命局走势与吉凶趋势。 — Read the Signs / Receive an AI reading of your chart or hexagram.

### S05 · 知识板块（美化）

「天干地支」「五行」文案不变，改为 `<section class="knowledge-card">`：白卡 + 左侧 3px 朱红边条 + 金色标题。

### S06 · 用户评价（新增 `.home-testimonials`）

3 列引用卡（≤ 800px 堆叠），占位文案（用户后续替换）：

- zh：「排盘结果很详细，大运解读对我很有启发。」—— 用户甲 等三条；en 对应三条。署名用「用户甲/乙/丙」与 "A. Reader / M. Chen / S. Wong" 式占位。
- 卡内 `<blockquote>` + `<cite>`，CSS 加金色大引号装饰（`::before`）。

### S07 · 横幅 CTA（新增 `.home-cta-banner`）

朱红渐变横幅（`--accent` → `--accent-dark`），白字标题 + 金边按钮：

- zh：「即刻探索你的命理」+ 按钮「免费排盘」→ `/zh/bazi/`
- en："Explore Your Destiny Today" + "Free Chart Reading" → `/en/bazi/`

## LOGO 与 favicon

- ImageGen 生成：方形朱红印章，白文「玄」字篆刻，纹理做旧，1024×1024 PNG → 存 `public/assets/logo.png`。
- favicon：`meta.ts` 的 `buildHead`/`buildPlainHead` 统一追加 `<link rel="icon" type="image/png" href="/assets/logo.png">`（同一图，浏览器自行缩放，不单独生成多尺寸）。
- `alt` 文本双语（zh「玄命阁」/ en "Xuanming Pavilion"），装饰性用法之外均提供。

## 涉及文件

| 文件 | 改动 |
|---|---|
| `public/assets/logo.png` | 新增（ImageGen 生成） |
| `test/render.test.ts` | 更新：nav 含品牌链接/LOGO、footer 多栏结构、favicon link 断言 |
| `test/integration.test.ts` | 新增首页新板块断言（features/steps/testimonials/cta-banner 的 class 钩子） |
| `src/layout/nav.ts` | 加品牌块（LOGO + 站名），class 结构升级 |
| `src/layout/footer.ts` | 重写为多栏式 |
| `src/seo/meta.ts` | head 追加 favicon `<link>`（buildHead 与 buildPlainHead 共用处） |
| `src/content/home.zh.html` | 重写（7 板块） |
| `src/content/home.en.html` | 重写（7 板块英文对应） |
| `public/assets/style.css` | 视觉系统升级（变量、header/footer/首页板块样式） |

无路由/SEO 管线/功能逻辑改动；bazi、liuyao 页面样式变量统一后顺带受益，功能零变化。

## 测试

- `render.test.ts` 更新点：
  - nav 断言新增：`class="site-brand"` 链接指向 `/{lang}/`、`brand-logo` img 的 `src="/assets/logo.png"` 与双语 alt。
  - 保留：`lang-switch` class 与指向（旧断言不破）。
  - footer 断言新增：`footer-main`、`footer-bottom`、slogan 文案、免责声明双语。
  - favicon：页面 HTML 含 `<link rel="icon"`。
- `integration.test.ts` 新增：`/zh/` 含 `home-features`、`home-steps`、`home-testimonials`、`home-cta-banner` 四个 class 钩子；`/en/` 同样断言（防双语漏改）。
- 现有首页断言（`tool-cta` 链接、lead 文案）保持不变——新版结构与文案兼容。
- TDD 顺序：先改测试 → 红灯 → 实现 → 绿灯。

## 不做的事

- 不做汉堡菜单/移动端抽屉（链接少，无需）。
- 不引入 JS、图标库、Webfont 外链（保持零外部依赖，加载最快）。
- 不生成多尺寸 favicon / og 图替换（og-default.png 属上线清单独立事项）。
- 不动 sample 页去留、bazi/liuyao 功能与文案、FAQ mainEntity（已知边界）。
- 新板块文案为占位，不追求最终措辞（用户后续自行替换）。
