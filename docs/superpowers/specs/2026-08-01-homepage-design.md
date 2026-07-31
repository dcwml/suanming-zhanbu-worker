# 首页改版设计（2026-08-01）

来源需求：`将要做的三个页面.md` 之「Home」。将现有占位首页（内容提及尚未存在的塔罗/文化专栏）改版为正式首页。

## 关键决策（已与用户确认）

1. **四板块结构**：Hero → 工具卡片（八字/六爻）→ 天干地支 → 五行。原规划中的 S03/S04（关于八字/关于六爻）并入工具卡片，S06（六合/三合/五合/五冲）替换为五行——六合三合等概念过于细分、大众辨识度低，留作将来自定义文章素材；五行认知度高，是连接天干地支与八字解读的桥梁。
2. **轻量科普**：天干地支、五行板块各 2–3 句话，暂不放链接（对应文章页尚不存在），待将来页面落地后再补。
3. **Hero 极简**：仅站名 + 一句定位语，无 CTA 按钮（工具卡片紧接其下，无需重复导流）。
4. **纯排版视觉**：不引入图标、装饰纹样等新视觉元素，完全靠字体层级、留白与现有配色（`--accent` 暗红、暖米底、白卡片）撑起结构，与八字/六爻页风格统一。
5. **纯静态**：首页无 JS，无 API 调用。

## 页面结构

### S01 · Hero

- `<h1>` 站名 + `<p class="lead">` 定位语，文本居中，加大上下留白。
- 中文：「玄命阁」+ "以传统命理与占卜的智慧，观照当下，启迪未来。"
- 英文：Xuanming Pavilion + 对应定位语（按英文习惯撰写，非直译）。

### S02 · 工具卡片（2 张）

每张卡片包含：标题（`<h2>`）、一句话简介、亮点行、CTA 按钮。

| | 八字排盘 | 六爻起卦 |
|---|---|---|
| 简介 | 输入出生时间，排出四柱八字，解读命局走势 | 铜钱摇卦成卦，以周易卦辞爻辞解读吉凶趋势 |
| 亮点 | 四柱排盘 · 十神纳音 · 大运流年解读 | 铜钱起卦 · 六十四卦 · 卦象解读 |
| CTA | "开始排盘" → `/zh/bazi/` | "立即起卦" → `/zh/liuyao/` |

- 桌面端双列并排，≤ 560px 堆叠为单列。
- CTA 链接用带语言前缀的绝对路径（同 `notfound.zh.html` 的 `/zh/` 写法惯例）。

### S03 · 天干地支

`<h2>` + 2–3 句科普：十天干、十二地支是八字与六爻的共同基础，干支相配成六十甲子，周而复始。无链接。

### S04 · 五行

`<h2>` + 2–3 句科普：金木水火土五种基本要素，相生相克，贯穿天干地支与卦象解读。无链接。

英文版四个板块与中文一一对应，措辞按英文习惯重写。

## 涉及文件

| 文件 | 改动 |
|---|---|
| `src/content/home.zh.html` | 全文重写为上述 4 板块结构 |
| `src/content/home.en.html` | 全文重写（英文对应版） |
| `public/assets/style.css` | 追加 `/* ---------- 首页 ---------- */` 分组（约 40 行） |
| `src/pages/registry.ts` | 更新首页 `meta.description`（现有描述提及"塔罗占卜"，已不符实际） |

无新建文件，无路由/布局/SEO 管线改动（首页 slug `""` 已注册，SEO 全部自动派生）。

## HTML 结构（zh 版示意）

```html
<!-- S01 Hero -->
<div class="home-hero">
  <h1>玄命阁</h1>
  <p class="lead">以传统命理与占卜的智慧，观照当下，启迪未来。</p>
</div>

<!-- S02 工具卡片 -->
<div class="home-tools">
  <div class="tool-card">
    <h2>八字排盘</h2>
    <p>输入出生时间，排出四柱八字，解读命局走势。</p>
    <p class="tool-features">四柱排盘 · 十神纳音 · 大运流年解读</p>
    <a class="tool-cta" href="/zh/bazi/">开始排盘</a>
  </div>
  <div class="tool-card">
    <h2>六爻起卦</h2>
    <p>铜钱摇卦成卦，以周易卦辞爻辞解读吉凶趋势。</p>
    <p class="tool-features">铜钱起卦 · 六十四卦 · 卦象解读</p>
    <a class="tool-cta" href="/zh/liuyao/">立即起卦</a>
  </div>
</div>

<!-- S03 -->
<section>
  <h2>天干地支</h2>
  <p>……</p>
</section>

<!-- S04 -->
<section>
  <h2>五行</h2>
  <p>……</p>
</section>
```

## CSS 追加

```css
/* ---------- 首页 ---------- */
.home-hero { text-align: center; padding: 2rem 0 1rem; }
.home-tools { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.5rem 0; }
.tool-card { border: 1px solid #e5ddd2; border-radius: 8px; background: #fff; padding: 1.25rem; display: flex; flex-direction: column; }
.tool-card h2 { margin-top: 0; }
.tool-features { color: var(--muted); font-size: 0.88rem; }
.tool-cta { ... }  /* --accent 底白字按钮，视觉同 .bazi-submit */
@media (max-width: 560px) { .home-tools { grid-template-columns: 1fr; } }
```

具体数值在实现时微调，以上为结构示意。

## Registry 更新

```ts
zh: { title: "首页", description: "玄命阁：在线八字排盘与六爻起卦，天干地支、五行入门。" },
en: { title: "Home", description: "Xuanming Pavilion: free BaZi chart reading and I Ching casting, with introductions to Heavenly Stems, Earthly Branches and the Five Elements." },
```

`title` 保持不变（"首页" / "Home"），`buildHead` 会自动拼接站点后缀。

## 测试

- 现有测试不受影响：集成测试只断言 SEO head 元素（lang/canonical/hreflang/JSON-LD），不依赖首页正文；meta/jsonld 单测使用自建 fixture，不读 registry 实际数据。
- 新增断言（`test/integration.test.ts`）：`/zh/` 响应包含 `/zh/bazi/` 与 `/zh/liuyao/` 两个 CTA 链接；`/en/` 响应包含 `/en/bazi/` 与 `/en/liuyao/`。确保内容片段正确挂载且双语链接指向正确。

## 不做的事

- 不加首页 JS / 动画 / 图标 / 装饰纹样。
- 不为天干地支、五行创建占位页面或锚点链接。
- 不改导航、页脚、SEO 管线。
- 不动 sample 页面（导航去留属独立议题）。
