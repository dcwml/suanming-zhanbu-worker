# 月运内容生产手册（Monthly Content Playbook）

> 当用户说"写月运"/"写本月运势"/"写下月运势"时，严格按本手册执行。本手册是每月可复用的操作流程，非一次性工程文档。

## 栏目定位

- **发布节奏**：每月最后一天发布，覆盖下一个月。用户说"写本月运势"时先确认目标月份（`YYYY-MM`）。
- **URL**：`/:lang/monthly/YYYY-MM/`，`YYYY-MM` 即目标月份。
- **数据权威**：一切历法数据来自 `npm run fortune:month -- YYYY-MM` 的输出（底层是 lunar-javascript + `src/fortune/rules.ts`，有单测）。**禁止凭记忆推算月柱、节气、吉日。**
- **与周运的分工**：月运更宏观——月柱/节气定基调、生肖按与月支的关系（六合/三合/冲/害/值月）展开、附吉日速查表；不重复周运的逐日内容。

## 触发条件

用户说出以下任一意图即触发：
- "写月运" / "写本月运势" / "写下月运势" / "写每月运势"
- "写 YYYY-MM 的月运"
- 其他等价表达

## 标准流程（7 步）

### 第 1 步：确定目标月份

- 用户给了月份 → 直接用（格式 `YYYY-MM`）
- 用户未给 → 月末最后一天发布时默认下一个月；有歧义就问

### 第 2 步：生成月数据骨架

```powershell
npm run fortune:month -- YYYY-MM
```

输出 JSON 是唯一权威数据源，关键字段：

| 字段 | 含义 | 用在哪里 |
|---|---|---|
| `monthGanZhi` / `monthBranch` | 月柱 / 月支（取月中第 15 天） | 标题、导语 |
| `monthPillarSegments` | 月柱分段（跨节气的月份有两段） | 导语 |
| `jieQiInMonth` | 月内节气（名 + 日期） | 导语 |
| `monthBranchHelpers` | 月支的六合 / 三合 / 相冲 / 相害生肖 | fortune-ranks 四行 |
| `zodiacs[12]` | 每生肖的 `monthRelation`：六合/三合/相冲/相害/值月/null | 生肖卡基调 |
| `luckyDays` | 五类吉日：嫁娶订婚 / 入宅搬家 / 开业求财 / 出行 / 修造动土 | 吉日速查 |

`luckyDays` 的筛选规则（已内置于生成器）：天神为**吉**（青龙/明堂/金匮/天德/玉堂/司命）且所办事项在当日「宜」中、不在「忌」中。每个吉日带 `date` / `weekdayZh` / `dayGanZhi` / `chongZodiac` / `tianShen`。

### 第 3 步：理解生肖基调规则（写作前必读）

生肖与月支的关系决定该生肖本月的**基调**，由生成器直接给出（`monthRelation`）：

| 关系 | 基调 | 写作方向 |
|---|---|---|
| 六合 | 最顺 | 合作、签约、人缘全面向好；若合中带刑（巳申）须提醒细节 |
| 三合 | 大吉 | 贵人、团队、扩张 |
| 值月 | 强但自耗 | 机会多、责任重，防伏吟内耗（申见申等） |
| null（无关系） | 平稳 | 按五行气势写（如金旺之月对木肖的压力），不编吉凶 |
| 相害 | 防暗损 | 小人、漏财、误会，低调慎言 |
| 相冲 | 冲太岁月 | 波动、变动，以静制动，大事缓办 |

写作时**直接采用 `monthRelation` 输出**；六维文案的吉凶方向必须与基调一致，不要给相冲生肖写扩张建议、给相害生肖写冒进财运。

### 第 4 步：撰写中文版（四块结构）

文件：`src/content/monthly/YYYY-MM.zh.html`。整体结构（以 2026-08 那篇为范本）：

```html
<h1>YYYY年M月十二生肖每月运势（{monthGanZhi}月）</h1>
<section class="monthly-summary">
  <h2>本月运势总览</h2>
  <p class="monthly-intro">{月柱分段 + 节气 + 月支五行基调 + 月支与各生肖关系总述}。以下日期均为公历。</p>
  <div class="fortune-ranks">
    <p class="rank-row"><span class="rank-label rank-te">月支六合</span><span class="rank-value">{liuhe}</span></p>
    <p class="rank-row"><span class="rank-label rank-ci">月支三合</span><span class="rank-value">{sanhe 用 · 连接}</span></p>
    <p class="rank-row"><span class="rank-label rank-warn">月支相冲</span><span class="rank-value">{liuchong}</span></p>
    <p class="rank-row"><span class="rank-label rank-warn">月支相害</span><span class="rank-value">{liuhai}</span></p>
  </div>
</section>
<section class="monthly-zodiacs">
  <h2>十二生肖M月运势</h2>
  <div class="zodiac-grid">
    <!-- 12 张卡片，固定顺序：鼠牛虎兔龙蛇马羊猴鸡狗猪 -->
    <article class="zodiac-card">
      <h3>{生肖}</h3>
      <p class="zodiac-line"><strong class="zodiac-dim">整体</strong>{2–3 句，点明 monthRelation}</p>
      <p class="zodiac-line"><strong class="zodiac-dim">财运</strong>{2–3 句}</p>
      <p class="zodiac-line"><strong class="zodiac-dim">爱情</strong>{2–3 句}</p>
      <p class="zodiac-line"><strong class="zodiac-dim">事业</strong>{2–3 句}</p>
      <p class="zodiac-line"><strong class="zodiac-dim">健康</strong>{2–3 句，结合月令五行与脏腑}</p>
      <p class="zodiac-line"><strong class="zodiac-dim">建议</strong>{1–2 句}</p>
    </article>
  </div>
</section>
<section class="monthly-lucky">
  <h2>本月吉日速查</h2>
  <!-- 5 个 lucky-cat，顺序固定：嫁娶订婚 / 入宅搬家 / 开业求财 / 出行 / 修造动土 -->
  <div class="lucky-cat">
    <h3>{类别中文名}</h3>
    <p class="lucky-days">
      <span class="lucky-day">M月D日（周X）{dayGanZhi} · 冲{chongZodiac}</span>
      <!-- 该类别全部吉日，按日期升序 -->
    </p>
  </div>
</section>
<p class="monthly-note">以上吉日均取天神为吉、且所办之事在当日「宜」中之日；若当日所冲生肖恰为本人属相，宜另择吉日。内容侧重传统术数解读，具体应用请结合自身情况。</p>
```

