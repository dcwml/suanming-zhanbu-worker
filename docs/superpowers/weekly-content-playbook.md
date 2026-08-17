# 周运内容生产手册（Weekly Content Playbook）

> 当用户说"写周运"/"写本周运势"/"写下周运势"时，严格按本手册执行。本手册是每周可复用的操作流程，非一次性工程文档。

## 栏目定位

- **发布节奏**：每周日发布，覆盖下一周（周一 ~ 周日）。用户说"写本周运势"且当天是周日时，目标周 = 明天起的那一周；其他情况先与用户确认目标周的周一日期。
- **URL**：`/:lang/weekly/YYYY-MM-DD/`，其中 `YYYY-MM-DD` 固定为**该周周一**的日期（一周的唯一键）。
- **数据权威**：一切历法数据来自 `npm run fortune:week -- <周一日期>` 的输出（底层是 lunar-javascript + `src/fortune/rules.ts`，有单测）。**禁止凭记忆推算干支、冲煞、吉运排序。**
- **文风参照**：传统黄历口吻，吉凶判断必须能回溯到生成器数据；不虚构、不夸张、不承诺具体结果。

## 触发条件

用户说出以下任一意图即触发：
- "写周运" / "写本周运势" / "写下周运势" / "写每周运势"
- "写 YYYY-MM-DD 那周的周运"（该日期必须是周一）
- 其他等价表达

## 标准流程（7 步）

### 第 1 步：确定目标周的周一

- 用户给了日期 → 校验是否周一；不是则换算成该周周一（生成器也会报错并提示正确周一）
- 用户未给日期 → 推算：今天是周日 → 明天（下周一）；今天不是周日 → 本周一（写"本周"）或下周一（写"下周"），按用户措辞定，有歧义就问

### 第 2 步：生成周数据骨架

```powershell
npm run fortune:week -- YYYY-MM-DD
```

输出 JSON 是唯一权威数据源，关键字段：

| 字段 | 含义 | 用在哪里 |
|---|---|---|
| `week.monday` / `week.sunday` | 本周起止 | 标题、meta |
| `yearGanZhi` / `yearZodiac` | 年柱 / 年生肖 | 总览导语、忠告平局裁决 |
| `monthGanZhi` | 月柱 | 总览导语 |
| `days[7]` | 逐日：干支 / 五行 / 当日生肖 / 冲生肖 / 煞方 / 纳音 / 天神吉凶 / 宜忌 / 节气 | 冲忌速查 + 逐日速览 |
| `zodiacs[12]` | 每生肖：score / positives / negatives / relations（哪天六合/三合/冲/害/值日） | 生肖卡六维文案的事实依据 |
| `ranks.teJi` / `ranks.ciJi` / `ranks.zhonggao` | 特吉（3）/ 次吉（3）/ 忠告（1） | 总览 fortune-ranks |

### 第 3 步：理解评分规则（写作前必读，勿手算）

吉运排序由 `src/fortune/rules.ts` 自动算出（`pickFortuneRanks`），规则是：

1. 每个生肖对本周 7 天的日支逐一查关系：六合 / 三合 = 吉（+1 分），相冲 / 相害 = 凶（−1 分），值日 = 中性（0 分）
2. 按总分降序 → 正分天数降序 → 生肖固定序（鼠牛虎…）排序
3. 前 3 名 = 特吉，第 4–6 名 = 次吉
4. 总分最低者 = 忠告生肖；最低分并列时取**年生肖**（本命年压力）

写作时**直接采用 `ranks` 输出**，不要自己重算或调整名次。生肖卡文案里提到的每个"周X六合/相冲"都必须能在该生肖的 `relations` 里找到对应条目。

### 第 4 步：撰写中文版（四块结构）

文件：`src/content/weekly/YYYY-MM-DD.zh.html`。整体结构（以 2026-08-17 那篇为范本）：

