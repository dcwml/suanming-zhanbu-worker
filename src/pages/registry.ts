import type { Lang } from "../config/site";
import homeZh from "../content/home.zh.html";
import homeEn from "../content/home.en.html";
import baziZh from "../content/bazi.zh.html";
import baziEn from "../content/bazi.en.html";
import ziweiZh from "../content/ziwei.zh.html";
import ziweiEn from "../content/ziwei.en.html";
import hehunZh from "../content/hehun.zh.html";
import hehunEn from "../content/hehun.en.html";
import mingliZh from "../content/mingli.zh.html";
import mingliEn from "../content/mingli.en.html";
import liuyaoZh from "../content/liuyao.zh.html";
import liuyaoEn from "../content/liuyao.en.html";
import meihuaZh from "../content/meihua.zh.html";
import meihuaEn from "../content/meihua.en.html";
import xiaoliurenZh from "../content/xiaoliuren.zh.html";
import xiaoliurenEn from "../content/xiaoliuren.en.html";
import divinationZh from "../content/divination.zh.html";
import divinationEn from "../content/divination.en.html";
import zejiZh from "../content/zeji.zh.html";
import zejiEn from "../content/zeji.en.html";
import notfoundZh from "../content/notfound.zh.html";
import notfoundEn from "../content/notfound.en.html";

export interface PageMeta {
  title: string;
  description: string;
}

export interface PageEntry {
  /** URL 段；"" 表示首页 */
  slug: string;
  /** 是否出现在顶部导航 */
  inNav: boolean;
  /** JSON-LD @type，默认 WebPage */
  jsonldType?: "Article" | "FAQPage";
  meta: Record<Lang, PageMeta>;
  content: Record<Lang, string>;
  /** 页内 FAQ 问答（存在时 head 自动注入 FAQPage JSON-LD） */
  faq?: Record<Lang, { question: string; answer: string }[]>;
}

