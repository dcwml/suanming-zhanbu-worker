import type { Lang } from "../config/site";
import type { PageMeta } from "./registry";
import daily20260903Zh from "../content/daily/2026-09-03.zh.html";
import daily20260903En from "../content/daily/2026-09-03.en.html";
import daily20260902Zh from "../content/daily/2026-09-02.zh.html";
import daily20260902En from "../content/daily/2026-09-02.en.html";
import daily20260901Zh from "../content/daily/2026-09-01.zh.html";
import daily20260901En from "../content/daily/2026-09-01.en.html";
import daily20260831Zh from "../content/daily/2026-08-31.zh.html";
import daily20260831En from "../content/daily/2026-08-31.en.html";
import daily20260830Zh from "../content/daily/2026-08-30.zh.html";
import daily20260830En from "../content/daily/2026-08-30.en.html";
import daily20260829Zh from "../content/daily/2026-08-29.zh.html";
import daily20260829En from "../content/daily/2026-08-29.en.html";
import daily20260828Zh from "../content/daily/2026-08-28.zh.html";
import daily20260828En from "../content/daily/2026-08-28.en.html";
import daily20260827Zh from "../content/daily/2026-08-27.zh.html";
import daily20260827En from "../content/daily/2026-08-27.en.html";
import daily20260826Zh from "../content/daily/2026-08-26.zh.html";
import daily20260826En from "../content/daily/2026-08-26.en.html";
import daily20260825Zh from "../content/daily/2026-08-25.zh.html";
import daily20260825En from "../content/daily/2026-08-25.en.html";
import daily20260824Zh from "../content/daily/2026-08-24.zh.html";
import daily20260824En from "../content/daily/2026-08-24.en.html";
import daily20260823Zh from "../content/daily/2026-08-23.zh.html";
import daily20260823En from "../content/daily/2026-08-23.en.html";
import daily20260822Zh from "../content/daily/2026-08-22.zh.html";
import daily20260822En from "../content/daily/2026-08-22.en.html";
import daily20260821Zh from "../content/daily/2026-08-21.zh.html";
import daily20260821En from "../content/daily/2026-08-21.en.html";
import daily20260820Zh from "../content/daily/2026-08-20.zh.html";
import daily20260820En from "../content/daily/2026-08-20.en.html";
import daily20260819Zh from "../content/daily/2026-08-19.zh.html";
import daily20260819En from "../content/daily/2026-08-19.en.html";
import daily20260818Zh from "../content/daily/2026-08-18.zh.html";
import daily20260818En from "../content/daily/2026-08-18.en.html";
import daily20260817Zh from "../content/daily/2026-08-17.zh.html";
import daily20260817En from "../content/daily/2026-08-17.en.html";
import daily20260816Zh from "../content/daily/2026-08-16.zh.html";
import daily20260816En from "../content/daily/2026-08-16.en.html";
import daily20260815Zh from "../content/daily/2026-08-15.zh.html";
import daily20260815En from "../content/daily/2026-08-15.en.html";
import daily20260814Zh from "../content/daily/2026-08-14.zh.html";
import daily20260814En from "../content/daily/2026-08-14.en.html";
import daily20260813Zh from "../content/daily/2026-08-13.zh.html";
import daily20260813En from "../content/daily/2026-08-13.en.html";
import daily20260812Zh from "../content/daily/2026-08-12.zh.html";
import daily20260812En from "../content/daily/2026-08-12.en.html";
import daily20260811Zh from "../content/daily/2026-08-11.zh.html";
import daily20260811En from "../content/daily/2026-08-11.en.html";
import daily20260810Zh from "../content/daily/2026-08-10.zh.html";
import daily20260810En from "../content/daily/2026-08-10.en.html";
import daily20260809Zh from "../content/daily/2026-08-09.zh.html";
import daily20260809En from "../content/daily/2026-08-09.en.html";
import daily20260808Zh from "../content/daily/2026-08-08.zh.html";
import daily20260808En from "../content/daily/2026-08-08.en.html";
import daily20260807Zh from "../content/daily/2026-08-07.zh.html";
import daily20260807En from "../content/daily/2026-08-07.en.html";
import daily20260806Zh from "../content/daily/2026-08-06.zh.html";
import daily20260806En from "../content/daily/2026-08-06.en.html";
import daily20260805Zh from "../content/daily/2026-08-05.zh.html";
import daily20260805En from "../content/daily/2026-08-05.en.html";
import daily20260804Zh from "../content/daily/2026-08-04.zh.html";
import daily20260804En from "../content/daily/2026-08-04.en.html";
import daily20260803Zh from "../content/daily/2026-08-03.zh.html";
import daily20260803En from "../content/daily/2026-08-03.en.html";

export interface DailyPost {
  /** ISO 日期 "YYYY-MM-DD" */
  date: string;
  meta: Record<Lang, PageMeta>;
  content: Record<Lang, string>;
}

