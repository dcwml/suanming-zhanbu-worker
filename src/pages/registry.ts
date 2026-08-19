import type { Lang } from "../config/site";
import homeZh from "../content/home.zh.html";
import homeEn from "../content/home.en.html";
import baziZh from "../content/bazi.zh.html";
import baziEn from "../content/bazi.en.html";
import ziweiZh from "../content/ziwei.zh.html";
import ziweiEn from "../content/ziwei.en.html";
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