```html
<h1>十二生肖一周运势（YYYY年M月D日–D日）</h1>
<section class="weekly-summary">
  <h2>本周运势总览</h2>
  <p>{导语：年月柱 + 本周地支走势 + 节气/民俗亮点}</p>
  <div class="fortune-ranks">
    <p class="rank-row"><span class="rank-label rank-te">特吉生肖</span><span class="rank-value">{ranks.teJi 用 · 连接}</span></p>
    <p class="rank-row"><span class="rank-label rank-ci">次吉生肖</span><span class="rank-value">{ranks.ciJi}</span></p>
    <p class="rank-row"><span class="rank-label rank-warn">本周忠告</span><span class="rank-value">{ranks.zhonggao}</span></p>
  </div>
  <p class="weekly-advice">{忠告生肖的 2–3 句提醒，点出具体哪几天不利、为什么}</p>
  <div class="weekly-clash">
    <h3 class="clash-title">本周冲忌速查</h3>
    <ul class="clash-list">{7 个 <li>：周X（M月D日）冲{生肖}，煞{方}</li>}</ul>
    <p class="clash-note">当日所冲生肖宜低调，避免嫁娶、开业、远行等重大事项；煞方该日不宜动土、修造、噪音施工。</p>
  </div>
</section>
<section class="weekly-zodiacs">
  <h2>十二生肖一周运势</h2>
  <div class="zodiac-grid">
    <!-- 12 张卡片，固定顺序：鼠牛虎兔龙蛇马羊猴鸡狗猪 -->
    <article class="zodiac-card">
      <h3>{生肖}</h3>
      <p class="zodiac-line"><strong class="zodiac-dim">整体</strong>{1–2 句}</p>
      <p class="zodiac-line"><strong class="zodiac-dim">财运</strong>{1–2 句}</p>
      <p class="zodiac-line"><strong class="zodiac-dim">爱情</strong>{1–2 句}</p>
      <p class="zodiac-line"><strong class="zodiac-dim">事业</strong>{1–2 句}</p>
      <p class="zodiac-line"><strong class="zodiac-dim">健康</strong>{1–2 句}</p>
      <p class="zodiac-line"><strong class="zodiac-dim">建议</strong>{1 句}</p>
    </article>
  </div>
</section>
<section class="weekly-days">
  <h2>本周干支速览</h2>
  <!-- 7 个 day-row -->
  <div class="day-row">
    <h3 class="day-head">周X M月D日 · {dayGanZhi}日</h3>
    <p class="day-body">农历{lunar 月日}。冲{chongZodiac}煞{sha}，{tianShen}值日（{tianShenLuck}）。宜{yi 前几项}；忌{ji 前几项}。</p>
  </div>
  <p class="weekly-daily-link">逐日完整宜忌与吉凶时辰，见<a href="/zh/daily/">今日宜忌</a>栏目。</p>
</section>
<p class="weekly-note">以上内容侧重传统术数解读，具体应用请结合自身情况。</p>
```

**写作要点**：

- **导语**：写清年月柱、本周 7 个日支的走势、节气或民俗节点（如七夕、处暑）
- **生肖卡**：每个维度都要落到数据——"周X六合/三合/相冲/相害/值日"，并引用当天天神吉凶（如"周六金匮日"）。吉神日推吉事、凶日提醒规避；无任何 relation 的维度写平稳基调即可，不要硬编故事
- **逐日速览**：宜忌列表只取前 5–8 项，超出写"等"；遇"馀事勿取"必须如实标注；节气日（`jieQi` 非空）在 day-body 里点出
- **忠告段**：指出具体凶日（冲日、害日、凶神日）与建议规避的动作
- **免责尾注**：固定措辞「以上内容侧重传统术数解读，具体应用请结合自身情况。」

### 第 5 步：撰写英文版

文件：`src/content/weekly/YYYY-MM-DD.en.html`，结构与中文逐一对应：

