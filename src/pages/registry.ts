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
import chouqianZh from "../content/chouqian.zh.html";
import chouqianEn from "../content/chouqian.en.html";
import huangdaxianZh from "../content/huangdaxian.zh.html";
import huangdaxianEn from "../content/huangdaxian.en.html";
import guanyinZh from "../content/guanyin.zh.html";
import guanyinEn from "../content/guanyin.en.html";
import yuelaoZh from "../content/yuelao.zh.html";
import yuelaoEn from "../content/yuelao.en.html";
import notfoundZh from "../content/notfound.zh.html";
import notfoundEn from "../content/notfound.en.html";
import aboutZh from "../content/about.zh.html";
import aboutEn from "../content/about.en.html";

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
      zh: { title: "八字排盘", description: "在线八字排盘：四柱十神、大运流年，为你详解命局走势。" },
      en: { title: "BaZi Chart", description: "Free BaZi Four-Pillars calculator with in-depth readings of your chart, luck cycles and yearly outlook." },
    },
    content: { zh: baziZh, en: baziEn },
  },
  {
    slug: "ziwei",
    // 经「命理」下拉进入（见 layout/nav.ts），不在平铺导航里
    inNav: false,
    meta: {
      zh: { title: "紫微斗数", description: "在线紫微斗数排盘：十二宫星曜、四化飞星、大限流年，为你详解命盘走势。" },
      en: { title: "Zi Wei Dou Shu", description: "Free Zi Wei Dou Shu (Purple Star Astrology) chart calculator with in-depth readings of your natal chart, decade luck and yearly outlook." },
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
          question: "解读结果可信吗？",
          answer: "排盘遵循传统紫微斗数安星规则，解读基于传统斗数文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。",
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
          question: "Are the readings authoritative?",
          answer: "The chart casting follows traditional Zi Wei star-placement rules; the reading draws on classical Zi Wei literature and is offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.",
        },
      ],
    },
  },
  {
    slug: "hehun",
    // 经「命理」下拉进入（见 layout/nav.ts），不在平铺导航里
    inNav: false,
    meta: {
      zh: { title: "八字合婚", description: "在线八字合婚：男女双方四柱排盘，年支生肖、日柱干支、五行互补逐层对照，为你详解婚配指数与相处之道。" },
      en: { title: "BaZi Marriage Compatibility", description: "Free BaZi marriage compatibility matching for a couple — year-branch, day-pillar and five-element pairings with a full reading of harmony and advice." },
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
          question: "解读结果可信吗？",
          answer: "排盘遵循传统干支历法，解读基于传统合婚文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。",
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
          question: "Are the readings authoritative?",
          answer: "The chart casting follows the traditional stem-branch calendar; the reading draws on classical compatibility literature and is offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.",
        },
      ],
    },
  },
  {
    slug: "mingli",
    // 命理总览页：经「命理」下拉标题进入（见 layout/nav.ts），不在平铺导航里
    inNav: false,
    meta: {
      zh: { title: "命理工具", description: "三种在线命理工具怎么选：八字排盘、紫微斗数、八字合婚的看盘视角、适合问题与特点对比，细说分明。" },
      en: { title: "Destiny Tools", description: "How to choose among three online destiny tools — BaZi charting, Zi Wei Dou Shu and BaZi marriage matching — compared by what they read, best-fit questions and style, with in-depth readings." },
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
          question: "解读结果可信吗？",
          answer: "排盘遵循传统历法与安星规则，解读基于传统命理文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。",
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
          question: "Are the readings authoritative?",
          answer: "The chart casting follows traditional calendar and star-placement rules; the reading draws on classical destiny literature and is offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.",
        },
      ],
    },
  },
  {
    slug: "liuyao",
    // 顶部导航改走「占卜」下拉（见 layout/nav.ts），不再出现在平铺链接里
    inNav: false,
    meta: {
      zh: { title: "六爻起卦", description: "在线六爻起卦：铜钱摇卦、周易卦辞，细解卦象吉凶。" },
      en: { title: "I Ching Casting", description: "Free online I Ching coin-toss hexagram casting with in-depth readings." },
    },
    content: { zh: liuyaoZh, en: liuyaoEn },
  },
  {
    slug: "meihua",
    inNav: false,
    meta: {
      zh: { title: "梅花易数", description: "在线梅花易数：以当下时刻或两个数字起卦，排本卦、互卦、变卦与体用五行，细解吉凶趋势。" },
      en: { title: "Plum Blossom Numerology", description: "Free Plum Blossom Numerology (Meihua Yishu) casting by the present time or two numbers — primary, mutual and changed hexagrams with body-application five-element readings." },
    },
    content: { zh: meihuaZh, en: meihuaEn },
  },
  {
    slug: "xiaoliuren",
    inNav: false,
    meta: {
      zh: { title: "小六壬", description: "在线小六壬起课：以农历月日时或三个数字掐指起课，大安、留连、速喜、赤口、小吉、空亡六宫定吉凶，细断祸福趋势。" },
      en: { title: "Xiao Liu Ren Divination", description: "Free Xiao Liu Ren (Small Six Ren) casting by the current lunar month, day and hour or three numbers — six palaces of Da An, Liu Lian, Su Xi, Chi Kou, Xiao Ji and Kong Wang with in-depth readings." },
    },
    content: { zh: xiaoliurenZh, en: xiaoliurenEn },
  },
  {
    slug: "divination",
    // 占卜总览页：经「占卜」下拉标题进入（见 layout/nav.ts），不在平铺导航里
    inNav: false,
    meta: {
      zh: { title: "占卜工具", description: "三种在线占卜工具怎么选：六爻起卦、梅花易数、小六壬的起卦方式、适用问题与特点对比，细说分明。" },
      en: { title: "Divination Tools", description: "How to choose among three online divination tools — I Ching casting, Plum Blossom Numerology and Xiao Liu Ren — compared by casting method, best-fit questions and style, with in-depth readings." },
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
          question: "解读结果可信吗？",
          answer: "排盘起卦遵循传统规则，解读基于传统易学文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。",
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
          question: "Are the readings authoritative?",
          answer: "The casting follows traditional rules; the reading draws on classical Yijing literature and is offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.",
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
  {
    slug: "chouqian",
    // 抽签总览页：经「抽签」下拉标题进入（见 layout/nav.ts），不在平铺导航里
    inNav: false,
    meta: {
      zh: { title: "灵签抽签", description: "在线灵签抽签：黄大仙、观音、月老三种百签签谱怎么选，摇筒抽签、按号查签，签诗典故与解签细说分明。" },
      en: { title: "Fortune Sticks Guide", description: "How to choose among three online oracle-stick sets — Wong Tai Sin, Guanyin and Yue Lao — with stick drawing, number lookup and in-depth readings." },
    },
    content: { zh: chouqianZh, en: chouqianEn },
    faq: {
      zh: [
        {
          question: "三种灵签有什么区别？",
          answer: "黄大仙灵签出自香港黄大仙祠，五等定吉凶，每签配古人典故，问事业财运等俗务尤宜；观音灵签流传最广，三级分明，日常百事皆可问；月老灵签出自杭州西湖月老祠，九等细分，专为情缘婚姻而设。",
        },
        {
          question: "求签和占卜有什么区别？",
          answer: "求签是「以签应问」：心中一事，摇筒落签，看签文如何回应；六爻、梅花等占卜是「以卦推事」：起卦之后逐层推演。想快速得一句指引用求签，想层层分析用占卜。",
        },
        {
          question: "同一件事可以反复求签吗？",
          answer: "传统讲究一事一签、不诚不占：同一件事在情况没有变化之前，不宜反复抽签；若事态已有新进展，可以再求。",
        },
        {
          question: "解签结果可信吗？",
          answer: "三种签文均取传统签谱的主流通行版本，解签基于传统签诗文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。",
        },
      ],
      en: [
        {
          question: "How do the three oracles differ?",
          answer: "Wong Tai Sin sticks come from Hong Kong's Wong Tai Sin Temple, read fortune in five grades and pair each stick with a classical tale — best for career and wealth; Guanyin sticks are the most widely circulated, reading three plain grades for everyday matters; Yue Lao sticks come from the shrine by West Lake in Hangzhou, dividing matters of the heart into nine fine grades.",
        },
        {
          question: "How does drawing sticks differ from hexagram casting?",
          answer: "Drawing a stick matches a question to a pre-written poem: one matter, one shake, one answer. Hexagram casting (I Ching, Plum Blossom) builds a hexagram and reasons through it line by line. For a quick pointer, draw a stick; for layered analysis, cast a hexagram.",
        },
        {
          question: "Can I draw repeatedly about the same matter?",
          answer: "Tradition asks one stick per matter, drawn in sincerity: while nothing about the situation has changed, repeated drawing is discouraged. Once the matter has genuinely moved on, a fresh draw is appropriate.",
        },
        {
          question: "Are the readings authoritative?",
          answer: "All three sets follow the widely circulated versions of the traditional oracles; the readings draw on classical oracle-stick literature and are offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.",
        },
      ],
    },
  },
  {
    slug: "huangdaxian",
    // 经「抽签」下拉进入（见 layout/nav.ts），不在平铺导航里
    inNav: false,
    meta: {
      zh: { title: "黄大仙灵签", description: "在线黄大仙灵签：摇筒抽签百签签文，上上至下下五等定吉凶，签诗典故与姻缘事业求财健康断语，细解分明。" },
      en: { title: "Wong Tai Sin Oracle Sticks", description: "Draw Wong Tai Sin oracle sticks online: one hundred sticks in five grades, each with a four-line poem, a classical tale and verdicts on marriage, career, wealth and health." },
    },
    content: { zh: huangdaxianZh, en: huangdaxianEn },
    faq: {
      zh: [
        {
          question: "黄大仙灵签是什么来历？",
          answer: "黄大仙即晋代道士黄初平，得道于浙江金华，后在香港建祠奉祀，以「有求必应」闻名。黄大仙灵签是祠内沿用百余年的百签签谱，签诗七言四句，每签配一则古人典故，是流传最广的庙宇签谱之一。",
        },
        {
          question: "签上的等级怎么看？",
          answer: "签分上上、上吉、中吉、中平、下下五等：上上最吉，百事可为；上吉吉多顺遂，可进而谋；中吉平顺向好，稳中有成；中平平平无奇，宜守常待时；下下凶多阻滞，宜守不宜进。断语部分再按姻缘、事业、求财、健康分述。",
        },
        {
          question: "在庙里求了签，能在这里查解吗？",
          answer: "可以。在「摇筒求签」旁的签号框输入 1 到 100 的签号，即可查阅该签签文与解签，与现场摇签所得的展示完全一致。",
        },
        {
          question: "解签结果可信吗？",
          answer: "签文为传统庙宇签谱的通行版本，解签基于传统签诗文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。",
        },
      ],
      en: [
        {
          question: "Where do the Wong Tai Sin oracle sticks come from?",
          answer: "Wong Tai Sin is the Jin-dynasty Taoist Huang Chuping, who attained the Way at Jinhua in Zhejiang and is honored in the Hong Kong temple that bears his name, famous for answering every sincere plea. The temple's hundred-stick set has been in use for over a century: each stick carries a four-line poem and a classical tale, making it one of the most widely circulated temple oracles.",
        },
        {
          question: "How do I read the grade on a stick?",
          answer: "Sticks fall into five grades: Supremely Auspicious (上上) — fortune favors most endeavors; Very Auspicious (上吉) — more gain than setback; Auspicious (中吉) — steady and promising; Neutral (中平) — even, keep steady and await timing; Very Inauspicious (下下) — heavy going, guard rather than advance. The verdicts then break matters down by marriage, career, wealth and health.",
        },
        {
          question: "Can I look up a stick I drew at a temple?",
          answer: "Yes. Enter its number (1–100) in the lookup box beside the tube, and the poem and reading shown will be exactly the same as one drawn here.",
        },
        {
          question: "Are the readings authoritative?",
          answer: "The stick texts follow the widely circulated temple version; the readings draw on classical oracle-stick literature and are offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.",
        },
      ],
    },
  },
  {
    slug: "guanyin",
    // 经「抽签」下拉进入（见 layout/nav.ts），不在平铺导航里
    inNav: false,
    meta: {
      zh: { title: "观音灵签", description: "在线观音灵签：摇筒抽签百签签文，上中下三级定吉凶，签诗典故与姻缘事业求财健康断语，细解分明。" },
      en: { title: "Guanyin Oracle Sticks", description: "Draw Guanyin oracle sticks online: one hundred sticks in three grades, each with a four-line poem, a classical tale and verdicts on marriage, career, wealth and health." },
    },
    content: { zh: guanyinZh, en: guanyinEn },
    faq: {
      zh: [
        {
          question: "观音灵签是什么来历？",
          answer: "观音灵签是民间流传最广的百签签谱之一，常见于各地观音道场与寺庙。签诗七言四句，配古人典故，以三级定吉凶：上签主吉、中签主平、下签主滞。各处版本略有异文，本站以主流通行版本为准。",
        },
        {
          question: "上签、中签、下签怎么看？",
          answer: "上签主吉，所求多能如愿；中签主平，得失参半、须待时机；下签主滞，眼前多有不顺，宜守不宜进。断语部分再按姻缘、事业、求财、健康分述。",
        },
        {
          question: "在庙里求了签，能在这里查解吗？",
          answer: "可以。在「摇筒求签」旁的签号框输入 1 到 100 的签号，即可查阅该签签文与解签，与现场摇签所得的展示完全一致。",
        },
        {
          question: "解签结果可信吗？",
          answer: "签文为传统签谱的通行版本，解签基于传统签诗文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。",
        },
      ],
      en: [
        {
          question: "Where do the Guanyin oracle sticks come from?",
          answer: "The Guanyin oracle sticks are one of the most widely circulated hundred-stick folk oracles, found at Guanyin shrines and temples across the Chinese world. Each stick carries a four-line poem and a classical tale, with three grades reading fortune: Favorable (上签), Neutral (中签) and Lower (下签). Local versions differ slightly in wording; this site follows the widely circulated mainstream text.",
        },
        {
          question: "How do I read the three grades?",
          answer: "Favorable (上签) — what is sought will mostly come true; Neutral (中签) — gain and loss in half, wait for the right moment; Lower (下签) — matters are blocked for now, so guard rather than advance. The verdicts then break matters down by marriage, career, wealth and health.",
        },
        {
          question: "Can I look up a stick I drew at a temple?",
          answer: "Yes. Enter its number (1–100) in the lookup box beside the tube, and the poem and reading shown will be exactly the same as one drawn here.",
        },
        {
          question: "Are the readings authoritative?",
          answer: "The stick texts follow the widely circulated version of the traditional oracle; the readings draw on classical oracle-stick literature and are offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.",
        },
      ],
    },
  },
  {
    slug: "yuelao",
    // 经「抽签」下拉进入（见 layout/nav.ts），不在平铺导航里
    inNav: false,
    meta: {
      zh: { title: "月老灵签", description: "在线月老灵签：摇筒抽签百签签文，九等细分情缘深浅，签文经典成句与恋情婚姻复合断语，细解分明。" },
      en: { title: "Yue Lao Oracle Sticks", description: "Draw Yue Lao oracle sticks online: one hundred sticks in nine grades for matters of the heart, with classical lines and verdicts on love, marriage and reconciliation." },
    },
    content: { zh: yuelaoZh, en: yuelaoEn },
    faq: {
      zh: [
        {
          question: "月老灵签是什么来历？",
          answer: "月下老人掌姻缘的传说出自唐代《续玄怪录》：老人袋中红绳一系，千里姻缘注定。杭州西湖月老祠据此设百签签谱，签文多引《诗经》《左传》等经典成句，专为问情缘婚姻者而设，本站签文取自该体系。",
        },
        {
          question: "九个等级怎么看？",
          answer: "月老签自上而下分上上大吉、上上、上吉、上、中上、上平、中平、中、下九等：上系五等情缘向好、可期可成；中系三等平平、须随缘经营；下等不利、强求难成。断语部分再按恋情、婚姻、复合分述。",
        },
        {
          question: "问恋情、问婚姻、问复合要分开求吗？",
          answer: "要。月老签讲究一事一签：问恋情就想清楚「这段感情走向如何」，问婚姻就想清楚「这门婚事成不成」，问复合就想清楚「还能不能挽回」。不同的事分别求签，不要一签混问。",
        },
        {
          question: "解签结果可信吗？",
          answer: "签文为传统签谱的通行版本，解签基于传统签诗文献整理生成，侧重文化推演，仅供参考，重要决策请结合自身情况。",
        },
      ],
      en: [
        {
          question: "Where do the Yue Lao oracle sticks come from?",
          answer: "The Old Man Under the Moon governs marriage in a tale from the Tang-dynasty Xu Xuan Guai Lu: one knot of the red thread in his bag, and a match across a thousand miles is sealed. The hundred-stick set of the Yue Lao shrine by West Lake in Hangzhou is the best known; its lines often quote the Book of Songs, the Zuo Commentary and other classics, and it is drawn for matters of the heart. This site follows that tradition's widely circulated text.",
        },
        {
          question: "How do I read the nine grades?",
          answer: "From the top: Most Auspicious (上上大吉), Supreme (上上), Excellent (上吉) and Favorable (上) promise a bond that can be hoped for and won; Above Average (中上), Fairly Steady (上平) and Steady (中平) ask for tending and patience; Neutral (中) means slow going; Lower (下) means forcing it will not succeed. The verdicts then break matters down by love, marriage and reconciliation.",
        },
        {
          question: "Should love, marriage and reconciliation be asked separately?",
          answer: "Yes. Yue Lao sticks ask for one matter per stick: for love, fix clearly where the relationship is heading; for marriage, whether the match will be made; for reconciliation, whether what broke can be mended. Draw separately for different matters — never mix them in one draw.",
        },
        {
          question: "Are the readings authoritative?",
          answer: "The stick texts follow the widely circulated version of the traditional oracle; the readings draw on classical oracle-stick literature and are offered as cultural reasoning for reference only. Please weigh important decisions in light of your own circumstances.",
        },
      ],
    },
  },
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