**写作要点**：

- **导语**：写清月柱分段（如 8 月 1–6 仍是未月、7 日立秋交节入申月）、月内节气、月支五行基调（如"申月金气当令"）
- **生肖卡**：比周运深一档，每维 2–3 句；健康维度结合月令五行（秋月防燥、夏月防暑湿等）
- **吉日速查**：严格照抄生成器 `luckyDays` 的日期，不增不减；chip 格式固定 `M月D日（周X）{dayGanZhi} · 冲{生肖}`
- **免责尾注**：固定措辞（含"冲自己属相另择吉日"提示 + 标准免责句）

### 第 5 步：撰写英文版

文件：`src/content/monthly/YYYY-MM.en.html`，结构与中文逐一对应：

- DOM 结构、class、卡片顺序完全一致
- 月柱用「拼音 + 汉字」（`Bǐng Shēn 丙申`），节气用英文 + 汉字（`Start of Autumn (立秋)`）
- 关系术语与周运手册一致：six-harmony / trinity / clash(ed) / harm / presides over the month
- 健康建议按英文表达习惯重写（脏腑可用通俗对应：kidneys, digestion, airways 等）
- 吉日 chip 格式：`Aug 10 (Mon) Bǐng Chén · clashes Dog`
- 类别译名固定：Marriage & engagement / Moving & relocation / Business & wealth / Travel / Construction
- 免责尾注固定：`Every date listed carries an auspicious heavenly god on duty and includes the task in that day's "good for" list; if the day's clashed sign is your own, pick another date. Content is grounded in traditional divination arts — please apply it in light of your own circumstances.`

### 第 6 步：注册文章

1. `src/pages/monthly.ts` 顶部加两条 import：
   ```ts
   import monthlyYYYYMMZh from "../content/monthly/YYYY-MM.zh.html";
   import monthlyYYYYMMEn from "../content/monthly/YYYY-MM.en.html";
   ```
2. 在 `MONTHLY_POSTS` 数组**开头**（保持倒序）加一条：
   ```ts
   {
     month: "YYYY-MM",
     meta: {
       zh: { title: "YYYY年M月十二生肖每月运势（{月柱}月）", description: "{节气基调+月支关系亮点+吉日速查的简介}" },
       en: { title: "Monthly Horoscope for All 12 Zodiacs — Month YYYY", description: "{对应英文简介}" },
     },
     content: { zh: monthlyYYYYMMZh, en: monthlyYYYYMMEn },
   },
   ```
3. 路由 / SEO / sitemap / 导航**全部自动派生**，不要手写任何 meta 标签或 sitemap 条目

### 第 7 步：验证与提交

1. `npm test` + `npm run typecheck` 全绿
2. 把 diff 交给用户审核（重点：双语齐全、12 卡片齐全、六维齐全、吉日与生成器 JSON 逐条一致、生肖基调与 monthRelation 一致）
3. 审核通过 → git push → Cloudflare 自动部署

## 常见问题

**Q: 吉日太多/太少怎么办？**
A: 照实列出，不增不减。某类别为空时该 lucky-cat 整块省略（目前五类筛选条件下罕见）。

**Q: 月柱跨两个节气分段（如 8 月上旬还是上月月柱）怎么写？**
A: 导语如实写分段（生成器 `monthPillarSegments` 已给出），月支关系按 `monthBranch`（月中日）为准。

**Q: 生肖与月支无关系（null）写什么？**
A: 平稳基调 + 月令五行对该生肖地支的影响（如金月克木、水月泄金），不虚构贵人或灾厄。

**Q: 写错已发布内容怎么办？**
A: 直接改对应 HTML，push 重新部署。

## 禁止事项

- **禁止手算月柱/节气/吉日**：一律以 `npm run fortune:month` 输出为准
- **禁止调用 LLM 接口**：零运行时 LLM，文案在生成时烘焙进静态 HTML
- **禁止只写一种语言**：中英必须齐全且结构对应
- **禁止改动吉日筛选规则写内容**：规则在 `scripts/fortune.ts` 的 `LUCKY_CATEGORIES`，改规则是代码变更，须走测试
