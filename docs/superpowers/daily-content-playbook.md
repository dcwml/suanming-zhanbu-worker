# 每日内容生产手册（Daily Content Playbook）

> 当用户说"写一篇博客"或"写今天的博客"时，严格按本手册执行。本手册是每日可复用的操作流程，非一次性工程文档。

## 触发条件

用户说出以下任一意图即触发：
- "写一篇博客" / "写今天的博客" / "写今日宜忌"
- "写 YYYY-MM-DD 的内容"
- 其他等价表达

## 标准流程（7 步）

### 第 1 步：确定目标日期

- 用户未指定 → 用当天日期（系统时间）
- 用户指定了日期 → 用指定日期
- 日期格式固定为 `YYYY-MM-DD`

### 第 2 步：生成当日历法数据

运行命令（在项目根目录）：

```powershell
npm run almanac -- YYYY-MM-DD
```

记录输出的 JSON。该 JSON 是当日内容的**唯一权威数据源**，包含：

| 字段 | 含义 | 用在哪段 |
|---|---|---|
| `solar` / `lunar` | 公历 / 农历日期 | A 段头部 |
| **四柱** |||
| `yearGanZhi` | 年柱干支 | A 段四柱 |
| `monthGanZhi` | 月柱干支 | A 段四柱 |
| `dayGanZhi` / `dayGan` / `dayZhi` | 日柱干支 / 天干 / 地支 | A 段四柱 + 核心 |
| `hourGanZhi` | 时柱干支（子时例） | A 段四柱 |
| **日柱详情** |||
| `wuxing` | 日干五行 | A 段核心 |
| `zodiac` | 当日地支生肖（= B 段主角） | A 段 + B 段 |
| `chongZodiac` | 被冲生肖 | A 段冲煞 |
| `naYin` | 纳音 | A 段（可选展示） |
| `tianShen` / `tianShenLuck` | 天神 / 吉凶 | A 段解读 |
| `yi` / `ji` | 宜 / 忌（库自带权威数据） | A 段宜忌列表 |
| `jiShen` / `xiongSha` | 吉神宜趋 / 凶煞宜忌 | A 段神煞行 |
| `xiShen` / `caiShen` / `fuShen` | 喜神 / 财神 / 福神方位 | A 段方位卡 |
| `jieQi` | 当日节气（空串 = 非节气日） | A 段节气行 |
| `prevJieQi` / `nextJieQi` | 前后最近节气（名称 + 公历日期） | A 段节气行 |

### 第 3 步：撰写 A 段（黄历宜忌 + 解读）

基于第 2 步的 JSON，写中文 A 段。**必须使用「老黄历通胜式」统一格式**，结构模板如下：

```html
<section class="daily-almanac">
  <h2>今日宜忌</h2>
  <p class="daily-date">{solar}（农历{lunar}）</p>
  <p class="daily-jieqi">节气：{prevJieQi.name}（{月}月{日}日）— {nextJieQi.name}（{月}月{日}日）</p>
  <div class="daily-sizhu">
    <div class="daily-sizhu-item">
      <span class="sizhu-label">年柱</span>
      <span class="sizhu-value">{yearGanZhi}</span>
    </div>
    <div class="daily-sizhu-item">
      <span class="sizhu-label">月柱</span>
      <span class="sizhu-value">{monthGanZhi}</span>
    </div>
    <div class="daily-sizhu-item sizhu-day">
      <span class="sizhu-label">日柱</span>
      <span class="sizhu-value">{dayGanZhi}</span>
      <span class="sizhu-note">今日</span>
    </div>
    <div class="daily-sizhu-item">
      <span class="sizhu-label">时柱</span>
      <span class="sizhu-value">{hourGanZhi}</span>
      <span class="sizhu-note">子时例</span>
    </div>
  </div>
  <div class="daily-ganzhi-grid">
    <div class="daily-ganzhi-item">
      <span class="label">日柱</span>
      <span class="value">{dayGanZhi}</span>
    </div>
    <div class="daily-ganzhi-item">
      <span class="label">五行</span>
      <span class="value">{wuxing}</span>
    </div>
    <div class="daily-ganzhi-item">
      <span class="label">纳音</span>
      <span class="value">{naYin}</span>
    </div>
    <div class="daily-ganzhi-item">
      <span class="label">冲煞</span>
      <span class="value">冲{chongZodiac}煞{方位}</span>
    </div>
  </div>
  <div class="daily-shenwei">
    <div class="daily-shenwei-item">
      <span class="label">喜神</span>
      <span class="value">{xiShen}</span>
    </div>
    <div class="daily-shenwei-item">
      <span class="label">财神</span>
      <span class="value">{caiShen}</span>
    </div>
    <div class="daily-shenwei-item">
      <span class="label">福神</span>
      <span class="value">{fuShen}</span>
    </div>
  </div>
  <p style="text-align:center; margin: 0.5rem 0; font-size: 0.9rem; color: var(--muted);">当日生肖：<strong>{zodiac}</strong></p>
  <div class="daily-yiji">
    <p class="daily-yi">{yi 列表，用 · 分隔}</p>
    <p class="daily-ji">{ji 列表，用 · 分隔}</p>
  </div>
  <div class="daily-shensha">
    <p class="daily-jishen">吉神宜趋：{jiShen 列表，用 · 分隔}</p>
    <p class="daily-xiongsha">凶煞宜忌：{xiongSha 列表，用 · 分隔}</p>
  </div>
  <p class="daily-interpretation">{2–4 句解读}</p>
</section>
```