- DOM 结构、class、卡片顺序完全一致
- 干支用「拼音 + 汉字」（`Jiǎ Zǐ 甲子`），生肖用英文（Rat/Ox/Tiger/Rabbit/Dragon/Snake/Horse/Goat/Monkey/Rooster/Dog/Pig）
- 关系术语固定译法：六合 six-harmony、三合 trinity、相冲 clash(ed)、相害 harm、值日 duty day
- 天神固定译法：青龙 Azure Dragon、明堂 Bright Hall、天刑 Heavenly Punishment、朱雀 Vermilion Bird、金匮 Golden Chest、天德 Heavenly Virtue、勾陈 Hook Array；其余十二建神参照此风格
- 冲忌速查格式：`Monday (Aug 17) clashes Snake — sha direction West`
- 「馀事勿取」译作 `the almanac marks nothing else advisable`
- 免责尾注固定：`Content is grounded in traditional divination arts — please apply it in light of your own circumstances.`
- 文案按英文习惯重写，非逐字直译

### 第 6 步：注册文章

1. `src/pages/weekly.ts` 顶部加两条 import：
   ```ts
   import weeklyYYYYMMDDZh from "../content/weekly/YYYY-MM-DD.zh.html";
   import weeklyYYYYMMDDEn from "../content/weekly/YYYY-MM-DD.en.html";
   ```
2. 在 `WEEKLY_POSTS` 数组**开头**（保持倒序）加一条：
   ```ts
   {
     monday: "YYYY-MM-DD",
     meta: {
       zh: { title: "十二生肖一周运势（YYYY年M月D日–D日）", description: "{日期范围+特吉/次吉/忠告生肖+逐日亮点的简介}" },
       en: { title: "Weekly Horoscope for All 12 Zodiacs — Mon D–Sun D, YYYY", description: "{对应英文简介}" },
     },
     content: { zh: weeklyYYYYMMDDZh, en: weeklyYYYYMMDDEn },
   },
   ```
3. 路由 / SEO / sitemap / 导航**全部自动派生**，不要手写任何 meta 标签或 sitemap 条目

### 第 7 步：验证与提交

1. `npm test` + `npm run typecheck` 全绿
2. 把 diff 交给用户审核（重点：双语齐全、12 卡片齐全、六维齐全、所有关系日期与生成器 JSON 一致）
3. 审核通过 → git push → Cloudflare 自动部署

## 与每日栏目的关系

- 周运"逐日速览"是**自含**的（每日一段），不链接到尚未写出的 daily 单篇
- 尾部统一链到 `/zh/daily/`（或 `/en/daily/`）归档页
- 周运与某日 daily 文章对同一天的描述必须一致（同源于 almanac，不冲突即可）

## 常见问题

**Q: 特吉/次吉名次与直觉不符怎么办？**
A: 以生成器输出为准。评分规则已回测对齐过成熟公众号（黄大仙祠 2026-08-17 周运）的排序，不要手动调整。

**Q: 某生肖本周没有任何 relation 怎么办？**
A: 不可能——7 个日支覆盖 7 个生肖关系，其余 5 个生肖中多数至少有一个值日/三合/害。若某生肖 relations 只有一两个且都是中性，六维就写平稳基调。

**Q: 忠告生肖该写多狠？**
A: 指出具体凶日 + 建议规避动作即可，不写恐吓性断语。参照 2026-08-17 周运的属马段。

**Q: 写错已发布内容怎么办？**
A: 直接改对应 HTML，push 重新部署。

## 禁止事项

- **禁止手算干支/冲煞/排名**：一律以 `npm run fortune:week` 输出为准
- **禁止调用 LLM 接口**：零运行时 LLM，文案在生成时烘焙进静态 HTML
- **禁止只写一种语言**：中英必须齐全且结构对应
- **禁止链接未发布的 daily 单篇**：只链归档页