export const PAGES: readonly PageEntry[] = [
  {
    slug: "",
    inNav: true,
    meta: {
      zh: { title: "首页", description: "玄命阁：在线八字排盘与六爻起卦，天干地支、五行入门。" },
      en: { title: "Home", description: "Xuanming Pavilion: free BaZi chart reading and I Ching casting, with introductions to Heavenly Stems, Earthly Branches and the Five Elements." },
    },
    content: { zh: homeZh, en: homeEn },
  },
  {
    slug: "bazi",
    // 顶部导航改走「命理」下拉（见 layout/nav.ts），不再出现在平铺链接里
    inNav: false,
    meta: {
      zh: { title: "八字排盘", description: "在线八字排盘：四柱十神、大运流年，AI 智能解读命局走势。" },
      en: { title: "BaZi Chart", description: "Free BaZi Four-Pillars calculator with AI readings of your chart, luck cycles and yearly outlook." },
    },
    content: { zh: baziZh, en: baziEn },
  },
  {
    slug: "ziwei",
    // 经「命理」下拉进入（见 layout/nav.ts），不在平铺导航里
    inNav: false,
    meta: {
      zh: { title: "紫微斗数", description: "在线紫微斗数排盘：十二宫星曜、四化飞星、大限流年，AI 智能解读命盘走势。" },
      en: { title: "Zi Wei Dou Shu", description: "Free Zi Wei Dou Shu (Purple Star Astrology) chart calculator with AI readings of your natal chart, decade luck and yearly outlook." },
    },
    content: { zh: ziweiZh, en: ziweiEn },
    faq: {
      zh: [
        {
          question: "什么是紫微斗数？它与八字有什么区别？",
          answer: "紫微斗数是中国传统命理的一支，以出生时间排出十二宫星盘，用紫微、天机等十四主星与诸辅星的庙旺落陷和四化飞星来推演人生各领域。八字则以四柱干支的五行生克论命局。两者同出传统命理，视角不同：八字长于五行气势与岁运起伏，紫微长于逐宫细看人生领域。",
        },
        {
          question: "排盘为什么要填性别和出生时辰？",
          answer: "紫微斗数的大限顺逆由性别与阴阳年决定，命宫与身宫的位置由出生时辰决定，时辰差一个盘就完全不同，所以这两项都是必填。",
        },
        {
          question: "三段解读（命盘/大限/流年）分别看什么？",
          answer: "命盘总览看一生格局：命宫三方四正的高低与各宫要点；大限看当下十年：重心宫位与大限四化引动的变化；流年看今年：流年四化落宫引发的运势要点。三者由远及近、层层聚焦。",
        },
        {
          question: "AI 解读权威吗？",
          answer: "排盘遵循传统紫微斗数安星规则，解读由 AI 基于传统斗数文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。",
        },
      ],
      en: [
        {
          question: "What is Zi Wei Dou Shu, and how does it differ from BaZi?",
          answer: "Zi Wei Dou Shu (Purple Star Astrology) is a branch of traditional Chinese destiny study: it casts a twelve-palace star chart from the birth time and reasons through the brightness and four transformations of fourteen major stars such as Zi Wei and Tian Ji. BaZi, by contrast, reads destiny through the five-element interplay of the Four Pillars. Both come from the same tradition but look from different angles — BaZi excels at elemental momentum and luck cycles, while Zi Wei examines each life area palace by palace.",
        },
        {
          question: "Why does the form ask for gender and birth hour?",
          answer: "The forward or backward flow of decade luck is fixed by gender combined with the yin/yang polarity of the birth year, and the positions of the Life and Body palaces are fixed by the birth hour — shift the hour by one and the whole chart changes. Both fields are therefore required.",
        },
        {
          question: "What do the three readings (natal chart / decade / year) cover?",
          answer: "The natal overview reads the lifelong structure — the stature of the Life Palace and its trine palaces plus key points for each palace; the decade reading covers the current ten years — its focus palaces and what the decade's four transformations activate; the yearly reading covers this year — where the annual four transformations fall and what they stir. The three move from far to near, each zooming in.",
        },
        {
          question: "Are the AI readings authoritative?",
          answer: "The chart casting follows traditional Zi Wei star-placement rules; the reading is generated by AI drawing on classical Zi Wei literature and is offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.",
        },
      ],
    },
  },
  {
    slug: "hehun",
    // 经「命理」下拉进入（见 layout/nav.ts），不在平铺导航里
    inNav: false,
    meta: {
      zh: { title: "八字合婚", description: "在线八字合婚：男女双方四柱排盘，年支生肖、日柱干支、五行互补逐层对照，AI 智能解读婚配指数与相处建议。" },
      en: { title: "BaZi Marriage Compatibility", description: "Free BaZi marriage compatibility matching for a couple — year-branch, day-pillar and five-element pairings with an AI reading of harmony and advice." },
    },
    content: { zh: hehunZh, en: hehunEn },
    faq: {
      zh: [
        {
          question: "八字合婚主要看什么？",
          answer: "传统合婚以年支（生肖）与日柱干支的配合为核心，再看两人五行是否互补：年支六合、三合为佳，相冲、相害需要更多磨合；日柱天干五合、地支相合情缘较深；一方所缺的五行恰是另一方的旺五行，相处起来更省力。本工具按这三层逐项对照。",
        },
        {
          question: "合婚结果「不合」还能结婚吗？",
          answer: "合婚反映的是传统命理视角下的相处磨合点，不是判决书。年支相冲但日柱相合、五行互补的组合很常见，关键在于了解差异、用心经营。婚恋是重大人生决定，请结合现实情况综合判断。",
        },
        {
          question: "需要准备什么信息？",
          answer: "男女双方的出生日期与时辰，公历、农历均可输入。时辰影响时柱与五行统计，越准确解读越贴切；时辰不确定时，可选最接近的时段。",
        },
        {
          question: "AI 解读权威吗？",
          answer: "排盘遵循传统干支历法，解读由 AI 基于传统合婚文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。",
        },
      ],
      en: [
        {
          question: "What does BaZi marriage compatibility look at?",
          answer: "Traditional compatibility reading centres on the pairing of the year branches (zodiac signs) and the day pillars, then on whether the two charts' five elements complement each other: six-harmony and three-harmony year branches bode well, while clashes and harms call for more patient adjustment; a five-union of day stems or harmonious day branches suggests a deep bond; an element one chart lacks but the other has in strength makes daily life easier. This tool compares all three layers one by one.",
        },
        {
          question: "If the result says we are \"not compatible\", should we not marry?",
          answer: "The reading shows where the relationship needs patient adjustment from the traditional BaZi viewpoint — it is not a verdict. Charts with clashing year branches yet harmonious day pillars and complementary elements are common; what matters is understanding the differences and working on them. Marriage is a major life decision — please weigh it in light of your real circumstances.",
        },
        {
          question: "What information do I need to prepare?",
          answer: "Both persons' birth dates and hours; solar or lunar input both work. The hour decides the hour pillar and the element tally, so the more precise, the closer the reading; if unsure of the hour, pick the closest slot.",
        },
        {
          question: "Are the AI readings authoritative?",
          answer: "The chart casting follows the traditional stem-branch calendar; the reading is generated by AI drawing on classical compatibility literature and is offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.",
        },
      ],
    },
  },
  {
    slug: "mingli",
    // 命理总览页：经「命理」下拉标题进入（见 layout/nav.ts），不在平铺导航里
    inNav: false,
    meta: {
      zh: { title: "命理工具", description: "三种在线命理工具怎么选：八字排盘、紫微斗数、八字合婚的看盘视角、适合问题与特点对比，AI 智能解读。" },
      en: { title: "Destiny Tools", description: "How to choose among three online destiny tools — BaZi charting, Zi Wei Dou Shu and BaZi marriage matching — compared by what they read, best-fit questions and style, with AI readings." },
    },
    content: { zh: mingliZh, en: mingliEn },
    faq: {
      zh: [
        {
          question: "命理工具和占卜工具有什么区别？",
          answer: "命理工具（八字、紫微、合婚）以出生时间为本，看的是先天命局与长期格局；占卜工具（六爻、梅花、小六壬）针对具体事项问卦，看的是一时一事的吉凶趋势。想了解自身格局用命理，想问某件具体的事用占卜。",
        },
        {
          question: "八字排盘和紫微斗数怎么选？",
          answer: "两者同出传统命理，视角不同：八字以四柱干支的五行生克见长，适合看五行气势与大运流年起伏；紫微以十二宫星曜见长，适合逐宫细看事业、财帛、婚姻等人生领域。想快速把握整体走势选八字，想分领域细看选紫微。",
        },
        {
          question: "八字合婚适合什么场景？",
          answer: "婚恋前的参考了解：对两人年支生肖配合、日柱干支合冲、五行互补情况逐层对照，并给出相处建议。适合想了解彼此磨合点的情侣，以及婚前希望多一个传统视角参考的伴侣。",
        },
        {
          question: "AI 解读权威吗？",
          answer: "排盘遵循传统历法与安星规则，解读由 AI 基于传统命理文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。",
        },
      ],
      en: [
        {
          question: "How do destiny tools differ from divination tools?",
          answer: "Destiny tools (BaZi, Zi Wei Dou Shu, marriage matching) take the birth time as their foundation and read the natal pattern over the long run; divination tools (I Ching, Plum Blossom, Xiao Liu Ren) answer a specific matter at hand and read the trend of that one affair. To understand your own makeup, use destiny tools; to ask about a concrete matter, use divination.",
        },
        {
          question: "BaZi chart or Zi Wei Dou Shu — which should I pick?",
          answer: "Both grow from traditional destiny study but look from different angles: BaZi excels at the five-element interplay of the Four Pillars, suiting a view of elemental momentum and the rise and fall of luck cycles; Zi Wei excels at its twelve palaces and stars, suiting a palace-by-palace look at career, wealth, marriage and other life areas. For a quick grasp of the overall arc choose BaZi; for area-by-area detail choose Zi Wei.",
        },
        {
          question: "When is BaZi marriage matching useful?",
          answer: "As a reference before marriage or during courtship: it compares the couple's year-branch pairing, day-pillar harmony or clash and five-element complementarity layer by layer, with advice for getting along. It suits couples who want to understand their friction points, and partners who want one more traditional viewpoint before tying the knot.",
        },
        {
          question: "Are the AI readings authoritative?",
          answer: "The chart casting follows traditional calendar and star-placement rules; the reading is generated by AI drawing on classical destiny literature and is offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.",
        },
      ],
    },
  },
  {
    slug: "liuyao",
    // 顶部导航改走「占卜」下拉（见 layout/nav.ts），不再出现在平铺链接里
    inNav: false,
    meta: {
      zh: { title: "六爻起卦", description: "在线六爻起卦：铜钱摇卦、周易卦辞，AI 智能解读吉凶趋势。" },
      en: { title: "I Ching Casting", description: "Free online I Ching coin-toss hexagram casting with AI-powered readings." },
    },
    content: { zh: liuyaoZh, en: liuyaoEn },
  },
  {
    slug: "meihua",
    inNav: false,
    meta: {
      zh: { title: "梅花易数", description: "在线梅花易数：以当下时刻或两个数字起卦，排本卦、互卦、变卦与体用五行，AI 智能解读吉凶趋势。" },
      en: { title: "Plum Blossom Numerology", description: "Free Plum Blossom Numerology (Meihua Yishu) casting by the present time or two numbers — primary, mutual and changed hexagrams with body-application five-element AI readings." },
    },
    content: { zh: meihuaZh, en: meihuaEn },
  },
  {
    slug: "xiaoliuren",
    inNav: false,
    meta: {
      zh: { title: "小六壬", description: "在线小六壬起课：以农历月日时或三个数字掐指起课，大安、留连、速喜、赤口、小吉、空亡六宫定吉凶，AI 智能解读趋势。" },
      en: { title: "Xiao Liu Ren Divination", description: "Free Xiao Liu Ren (Small Six Ren) casting by the current lunar month, day and hour or three numbers — six palaces of Da An, Liu Lian, Su Xi, Chi Kou, Xiao Ji and Kong Wang with AI readings." },
    },
    content: { zh: xiaoliurenZh, en: xiaoliurenEn },
  },
  {
    slug: "divination",
    // 占卜总览页：经「占卜」下拉标题进入（见 layout/nav.ts），不在平铺导航里
    inNav: false,
    meta: {
      zh: { title: "占卜工具", description: "三种在线占卜工具怎么选：六爻起卦、梅花易数、小六壬的起卦方式、适用问题与特点对比，AI 智能解读。" },
      en: { title: "Divination Tools", description: "How to choose among three online divination tools — I Ching casting, Plum Blossom Numerology and Xiao Liu Ren — compared by casting method, best-fit questions and style, with AI readings." },
    },
    content: { zh: divinationZh, en: divinationEn },
    faq: {
      zh: [
        {
          question: "三种占卜工具有什么区别？",
          answer: "三者同出易经象数之学：六爻以铜钱摇卦，卦辞爻辞逐层推演，适合具体事项的深入分析；梅花易数以时刻或数字起卦，讲究心动即占，起卦快、直取大意；小六壬以月日时掐指起课，六宫定吉凶，最适合眼前小事的快速验证。",
        },
        {
          question: "同一件事可以反复占卜吗？",
          answer: "传统观念讲究一事一占、不诚不占：同一件事在情况没有变化之前，不宜反复起卦；若事态已有新进展，可以重新起卦。",
        },
        {
          question: "什么样的问题适合占卜？",
          answer: "具体、有明确指向的问题更适合占卜，例如「这次洽谈能否谈成」；过于宽泛的问题，如「我这辈子怎么样」，卦象往往无从着力。",
        },
        {
          question: "AI 解读权威吗？",
          answer: "排盘起卦遵循传统规则，解读由 AI 基于传统易学文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。",
        },
      ],
      en: [
        {
          question: "What is the difference between the three tools?",
          answer: "All three come from the imagery-and-numbers school of the Yijing. I Ching casting tosses coins and reasons through the hexagram and line texts, suiting in-depth analysis of a concrete matter; Plum Blossom Numerology casts by the moment or by numbers and values divining at the stirring of a thought — fast and straight to the gist; Xiao Liu Ren counts off month, day and hour to land on one of six palaces, ideal for quickly checking small matters at hand.",
        },
        {
          question: "Can I cast again and again about the same matter?",
          answer: "Tradition holds one cast per matter, and only in sincerity: while nothing about the situation has changed, repeated casting is discouraged. Once the matter has genuinely moved on, a fresh cast is appropriate.",
        },
        {
          question: "What kind of question suits divination?",
          answer: "Specific, well-pointed questions work best — for example, \"will this negotiation succeed\". Questions too broad, such as \"how will my whole life turn out\", give the hexagram little to grip.",
        },
        {
          question: "Are the AI readings authoritative?",
          answer: "The casting follows traditional rules; the reading is generated by AI drawing on classical Yijing literature and is offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.",
        },
      ],
    },
  },
  {
    slug: "zeji",
    inNav: true,
    meta: {
      zh: { title: "择吉日", description: "在线择吉日：按黄历宜忌、黄黑道与避冲规则，为嫁娶、入宅、开市等事项挑选合适日子。" },
      en: { title: "Auspicious Date Finder", description: "Pick an auspicious date for weddings, moving, business opening and more, based on almanac yi/ji, the Yellow Road and clash avoidance." },
    },
    content: { zh: zejiZh, en: zejiEn },
    faq: {
      zh: [
        {
          question: "择吉日为什么要避冲？",
          answer: "冲指地支六冲（子午、丑未、寅申、卯酉、辰戌、巳亥）。日支冲本人年支的日子，传统上认为对当事人不利，办事宜避开。",
        },
        {
          question: "杨公忌日是什么？",
          answer: "相传为杨筠松所定的十三个不宜办事的日子，按农历固定月日循环，如正月十三、二月十一。本工具将其与月破日一并排除。",
        },
        {
          question: "黄道吉日是怎么定的？",
          answer: "以十二天神值日分黄道（吉）与黑道（凶），再参考建除十二神与二十八宿。排序靠前的日子在三项上整体更吉。",
        },
        {
          question: "这个工具的结果权威吗？",
          answer: "传统择吉流派众多、规则互有矛盾，本工具采用的是一套公开透明的规则集，解读侧重传统择吉推演，具体应用请结合自身情况。",
        },
      ],
      en: [
        {
          question: "Why avoid clashes when picking dates?",
          answer: "A clash means one of the six earthly-branch oppositions (zi-wu, chou-wei, yin-shen, mao-you, chen-xu, si-hai). Days whose branch clashes with your own year branch are traditionally considered unfavorable.",
        },
        {
          question: "What are Yang Gong taboo days?",
          answer: "Thirteen fixed lunar dates, said to be set by Yang Junsong, regarded as unsuitable for important affairs — e.g. the 13th of the first lunar month. This tool excludes them together with Month-Broken days.",
        },
        {
          question: "How are Yellow Road lucky days determined?",
          answer: "Twelve celestial officers take turns presiding over days, split into the Yellow Road (auspicious) and Black Road (inauspicious), refined by the Twelve Day Officers and the 28 lunar mansions. Higher-ranked days score better across all three.",
        },
        {
          question: "Are this tool's results authoritative?",
          answer: "Traditional date-selection schools disagree with each other. This tool applies one transparent rule set; the results reflect traditional date-selection reasoning — please apply them in light of your own circumstances.",
        },
      ],
    },
  },
];

export const NOT_FOUND_CONTENT: Record<Lang, string> = {
  zh: notfoundZh,
  en: notfoundEn,
};

export function findPage(slug: string): PageEntry | undefined {
  return PAGES.find((p) => p.slug === slug);
}

export function navPages(): PageEntry[] {
  return PAGES.filter((p) => p.inNav);
}