**格式要点**：
- **四柱**必须用 `daily-sizhu` 横排展示（年/月/日/时），日柱加 `sizhu-day` 高亮，时柱标注"子时例"
- 干支详情用 `daily-ganzhi-grid` 四宫格展示（日柱/五行/纳音/冲煞），不要用纯文本 `<p>` 拼接
- 节气行 `daily-jieqi` 紧跟日期行：一般写「节气：{prev}（X月X日）— {next}（X月X日）」；若 `jieQi` 非空（当日即节气日），改写「节气：今日{jieQi}（X月X日）」
- 喜神/财神/福神方位用 `daily-shenwei` 三卡横排，紧随干支网格
- 吉神宜趋/凶煞宜忌用 `daily-shensha` 两行居中小字，紧随宜忌块；列表照实列全，用 ` · ` 分隔，不删减
- 当日生肖单独成行居中显示
- 宜/忌列表前缀由 CSS `::before` 自动渲染（◆ 宜 / ✕ 忌），HTML 中不需要写"宜："或"忌："
- 解读段用 `daily-interpretation` 类，会自动带左侧金色竖条和淡色背景

**解读段撰写要点**：
- 解释「为什么」宜这些、忌那些，而非堆砌术语
- 结合当日干支五行生克（如"甲木""丙火"，木生火主生发）
- 结合吉神/凶煞的象意（如"天德合主贵人""勾陈主阻滞但可化解"）
- 结合天神吉凶给出整体基调判断
- 当日恰逢节气或临近节气交接时，可纳入节气因素（如"立秋将至，金气渐旺"）
- 篇幅 2–4 句，不宜过长

### 第 4 步：撰写 B 段（生肖运势 · 当日主角）

主角 = 当日地支对应生肖（`zodiac` 字段）。结构模板：

```html
<section class="daily-zodiac">
  <h2>生肖运势 · {zodiac}</h2>
  <p>{一段运势：事业/财运/人际/健康择要，结合当日宜忌与冲煞}</p>
  <p class="daily-zodiac-others">其他生肖的今日运势，可于评论区留言你所问之事，后续将开放问答。</p>
</section>
```

**运势段撰写要点**：
- 开头点明「本日地支为 X，X 对应生肖 Y，故今日主角为 Y」
- 结合当日宜忌推演（如宜"开市交易"→财运段强调经营签约有利）
- 结合冲煞提醒（如"冲兔煞东"→忌东方远行、忌与属兔者争执）
- 篇幅一段（4–6 句），不堆砌通用模板话

### 第 5 步：撰写 C 段（玄学科普 / 典故）

围绕当日主题写一段科普或故事。结构模板：

```html
<section class="daily-story">
  <h2>玄学科普</h2>
  <p>{围绕当日干支/节气/神煞/典故的一段科普}</p>
</section>
```

**选题方向（每日轮换，避免重复）**：
- 当日吉神/凶煞的含义（如"天德合是什么"）
- 干支五行的生克关系
- 建除十二神的由来与轮值规律
- 节气与黄历的关系（按节气时点写）
- 历史命理典故、民俗逸事
- 纳音的象意解读

篇幅一段，既要有知识增量，又要通俗可读。

### 第 6 步：撰写英文版

中文三段完成后，撰写结构完全对应的英文版 `YYYY-MM-DD.en.html`：
- DOM 结构与中文一致（相同的 section class、相同的标签层级）
- 干支术语保留「拼音 + 汉字」（如 `Jǐ Yǒu 己酉`）
- 生肖用「英文 + 汉字」（如 `Rooster 鸡`）
- 宜忌项用英文意译（如"纳财"→"collecting wealth"）
- 节气行用英文节气名 + 汉字（如 `Major Heat (大暑)`），日期简写（如 `Jul 23`）
- 方位神标签用 Joy God / Wealth God / Fortune God，方位用普通英文（East / Northeast 等）
- 神煞名用「拼音 + 汉字」（如 `Qīnglóng 青龙`），前缀用 Auspicious spirits / Inauspicious spirits
- 文案按英文习惯重写，非逐字直译

### 第 7 步：注册文章并提交审核

1. 在 `src/pages/daily.ts` 顶部加两条 import：
   ```ts
   import dailyYYYYMMDDZh from "../content/daily/YYYY-MM-DD.zh.html";
   import dailyYYYYMMDDEn from "../content/daily/YYYY-MM-DD.en.html";
   ```
2. 在 `DAILY_POSTS` 数组**开头**（保持倒序）加一条：
   ```ts
   {
     date: "YYYY-MM-DD",
     meta: {
       zh: { title: "YYYY年M月D日宜忌·{生肖}", description: "{含日期+核心宜忌+生肖+科普主题的简介}" },
       en: { title: "Daily Almanac — Month Day, YYYY ({Zodiac})", description: "{对应英文简介}" },
     },
     content: { zh: dailyYYYYMMDDZh, en: dailyYYYYMMDDEn },
   },
   ```