export interface DailyArchiveItem {
  date: string;
  title: Record<Lang, string>;
}

/** 归档页元信息：供 nav.ts / footer.ts 引用（不进 registry） */
export const DAILY_ARCHIVE_META = {
  title: { zh: "今日宜忌", en: "Daily Almanac" } as Record<Lang, string>,
  slug: "daily",
} as const;

export const DAILY_POSTS: readonly DailyPost[] = [
  {
    date: "2026-09-03",
    meta: {
      zh: { title: "2026年9月3日宜忌·龙", description: "2026年9月3日黄历宜忌：金匮黄道吉日值日，天恩、母仓、三合、天喜、天医、续世七颗吉神并趋，宜嫁娶、祭祀、祈福、斋醮、普渡、移徙、入宅、动土、治病、开市、交易、立券、开光、修造、造车器、安香、安床、捕捉、畋猎、结网二十事，忌纳采、订盟、经络、行丧、安葬、探病六事，冲狗煞南；生肖龙今日运势与金匮天神典故科普。" },
      en: { title: "Daily Almanac — September 3, 2026 (Dragon)", description: "September 3, 2026 Chinese almanac: a Jīnkuì Golden Coffer Yellow Path day with seven auspicious spirits — Tiān'ēn, Mǔcāng, Sānhé, Tiānxǐ, Tiānyī, Xùshì and Jīnkuì — favorable for marriage, sacrifice, prayer, vegetarian rites, universal salvation, moving, moving into a house, breaking ground, treating illness, opening a market, trading, signing contracts, consecration, renovation, building vehicles, incense installation, setting the bed, catching and capturing, hunting and netting, twenty matters in all; avoid accepting betrothal gifts, pledging betrothal, channel therapy, funerals, burial and visiting the sick, six matters in all; clash Dog, Sha South; Dragon zodiac fortune and the lore of Jīnkuì the Golden Coffer." },
    },
    content: { zh: daily20260903Zh, en: daily20260903En },
  },
  {
    date: "2026-09-02",
    meta: {
      zh: { title: "2026年9月2日宜忌·兔", description: "2026年9月2日黄历宜忌：朱雀黑道凶日值日，天吏、致死、五虚、土符、朱雀五凶煞环伺，天恩、益后、五合三吉神并临化解，宜订盟、纳采、祭祀、祈福、安香、出火、开市、立券、入宅、挂匾、造桥、启钻、安葬十三事，忌动土、破土、嫁娶、掘井、安床五事，冲鸡煞西；生肖兔今日运势与朱雀天神典故科普。" },
      en: { title: "Daily Almanac — September 2, 2026 (Rabbit)", description: "September 2, 2026 Chinese almanac: a Zhūquè Black Path day with five inauspicious spirits — Tiānlì, Zhìsǐ, Wǔxū, Tǔfú and Zhūquè — tempered by three auspicious spirits: Tiān'ēn, Yìhòu and Wǔhé; favorable for pledging alliance, accepting betrothal, sacrifice, prayer, incense installation, moving fire, opening a market, signing contracts, moving into a house, hanging plaques, building bridges, opening the tomb and burial; avoid breaking ground, digging earth, marriage, digging wells and setting the bed; clash Rooster, Sha West; Rabbit zodiac fortune and the lore of Zhūquè the Vermilion Bird." },
    },
    content: { zh: daily20260902Zh, en: daily20260902En },
  },
  {
    date: "2026-09-01",
    meta: {
      zh: { title: "2026年9月1日宜忌·虎", description: "2026年9月1日黄历宜忌：天刑黑道凶日值日，月破、大耗、月刑三凶煞并临，天德合、驿马、天后、圣心、解神、五合六吉神化解，宜沐浴、破屋、坏垣，馀事勿取，忌斋醮、开市，冲猴煞北；生肖虎今日运势与天刑黑道凶神典故科普。" },
      en: { title: "Daily Almanac — September 1, 2026 (Tiger)", description: "September 1, 2026 Chinese almanac: a Tiānxíng Black Path day with three inauspicious spirits — Yuèpò (Month Broken), Dàhào and Yuèxíng — tempered by six auspicious spirits: Tiāndéhé, Yìmǎ, Tiānhòu, Shèngxīn, Jiěshén and Wǔhé; favorable only for bathing, demolishing a house and tearing down walls, all else best avoided; avoid vegetarian rites and opening a market; clash Monkey, Sha North; Tiger zodiac fortune and the lore of Tiānxíng the Celestial Punishment." },
    },
    content: { zh: daily20260901Zh, en: daily20260901En },
  },
  {
    date: "2026-08-31",
    meta: {
      zh: { title: "2026年8月31日宜忌·牛", description: "2026年8月31日黄历宜忌：明堂黄道吉日值日，月德合、母仓、明堂三颗吉神并趋，宜祭祀、普渡、捕捉、解除、结网、畋猎、入殓、破土、安葬九事，忌开市、交易、入宅、嫁娶四事，冲羊煞东；生肖牛今日运势与明堂天神典故科普。" },
      en: { title: "Daily Almanac — August 31, 2026 (Ox)", description: "August 31, 2026 Chinese almanac: a Míngtáng Yellow Path day with three auspicious spirits — Yuèdéhé, Mǔcāng and Míngtáng — favorable for sacrifice, universal salvation, catching and capturing, removal, netting, hunting, encoffining, breaking ground and burial, nine matters in all; avoid opening a market, trading, moving into a house and marriage, four matters in all; clash Goat, Sha East; Ox zodiac fortune and the lore of Míngtáng the Bright Hall." },
    },
    content: { zh: daily20260831Zh, en: daily20260831En },
  },
  {
    date: "2026-08-30",
    meta: {
      zh: { title: "2026年8月30日宜忌·鼠", description: "2026年8月30日黄历宜忌：青龙黄道吉日值日，月空、时德、民日、三合、临日、时阴、福生、青龙、鸣吠对九颗吉神并趋，宜嫁娶、纳采、订盟、祭祀、祈福、斋醮、普渡、移徙、入宅、出行、安机械、开光、修造、动土、竖柱、上梁、盖屋、起基、定磉、安门、安葬、破土二十二事，忌开市、立券、置产、作灶、造桥五事，冲马煞南；生肖鼠今日运势与青龙天神典故科普。" },
      en: { title: "Daily Almanac — August 30, 2026 (Rat)", description: "August 30, 2026 Chinese almanac: a Qīnglóng Yellow Path day with nine auspicious spirits — Yuèkōng, Shídé, Mínrì, Sānhé, Línrì, Shíyīn, Fúshēng, Qīnglóng and Míngfèiduì — favorable for marriage, betrothal, engagement covenant, sacrifice, praying for blessings, vegetarian rites, universal salvation, moving, entering a home, travel, installing machinery, consecration, renovation, groundbreaking, raising columns, raising ridge beams, roofing, laying foundations, setting cornerstone, installing gates, burial and breaking ground, twenty-two matters in all; avoid opening a market, signing contracts, acquiring property, installing a stove and building bridges, five matters in all; clash Horse, Sha South; Rat zodiac fortune and the lore of Qīnglóng the Azure Dragon." },
    },
    content: { zh: daily20260830Zh, en: daily20260830En },
  },
  {
    date: "2026-08-29",
    meta: {
      zh: { title: "2026年8月29日宜忌·猪", description: "2026年8月29日黄历宜忌：勾陈黑道凶日值日，相日、普护二吉神并趋化解滞气，宜祭祀、理发、作灶、沐浴、修饰垣墙、平治道涂六事，忌嫁娶、栽种、祈福、造桥、安葬、安门、伐木、作梁八事，冲蛇煞西；生肖猪今日运势与乙亥日柱干支意涵科普。" },
      en: { title: "Daily Almanac — August 29, 2026 (Pig)", description: "August 29, 2026 Chinese almanac: a Gōuchén Black Path day tempered by Xiāngrì and Pǔhù — two auspicious spirits — favorable for sacrifice, haircutting, installing a stove, bathing, decorating walls and leveling roads, six matters in all; avoid marriage, planting, praying for blessings, building bridges, burial, installing gates, felling trees and making ridge beams, eight matters in all; clash Snake, Sha West; Pig zodiac fortune and the meaning of the Yǐ-Hài day pillar." },
    },
    content: { zh: daily20260829Zh, en: daily20260829En },
  },
  {
    date: "2026-08-28",
    meta: {
      zh: { title: "2026年8月28日宜忌·狗", description: "2026年8月28日黄历宜忌：司命黄道吉日值日，母仓、阳德、守日、天巫、福德、六仪、敬安八颗吉神并趋，宜沐浴、理发、会亲友、塑绘、开光、栽种、牧养、嫁娶、经络、补垣、塞穴十一事，忌开市、入宅、动土、破土、安葬、作灶、上梁、安床、开仓、祈福，冲龙煞北；生肖狗今日运势与黄道吉神司命科普。" },
      en: { title: "Daily Almanac — August 28, 2026 (Dog)", description: "August 28, 2026 Chinese almanac: a Sīmìng Yellow Path day with eight auspicious spirits — Mǔcāng, Yángdé, Shǒurì, Tiānwū, Fúdé, Liùyī, Jìng'ān and Sīmìng — favorable for bathing, haircutting, meeting friends, sculpting, consecration, planting, herding, marriage, channel therapy, repairing walls and filling holes, eleven matters in all; avoid opening markets, moving in, breaking ground, burial, installing a stove, raising beams, setting the bed, opening granaries and praying for blessings; clash Dragon, Sha North; Dog zodiac fortune and the lore of Sīmìng the Life-Master." },
    },
    content: { zh: daily20260828Zh, en: daily20260828En },
  },
  {
    date: "2026-08-27",
    meta: {
      zh: { title: "2026年8月27日宜忌·鸡", description: "2026年8月27日黄历宜忌：玄武黑道凶日值日，逢农历七月十五中元节，天德、四相、阴德、官日、吉期、不将、除神、鸣吠八吉神并趋化解戾气，宜解除、祭祀、祈福、求嗣、修造、动土、竖柱、上梁、安床、纳畜、盖屋、合脊、起基、入殓、破土、安葬十六事，忌出火、嫁娶、开光、进人口、出行、词讼、开市、入宅、移徙、赴任，冲兔煞东；生肖鸡今日运势与中元节地官赦罪科普。" },
      en: { title: "Daily Almanac — August 27, 2026 (Rooster)", description: "August 27, 2026 Chinese almanac: a Xuánwǔ Black Path day coinciding with the Zhongyuan Festival, tempered by eight auspicious spirits — Tiāndé, Sìxiàng, Yīndé, Guānrì, Jíqī, Bùjiāng, Chúshén and Míngfèi — favorable for dispelling evil, sacrifice, prayer, offspring blessing, construction, ground breaking, erecting pillars, raising beams, setting beds, roofing, laying foundations and burial, sixteen matters in all; avoid moving icons, marriage, consecration, welcoming people, travel, litigation, opening business, moving into a house, relocating and taking up posts; clash Rabbit, Sha East; Rooster zodiac fortune and Zhongyuan folklore." },
    },
    content: { zh: daily20260827Zh, en: daily20260827En },
  },
  {
    date: "2026-08-26",
    meta: {
      zh: { title: "2026年8月26日宜忌·猴", description: "2026年8月26日黄历宜忌：天牢黑道凶日值日，月德、月恩、四相、王日四吉神并趋化解囚气，宜嫁娶、纳采、订盟、祭祀、祈福、求嗣、出行、解除、竖柱、入宅、移徙、纳财、上梁、纳畜、入殓、安葬、启钻十七事，忌栽种、掘井、动土、安床、破土、置产，冲虎煞南；生肖猴今日运势与黑道凶神天牢科普。" },
      en: { title: "Daily Almanac — August 26, 2026 (Monkey)", description: "August 26, 2026 Chinese almanac: a Tiānláo Heavenly Prison Black Path day tempered by four auspicious spirits — Yuèdé, Yuè'ēn, Sìxiàng and Wángrì — favorable for marriage, betrothal, sacrifice, prayer, travel, erecting pillars, moving into a house, relocating, collecting wealth, raising beams, acquiring livestock, encoffining, burial and opening the tomb, seventeen matters in all; avoid planting, digging wells, breaking ground, setting the bed, breaking earth for graves and purchasing property; clash Tiger, Sha South; Monkey zodiac fortune and the lore of the Tiānláo Heavenly Prison." },
    },
    content: { zh: daily20260826Zh, en: daily20260826En },
  },
  {
    date: "2026-08-25",
    meta: {
      zh: { title: "2026年8月25日宜忌·羊", description: "2026年8月25日黄历宜忌：玉堂黄道吉日值日，母仓、金堂、玉堂三吉神并趋，宜祭祀、出行、作梁、拆卸、修造、动土、起基、安床、补垣、塞穴、入殓、破土、安葬、移柩等十六事，忌嫁娶、入宅、斋醮、开光、针灸、掘井，冲牛煞西；生肖羊今日运势与玉堂星「金马玉堂」典故科普。" },
      en: { title: "Daily Almanac — August 25, 2026 (Sheep)", description: "August 25, 2026 Chinese almanac: a Jade Hall Yellow Path day with three auspicious spirits — Mǔcāng, Jīntáng and Yùtáng — favorable for sacrifice, travel, installing ridge beams, dismantling, construction, breaking ground, laying foundations, setting the bed, mending walls, sealing holes, encoffining, breaking earth, burial, moving coffins and increasing livestock, sixteen matters in all; avoid marriage, moving into a house, ritual offerings, consecration, acupuncture and digging wells; clash Ox, Sha West; Sheep zodiac fortune and the lore of the Jade Hall." },
    },
    content: { zh: daily20260825Zh, en: daily20260825En },
  },
  {
    date: "2026-08-24",
    meta: {
      zh: { title: "2026年8月24日宜忌·马", description: "2026年8月24日黄历宜忌：白虎黑道值日，天马、时阳、生气、玉宇、鸣吠五颗吉神并辅化解厉气，宜嫁娶、纳采、订盟、开光、祭祀、出行、理发、动土、安床、放水、开渠、栽种、进人口十三事，忌入宅、上梁、入殓、盖屋、探病、作灶、安门、安葬、纳畜、伐木，冲鼠煞北；生肖马今日运势与白虎星科普。" },
      en: { title: "Daily Almanac — August 24, 2026 (Horse)", description: "August 24, 2026 Chinese almanac: a White Tiger Black Path day tempered by five auspicious spirits — Tiānmǎ, Shíyáng, Shēngqì, Yùyǔ and Míngfèi — favorable for marriage, accepting betrothal gifts, pledging betrothal, consecration, sacrifice, travel, haircut, breaking ground, setting the bed, releasing water, digging channels, planting and welcoming people, thirteen matters in all; avoid moving into a house, raising beams, encoffining, roofing, visiting the sick, installing a stove, installing gates, burial, acquiring livestock and felling trees; clash Rat, Sha North; Horse zodiac fortune and the lore of the White Tiger." },
    },
    content: { zh: daily20260824Zh, en: daily20260824En },
  },
  {
    date: "2026-08-23",
    meta: {
      zh: { title: "2026年8月23日宜忌·蛇", description: "2026年8月23日黄历宜忌：天德黄道吉日值日，恰逢处暑节气，天愿、六合、五富、要安、宝光五颗吉神并集，宜嫁娶、祭祀祈福、求嗣、安床移徙、修造动土、竖柱上梁、交易立券、栽种、会亲友等十八事，忌行丧安葬、出行、作梁、纳畜、伐木、造桥，冲猪煞东；生肖蛇今日运势与处暑节气民俗科普。" },
      en: { title: "Daily Almanac — August 23, 2026 (Snake)", description: "August 23, 2026 Chinese almanac: a Tiāndé Yellow Path day falling on End of Heat itself, with Tiānyuàn, Liùhé, Wǔfù, Yào'ān and Bǎoguāng — five auspicious spirits assembled — favorable for marriage, sacrifice and prayer, setting beds and relocating, building and breaking ground, erecting pillars and raising beams, trading and signing contracts, planting and meeting relatives, eighteen matters in all; avoid funerals and burial, travel, making beams, acquiring livestock, felling trees and building bridges; clash Pig, Sha East; Snake zodiac fortune and the lore of the End of Heat solar term." },
    },
    content: { zh: daily20260823Zh, en: daily20260823En },
  },
  {
    date: "2026-08-22",
    meta: {
      zh: { title: "2026年8月22日宜忌·龙", description: "2026年8月22日黄历宜忌：金匮黄道吉日值日，天德合、三合、天喜等八颗吉神并集，宜开市、交易、立券、移徙、修造动土、上梁、栽种、破土、安葬等二十五事，忌入宅、嫁娶、掘井、牧养，冲狗煞南；生肖龙今日运势与纳音大林木科普。" },
      en: { title: "Daily Almanac — August 22, 2026 (Dragon)", description: "August 22, 2026 Chinese almanac: a Jīnkuì Golden Coffer Yellow Path day with Tiāndéhé, Sānhé, Tiānxǐ and eight auspicious spirits assembled — favorable for opening for business, trading, signing contracts, relocating, building, raising beams, planting, burial and twenty-five matters in all; avoid moving into a house, marriage, digging wells and raising livestock; clash Dog, Sha South; Dragon zodiac fortune and the Great Forest Wood Nayin." },
    },
    content: { zh: daily20260822Zh, en: daily20260822En },
  },
  {
    date: "2026-08-21",
    meta: {
      zh: { title: "2026年8月21日宜忌·兔", description: "2026年8月21日黄历宜忌：朱雀黑道值日，得月德合、天恩吉神化解，宜嫁娶、开光、祭祀、祈福、求嗣、入宅移徙、安床、开市、交易、立券、栽种、出行、安葬，忌掘井、理发、作灶、动土、破土、开池，冲鸡煞西；生肖兔今日运势与四象朱雀科普。" },
      en: { title: "Daily Almanac — August 21, 2026 (Rabbit)", description: "August 21, 2026 Chinese almanac: a Zhūquè Vermilion Bird Black Path day outweighed by the Yuèdéhé Month-Virtue Blend and Tiān'ēn Heavenly Grace — favorable for marriage, consecration, sacrifice, praying for blessings and offspring, moving into a house, relocating, setting the bed, opening for business, trading, signing contracts, planting, travel and burial; avoid digging wells, haircutting, installing a stove, breaking ground, opening ground for graves and digging ponds; clash Rooster, Sha West; Rabbit zodiac fortune and the Vermilion Bird of the Four Symbols." },
    },
    content: { zh: daily20260821Zh, en: daily20260821En },
  },
  {
    date: "2026-08-20",
    meta: {
      zh: { title: "2026年8月20日宜忌·虎", description: "2026年8月20日黄历宜忌：月破日，天刑黑道，宜破屋、坏垣、治病，馀事勿取，忌祈福、纳采、订盟、嫁娶、入宅、安葬，冲猴煞北；生肖虎今日运势与驿马吉神科普。" },
      en: { title: "Daily Almanac — August 20, 2026 (Tiger)", description: "August 20, 2026 Chinese almanac: a Month-Broken day presided over by Tiānxíng of the Black Path — favorable for breaking down houses, tearing down walls and treating illness, all other matters best avoided; avoid praying for blessings, accepting betrothal gifts, pledging betrothal, marriage, moving into a house and burial; clash Monkey, Sha North; Tiger zodiac fortune and the Yìmǎ Post Horse auspicious spirit." },
    },
    content: { zh: daily20260820Zh, en: daily20260820En },
  },
  {
    date: "2026-08-19",
    meta: {
      zh: { title: "2026年8月19日宜忌·牛", description: "2026年8月19日黄历宜忌：明堂黄道吉日，宜破土、安葬、移柩、入殓、祭祀、捕捉、除服成服，馀事勿取，忌嫁娶、入宅、开市、交易，冲羊煞东；生肖牛今日运势与七夕乞巧民俗科普。" },
      en: { title: "Daily Almanac — August 19, 2026 (Ox)", description: "August 19, 2026 Chinese almanac: a Míngtáng Yellow Path day — favorable for breaking ground for graves, burial, moving the coffin, encoffining, sacrifice, hunting and catching, removing and donning mourning dress, all other matters best avoided; avoid marriage, moving into a house, opening for business and trading; clash Goat, Sha East; Ox zodiac fortune and Qīxī Double Seventh festival folklore." },
    },
    content: { zh: daily20260819Zh, en: daily20260819En },
  },
  {
    date: "2026-08-18",
    meta: {
      zh: { title: "2026年8月18日宜忌·鼠", description: "2026年8月18日黄历宜忌：青龙黄道吉日，三合临日，宜嫁娶、祈福求嗣、出行、交易立券、入宅移徙、修造动土、安葬入殓，忌斋醮、开市、开仓、作灶、造船，冲马煞南；生肖鼠今日运势与吉神三合科普。" },
      en: { title: "Daily Almanac — August 18, 2026 (Rat)", description: "August 18, 2026 Chinese almanac: a Qīnglóng Yellow Path day with the Three Harmony star present — favorable for marriage, praying for blessings and offspring, travel, trading and signing contracts, moving into a house, relocating, construction, breaking ground, burial and encoffining; avoid Daoist rites, opening for business, opening the granary, installing a stove and building ships; clash Horse, Sha South; Rat zodiac fortune and the Sānhé Three Harmony auspicious spirit." },
    },
    content: { zh: daily20260818Zh, en: daily20260818En },
  },
  {
    date: "2026-08-17",
    meta: {
      zh: { title: "2026年8月17日宜忌·猪", description: "2026年8月17日黄历宜忌：勾陈黑道日，宜祭祀、沐浴、修饰垣墙、平治道涂、作灶，忌嫁娶、词讼、治病、置产、祈福、安葬、栽种、伐木、安门，冲蛇煞西；生肖猪今日运势与黑道凶神勾陈科普。" },
      en: { title: "Daily Almanac — August 17, 2026 (Pig)", description: "August 17, 2026 Chinese almanac: a Gōuchén Black Path day — favorable for sacrifice, bathing, decorating walls, leveling roads and installing a stove; avoid marriage, litigation, treating illness, purchasing property, praying for blessings, burial, planting, felling trees and installing gates; clash Snake, Sha West; Pig zodiac fortune and the Gōuchén Hook Array inauspicious spirit of the Black Path." },
    },
    content: { zh: daily20260817Zh, en: daily20260817En },
  },
  {
    date: "2026-08-16",
    meta: {
      zh: { title: "2026年8月16日宜忌·狗", description: "2026年8月16日黄历宜忌：司命黄道吉日，宜纳采订盟、入宅移徙、修造上梁、安床栽种纳畜、出行会亲友，忌作灶动土破土安葬、祭祀祈福伐木，冲龙煞北；生肖狗今日运势与黄道吉神司命科普。" },
      en: { title: "Daily Almanac — August 16, 2026 (Dog)", description: "August 16, 2026 Chinese almanac: a Sīmìng Yellow Path day — favorable for betrothal, sealing covenants, moving into a house, relocating, construction, raising beams, setting beds, planting, acquiring livestock, travel and meeting relatives; avoid installing a stove, breaking ground, burial, sacrifice, praying for blessings and felling trees; clash Dragon, Sha North; Dog zodiac fortune and the Sīmìng Life-Master auspicious spirit of the Yellow Path." },
    },
    content: { zh: daily20260816Zh, en: daily20260816En },
  },
  {
    date: "2026-08-15",
    meta: {
      zh: { title: "2026年8月15日宜忌·鸡", description: "2026年8月15日黄历宜忌：宜祭祀、解除、拆卸、修造、动土起基、上梁、安床安门、开渠开池、入殓破土启钻，忌嫁娶、出行、赴任、入宅移徙、作灶栽种，冲兔煞东；生肖鸡今日运势与凶煞咸池桃花煞科普。" },
      en: { title: "Daily Almanac — August 15, 2026 (Rooster)", description: "August 15, 2026 Chinese almanac: favorable for sacrifice, removal, dismantling, construction, breaking ground, laying foundations, raising beams, setting beds, installing doors, digging canals and ponds, encoffining, breaking ground and opening the tomb; avoid marriage, travel, taking up an official post, moving house, installing a stove and planting; clash Rabbit, Sha East; Rooster zodiac fortune and the Xiánchí Peach Blossom inauspicious spirit." },
    },
    content: { zh: daily20260815Zh, en: daily20260815En },
  },
  {
    date: "2026-08-14",
    meta: {
      zh: { title: "2026年8月14日宜忌·猴", description: "2026年8月14日黄历宜忌：宜祭祀、裁衣、安门、纳财、扫舍、出行、进人口、作灶、纳畜，忌安床、动土、安葬、开生坟、合寿木，冲虎煞南；生肖猴今日运势与吉神天仓科普。" },
      en: { title: "Daily Almanac — August 14, 2026 (Monkey)", description: "August 14, 2026 Chinese almanac: favorable for sacrifice, cutting garments, installing doors, collecting wealth, sweeping the house, traveling, installing a stove and acquiring livestock; avoid setting beds, breaking ground and burial; clash Tiger, Sha South; Monkey zodiac fortune and the Tiāncāng Heavenly Granary auspicious spirit." },
    },
    content: { zh: daily20260814Zh, en: daily20260814En },
  },
  {
    date: "2026-08-13",
    meta: {
      zh: { title: "2026年8月13日宜忌·羊", description: "2026年8月13日黄历宜忌：宜祭祀、动土、筑堤、开池、会亲友、入殓、破土、安葬，忌开光、出行、修造、上梁、入宅、安门、作灶、裁衣，冲牛煞西；生肖羊今日运势与农历七月初一「鬼门开」民俗科普。" },
      en: { title: "Daily Almanac — August 13, 2026 (Goat)", description: "August 13, 2026 Chinese almanac: favorable for sacrifice, breaking ground, building dikes, digging ponds, meeting relatives and friends, encoffining and burial; avoid consecration, travel, construction, raising beams and moving into a house; clash Ox, Sha West; Goat zodiac fortune and the folklore of the Ghost Gate opening on the first day of the seventh lunar month." },
    },
    content: { zh: daily20260813Zh, en: daily20260813En },
  },
  {
    date: "2026-08-12",
    meta: {
      zh: { title: "2026年8月12日宜忌·马", description: "2026年8月12日黄历宜忌：宜嫁娶、祭祀、祈福、求嗣、出行、安床，忌盖屋、入殓、安葬、入宅、移徙、置产，冲鼠煞北；生肖马今日运势与纳音天上火科普。" },
      en: { title: "Daily Almanac — August 12, 2026 (Horse)", description: "August 12, 2026 Chinese almanac: favorable for marriage, sacrifice, praying for blessings, traveling and setting beds; avoid roofing, encoffining, burial, moving house and purchasing property; clash Rat, Sha North; Horse zodiac fortune and the Heavenly Fire Nayin." },
    },
    content: { zh: daily20260812Zh, en: daily20260812En },
  },
  {
    date: "2026-08-11",
    meta: {
      zh: { title: "2026年8月11日宜忌·蛇", description: "2026年8月11日黄历宜忌：宜祭祀、开光、解除、交易立券、纳财，忌动土破土、嫁娶、入宅移徙、出行，冲猪煞东；生肖蛇今日运势与天德月德合德神科普。" },
      en: { title: "Daily Almanac — August 11, 2026 (Snake)", description: "August 11, 2026 Chinese almanac: favorable for sacrifice, consecration, removal, trading, signing contracts and collecting wealth; avoid breaking ground, marriage, moving house and travel; clash Pig, Sha East; Snake zodiac fortune and the Tiāndé & Yuèdé Hé virtue spirits." },
    },
    content: { zh: daily20260811Zh, en: daily20260811En },
  },
  {
    date: "2026-08-10",
    meta: {
      zh: { title: "2026年8月10日宜忌·龙", description: "2026年8月10日黄历宜忌：宜嫁娶、入宅、移徙、开市交易立券、动土祈福，忌栽种、作灶、针灸、出行，冲狗煞南；生肖龙今日运势与黄道吉神金匮的科普。" },
      en: { title: "Daily Almanac — August 10, 2026 (Dragon)", description: "August 10, 2026 Chinese almanac: favorable for weddings, moving into a new home, opening business and signing contracts; avoid planting, installing stoves, acupuncture and travel; clash Dog, Sha South; Dragon zodiac fortune and the Jīnkuì Gold Cabinet auspicious spirit." },
    },
    content: { zh: daily20260810Zh, en: daily20260810En },
  },
  {
    date: "2026-08-09",
    meta: {
      zh: { title: "2026年8月9日宜忌·兔", description: "2026年8月9日黄历宜忌：宜祭祀、入殓、移柩、启钻、安葬、除服成服等收敛之事，馀事勿取，冲鸡煞东；生肖兔今日运势与吉神五合的由来科普。" },
      en: { title: "Daily Almanac — August 9, 2026 (Rabbit)", description: "August 9, 2026 Chinese almanac: favorable for sacrifice, encoffining and burial rites while all other matters are best avoided; clash Rooster, Sha East; Rabbit zodiac fortune and the story of the Wǔhé Five-Union auspicious spirit." },
    },
    content: { zh: daily20260809Zh, en: daily20260809En },
  },
  {
    date: "2026-08-08",
    meta: {
      zh: { title: "2026年8月8日宜忌·虎", description: "2026年8月8日黄历宜忌：月破日，宜破屋坏垣、馀事勿取，诸事不宜，冲猴煞北；生肖虎今日运势与月破日的由来科普。" },
      en: { title: "Daily Almanac — August 8, 2026 (Tiger)", description: "August 8, 2026 Chinese almanac: a Month-Broken day — favorable only for demolition and tearing down walls, all other matters best avoided; clash Monkey, Sha North; Tiger zodiac fortune and what a Month-Broken day means." },
    },
    content: { zh: daily20260808Zh, en: daily20260808En },
  },
  {
    date: "2026-08-07",
    meta: {
      zh: { title: "2026年8月7日宜忌·牛", description: "2026年8月7日黄历宜忌：今日恰逢立秋，宜祭祀、入殓、破土、安葬、移柩等收敛之事，馀事勿取，冲羊煞东；生肖牛今日运势与立秋节气和黄历的关系科普。" },
      en: { title: "Daily Almanac — August 7, 2026 (Ox)", description: "August 7, 2026 Chinese almanac: today is the Start of Autumn solar term — favorable for sacrifice, encoffining and burial, while all other matters are best avoided; clash Sheep, Sha East; Ox zodiac fortune and how solar terms shape the almanac." },
    },
    content: { zh: daily20260807Zh, en: daily20260807En },
  },
  {
    date: "2026-08-06",
    meta: {
      zh: { title: "2026年8月6日宜忌·鼠", description: "2026年8月6日黄历宜忌：宜沐浴理发、入殓移柩破土安葬，忌嫁娶入宅作灶上梁动土，冲马煞南；生肖鼠今日运势与桑柘木纳音科普。" },
      en: { title: "Daily Almanac — August 6, 2026 (Rat)", description: "August 6, 2026 Chinese almanac: favorable for bathing, haircutting, encoffining and burial; avoid marriage, moving in, installing stoves, raising beams and ground-breaking; Rat zodiac fortune and the Mulberry Wood Nayin." },
    },
    content: { zh: daily20260806Zh, en: daily20260806En },
  },
  {
    date: "2026-08-05",
    meta: {
      zh: { title: "2026年8月5日宜忌·猪", description: "2026年8月5日黄历宜忌：宜订盟纳采、移徙入宅、立券交易、竖柱上梁，忌嫁娶安葬破土，冲蛇煞西；生肖猪今日运势与纳音钗钏金科普。" },
      en: { title: "Daily Almanac — August 5, 2026 (Pig)", description: "August 5, 2026 Chinese almanac: favorable for engagement, moving into a new home, contracts and construction; avoid marriage, burial and ground-breaking; Pig zodiac fortune and the Hairpin Gold Nayin." },
    },
    content: { zh: daily20260805Zh, en: daily20260805En },
  },
  {
    date: "2026-08-04",
    meta: {
      zh: { title: "2026年8月4日宜忌·狗", description: "2026年8月4日黄历宜忌：宜祭祀、修饰垣墙、平治道涂，忌开市动土嫁娶，冲龙煞北；生肖狗今日运势与黄道六吉神青龙科普。" },
      en: { title: "Daily Almanac — August 4, 2026 (Dog)", description: "August 4, 2026 Chinese almanac: favorable for sacrifice and repairs, avoid business openings, ground-breaking and weddings; Dog zodiac fortune and the Azure Dragon of the Yellow Path." },
    },
    content: { zh: daily20260804Zh, en: daily20260804En },
  },
  {
    date: "2026-08-03",
    meta: {
      zh: { title: "2026年8月3日宜忌·鸡", description: "2026年8月3日黄历宜忌：纳财开市交易皆宜，冲兔煞东；生肖鸡今日运势与建除十二神科普。" },
      en: { title: "Daily Almanac — August 3, 2026 (Rooster)", description: "August 3, 2026 Chinese almanac: suitable for trade and business, clashes Rabbit; Rooster zodiac fortune and the Twelve Day Officers." },
    },
    content: { zh: daily20260803Zh, en: daily20260803En },
  },
];

export function findDailyPost(date: string): DailyPost | undefined {
  return DAILY_POSTS.find((p) => p.date === date);
}

export function dailyArchive(): DailyArchiveItem[] {
  return [...DAILY_POSTS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((p) => ({ date: p.date, title: { zh: p.meta.zh.title, en: p.meta.en.title } }));
}