3. 运行 `npm test` + `npm run typecheck` 确认通过
4. 把 diff 交给用户审核
5. 用户审核通过 → git push → Cloudflare 自动部署

## 用户审核重点（三看）

1. **双语齐全**：zh.html + en.html 两文件都在，三段结构对应
2. **三段齐全**：daily-almanac / daily-zodiac / daily-story 三个 section 都有
3. **数据一致**：A 段的宜忌、生肖、冲煞与 `npm run almanac` 输出一致

## 文件命名规范

- 中文：`src/content/daily/YYYY-MM-DD.zh.html`
- 英文：`src/content/daily/YYYY-MM-DD.en.html`
- 日期用 ISO 格式（月、日补零，如 `2026-08-03` 不是 `2026-8-3`）

## HTML 约定

- 只写正文片段，不含 `<html>`/`<head>`/`<body>` 标签
- 文本中的 `&` 写成 `&amp;`（HTML 转义纪律）
- 动态强调用 `<strong>`，不用 `<b>`
- 三段用语义化 `<section>` 包裹，class 固定为 `daily-almanac` / `daily-zodiac` / `daily-story`
- **A 段必须使用「老黄历通胜式」结构**（见第 3 步模板），核心要素：
  - `daily-jieqi` 节气行（日期行下方）
  - `daily-sizhu` 四柱横排：年/月/日/时（日柱 `sizhu-day` 高亮，时柱标注子时例）
  - `daily-ganzhi-grid` 四宫格：日柱 / 五行 / 纳音 / 冲煞
  - `daily-shenwei` 喜神/财神/福神方位三卡（干支网格之后）
  - 当日生肖单独居中行
  - `daily-yi` / `daily-ji` 宜忌块（CSS 自动加前缀图标）
  - `daily-shensha` 吉神宜趋/凶煞宜忌行（宜忌块之后）
  - `daily-interpretation` 解读块（带左侧金色竖条）
- **禁止使用旧版纯文本 `<p>` 拼接干支信息**的写法（已废弃）

## 视觉样式说明

所有每日内容页面共用 `public/assets/style.css` 中的「老黄历通胜式」样式（选择器以 `.daily-` 开头），无需在 HTML 中写内联样式（除模板中标注的生肖行外）。

| 区域 | CSS 类 | 视觉特征 |
|---|---|---|
| 黄历主体 | `.daily-almanac` | 金色双线边框 + 顶部/底部装饰线 + 阴影 |
| 节气行 | `.daily-jieqi` | 居中小字，灰色弱化 |
| **四柱** | `.daily-sizhu` > `.daily-sizhu-item` | 横排 4 卡片，日柱金色高亮（`sizhu-day`） |
| 干支网格 | `.daily-ganzhi-grid` > `.daily-ganzhi-item` | 2×2 卡片网格，淡色背景 |
| 方位神 | `.daily-shenwei` > `.daily-shenwei-item` | 横排 3 卡片，方位值朱红色 |
| 宜 | `.daily-yi` | 朱红左侧竖条 + 浅红背景 + ◆ 图标 |
| 忌 | `.daily-ji` | 灰色左侧竖条 + 浅灰背景 + ✕ 图标 |
| 神煞行 | `.daily-shensha` | 居中小字两行，吉神朱红 / 凶煞灰 |
| 解读 | `.daily-interpretation` | 金色左侧竖条 + 渐变背景 |
| 生肖运势 | `.daily-zodiac` | 左侧金色粗边框 + ♔ 图标 |
| 科普 | `.daily-story` | 虚线底分隔 + 📜 图标 |

## 常见问题

**Q: 如果宜或忌的列表很长，怎么办？**
A: 照实列出全部，用 ` · `（中点）分隔。这是权威数据，不应删减。列表长恰恰说明今日利于多事。

**Q: 解读段能否给出具体建议（如"今日适合搬家吗"）？**
A: 可以，但基于宜忌列表推导，不要脱离数据编造。如宜"移徙"则可说"今日适合搬迁"。

**Q: 同一天可以写多篇吗？**
A: 不行。一个日期对应一篇文章，URL 唯一。如需补发漏掉的日子，用对应历史日期补写。

**Q: 写错了已发布的内容怎么办？**
A: 直接修改对应 HTML 文件，git push 重新部署即可。`dateModified` 与 `datePublished` 目前相同（均为日期），如未来需要区分可扩展。

## 禁止事项

- **禁止凭记忆推算干支/宜忌**：一律以 `npm run almanac` 输出为准
- **禁止调用 LLM 接口**：每日栏目零运行时 LLM，所有文案在生成时烘焙进静态 HTML
- **禁止只写一种语言**：中英必须齐全
- **禁止改动 scripts/almanac.ts 的宜忌逻辑**：宜忌数据来自 lunar-javascript 库，是受控常量；如发现数据有误，核实后改库版本或脚本，不要在内容层面"手动纠正"
