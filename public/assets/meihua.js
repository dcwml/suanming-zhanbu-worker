/* 梅花易数页脚本：时间/数字起卦 → 排盘（本卦/互卦/变卦/体用）→ 请求 AI 解读 */
(function () {
  "use strict";

  var app = document.getElementById("meihua-app");
  if (!app) return;
  var LANG = app.dataset.lang === "en" ? "en" : "zh";

  /* ---------- i18n 文案 ---------- */
  var T = {
    zh: {
      resultTitle: "排盘结果",
      time: "时间起卦", number: "数字起卦",
      lunarLabel: "农历",
      primary: "本卦", mutual: "互卦", changed: "变卦",
      upper: "上卦", lower: "下卦",
      ti: "体卦", yong: "用卦", moving: "动爻", verdict: "体用断语",
      movingLineText: function (n) { return "第" + n + "爻"; },
      loading: "正在解读…", retry: "重试", failed: "解读失败：",
      noQuestion: "请先输入所求之事",
      invalidNumbers: "请输入 1 到 100000 之间的两个整数",
      mdLibLoading: "解读组件未完全加载，请稍后重试",
      tiyong: {
        he: "体用比和，吉",
        yongShengTi: "用生体，吉",
        tiShengYong: "体生用，泄气",
        tiKeYong: "体克用，小吉",
        yongKeTi: "用克体，凶",
      },
      errMap: {
        rate_limited: "问卦的人有点多，天师正在逐一回复，请稍等片刻再来",
        upstream_timeout: "天师凝神推演超时了，请再试一次",
        upstream_error: "天师暂时没空，稍后再来问问吧",
        not_configured: "天师暂时没空，稍后再来问问吧",
        invalid_request: "卦帖写得不太对，请核对后再递上来",
        payload_too_large: "卦帖太长了，请精简后再递上来",
        invalid_json: "卦帖写得不太对，请核对后再递上来",
        cdn_failed: "历书没能送达，请刷新页面或检查网络",
      },
    },
    en: {
      resultTitle: "Casting Result",
      time: "Time casting", number: "Number casting",
      lunarLabel: "Lunar",
      primary: "Primary Hexagram", mutual: "Mutual Hexagram", changed: "Changed Hexagram",
      upper: "Upper", lower: "Lower",
      ti: "Body trigram", yong: "Application trigram", moving: "Moving line", verdict: "Ti-Yong verdict",
      movingLineText: function (n) { return "Line " + n; },
      loading: "Interpreting…", retry: "Retry", failed: "Reading failed: ",
      noQuestion: "Please enter your question first",
      invalidNumbers: "Please enter two integers between 1 and 100000",
      mdLibLoading: "Reading components not fully loaded, please retry later",
      tiyong: {
        he: "Body and Application in harmony — favorable",
        yongShengTi: "Application generates Body — favorable",
        tiShengYong: "Body drains into Application — draining",
        tiKeYong: "Body controls Application — mildly favorable",
        yongKeTi: "Application controls Body — unfavorable",
      },
      errMap: {
        rate_limited: "The Master is attending to many visitors — please return in a few moments.",
        upstream_timeout: "The Master's reading ran long — please try again.",
        upstream_error: "The Master is unavailable right now — please check back later.",
        not_configured: "The Master is unavailable right now — please check back later.",
        invalid_request: "Something in your request looks off — please double-check and try again.",
        payload_too_large: "Your request is a bit too long — please trim it and try again.",
        invalid_json: "Something in your request looks off — please double-check and try again.",
        cdn_failed: "The almanac failed to load — please refresh or check your connection.",
      },
    },
  }[LANG];

  /* ---------- 八卦数据（索引 = 先天数 - 1：乾1 兑2 离3 震4 巽5 坎6 艮7 坤8）
     lines 为三爻，自下而上，1=阳 0=阴 ---------- */
  var TRIGRAMS = [
    { name: { zh: "乾", en: "Qian 乾" }, element: { zh: "金", en: "Metal" }, symbol: "☰", lines: [1, 1, 1] },
    { name: { zh: "兑", en: "Dui 兑" }, element: { zh: "金", en: "Metal" }, symbol: "☱", lines: [1, 1, 0] },
    { name: { zh: "离", en: "Li 离" }, element: { zh: "火", en: "Fire" }, symbol: "☲", lines: [1, 0, 1] },
    { name: { zh: "震", en: "Zhen 震" }, element: { zh: "木", en: "Wood" }, symbol: "☳", lines: [1, 0, 0] },
    { name: { zh: "巽", en: "Xun 巽" }, element: { zh: "木", en: "Wood" }, symbol: "☴", lines: [0, 1, 1] },
    { name: { zh: "坎", en: "Kan 坎" }, element: { zh: "水", en: "Water" }, symbol: "☵", lines: [0, 1, 0] },
    { name: { zh: "艮", en: "Gen 艮" }, element: { zh: "土", en: "Earth" }, symbol: "☶", lines: [0, 0, 1] },
    { name: { zh: "坤", en: "Kun 坤" }, element: { zh: "土", en: "Earth" }, symbol: "☷", lines: [0, 0, 0] },
  ];

  var ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

  /* King Wen 序号矩阵：行 = 下卦二进制（bit0=初爻），列 = 上卦二进制（与六爻页同源） */
  var KING_WEN = [
    [2, 16, 8, 45, 23, 35, 20, 12],
    [24, 51, 3, 17, 27, 21, 42, 25],
    [7, 40, 29, 47, 4, 64, 59, 6],
    [19, 54, 60, 58, 41, 38, 61, 10],
    [15, 62, 39, 31, 52, 56, 53, 33],
    [36, 55, 63, 49, 22, 30, 37, 13],
    [46, 32, 48, 28, 18, 50, 57, 44],
    [11, 34, 5, 43, 26, 14, 9, 1],
  ];

  /* 五行生克（中文键，payload 与断语均以中文五行为准） */
  var GENERATES = { 金: "水", 水: "木", 木: "火", 火: "土", 土: "金" };
  var CONTROLS = { 金: "木", 木: "土", 土: "水", 水: "火", 火: "金" };

  /* ---------- 64 卦名 + 卦辞表（索引 0-63 对应 King Wen 序号 1-64）
     中文取《周易》通行本，英文取 Wilhelm 译本（与六爻页同源，梅花不用爻辞故不载） ---------- */
  var HEXAGRAMS = [
    { name: { zh: "乾为天", en: "Qian (The Creative)" }, statement: { zh: "乾：元，亨，利，贞。", en: "Qian: sublime success, furthering through perseverance." } },
    { name: { zh: "坤为地", en: "Kun (The Receptive)" }, statement: { zh: "坤：元，亨，利牝马之贞。君子有攸往，先迷后得主，利。西南得朋，东北丧朋。安贞，吉。", en: "Kun: sublime success, furthering through the perseverance of a mare. The superior one sets forth; if one takes the lead, one goes astray; if one follows, one finds one's master. Friends in the southwest, loses friends in the northeast. Quiet perseverance brings good fortune." } },
    { name: { zh: "水雷屯", en: "Zhun (Difficulty at the Beginning)" }, statement: { zh: "屯：元，亨，利，贞。勿用有攸往，利建侯。", en: "Zhun: sublime success, furthering through perseverance. Do not undertake anything; it furthers to install helpers." } },
    { name: { zh: "山水蒙", en: "Meng (Youthful Folly)" }, statement: { zh: "蒙：亨。匪我求童蒙，童蒙求我。初筮告，再三渎，渎则不告。利贞。", en: "Meng: success. I do not seek the youthful fool; the fool seeks me. At the first oracle I inform; if he asks again, it is importunity — I give no further information. Perseverance furthers." } },
    { name: { zh: "水天需", en: "Xu (Waiting)" }, statement: { zh: "需：有孚，光亨，贞吉。利涉大川。", en: "Xu: waiting. If you are sincere, there is light and success. Perseverance brings good fortune. It furthers one to cross the great water." } },
    { name: { zh: "天水讼", en: "Song (Conflict)" }, statement: { zh: "讼：有孚，窒惕，中吉，终凶。利见大人，不利涉大川。", en: "Song: if one is sincere and obstructed, a cautious halt halfway brings good fortune; going through to the end brings misfortune. It furthers one to see the great man. It does not further one to cross the great water." } },
    { name: { zh: "地水师", en: "Shi (The Army)" }, statement: { zh: "师：贞，丈人吉，无咎。", en: "Shi: perseverance, and a strong man — good fortune, no blame." } },
    { name: { zh: "水地比", en: "Bi (Holding Together)" }, statement: { zh: "比：吉。原筮，元永贞，无咎。不宁方来，后夫凶。", en: "Bi: good fortune. Inquire of the oracle again. Sublime, everlasting perseverance. No blame. Those who are uncertain gradually join. Whoever comes too late meets with misfortune." } },
    { name: { zh: "风天小畜", en: "Xiao Xu (The Taming Power of the Small)" }, statement: { zh: "小畜：亨。密云不雨，自我西郊。", en: "Xiao Xu: success. Dense clouds, no rain from our western region." } },
    { name: { zh: "天泽履", en: "Lü (Treading)" }, statement: { zh: "履虎尾，不咥人，亨。", en: "Lü: treading upon the tail of the tiger. It does not bite the man. Success." } },
    { name: { zh: "地天泰", en: "Tai (Peace)" }, statement: { zh: "泰：小往大来，吉，亨。", en: "Tai: the small departs, the great approaches. Good fortune, success." } },
    { name: { zh: "天地否", en: "Pi (Standstill)" }, statement: { zh: "否之匪人，不利君子贞，大往小来。", en: "Pi: standstill — evil people do not further the perseverance of the superior man. The great departs, the small approaches." } },
    { name: { zh: "天火同人", en: "Tong Ren (Fellowship with Men)" }, statement: { zh: "同人于野，亨。利涉大川，利君子贞。", en: "Tong Ren: fellowship with men in the open. Success. It furthers one to cross the great water. The perseverance of the superior man furthers." } },
    { name: { zh: "火天大有", en: "Da You (Possession in Great Measure)" }, statement: { zh: "大有：元，亨。", en: "Da You: sublime success." } },
    { name: { zh: "地山谦", en: "Qian (Modesty)" }, statement: { zh: "谦：亨，君子有终。", en: "Qian: success. The superior man brings things to completion." } },
    { name: { zh: "雷地豫", en: "Yu (Enthusiasm)" }, statement: { zh: "豫：利建侯行师。", en: "Yu: it furthers one to install helpers and to set armies marching." } },
    { name: { zh: "泽雷随", en: "Sui (Following)" }, statement: { zh: "随：元，亨，利，贞，无咎。", en: "Sui: following has supreme success. Perseverance furthers. No blame." } },
    { name: { zh: "山风蛊", en: "Gu (Work on the Decayed)" }, statement: { zh: "蛊：元，亨，利涉大川。先甲三日，后甲三日。", en: "Gu: sublime success. It furthers one to cross the great water. Three days before the beginning, three days after the beginning." } },
    { name: { zh: "地泽临", en: "Lin (Approach)" }, statement: { zh: "临：元，亨，利，贞。至于八月有凶。", en: "Lin: approach has supreme success. Perseverance furthers. When the eighth month comes, there will be misfortune." } },
    { name: { zh: "风地观", en: "Guan (Contemplation)" }, statement: { zh: "观：盥而不荐，有孚颙若。", en: "Guan: the ablution has been made, but not yet the offering. Full of trust they look up to him." } },
    { name: { zh: "火雷噬嗑", en: "Shi He (Biting Through)" }, statement: { zh: "噬嗑：亨。利用狱。", en: "Shi He: biting through has success. It is favorable to let justice be administered." } },
    { name: { zh: "山火贲", en: "Bi (Grace)" }, statement: { zh: "贲：亨。小利有攸往。", en: "Bi: grace has success. In small matters it is favorable to undertake something." } },
    { name: { zh: "山地剥", en: "Bo (Splitting Apart)" }, statement: { zh: "剥：不利有攸往。", en: "Bo: it does not further one to go anywhere." } },
    { name: { zh: "地雷复", en: "Fu (Return)" }, statement: { zh: "复：亨。出入无疾，朋来无咎。反复其道，七日来复，利有攸往。", en: "Fu: return. Success. Going out, coming in without error. Friends come without blame. Seven days is the cycle that returns. It furthers one to go somewhere." } },
    { name: { zh: "天雷无妄", en: "Wu Wang (Innocence)" }, statement: { zh: "无妄：元，亨，利，贞。其匪正有眚，不利有攸往。", en: "Wu Wang: supreme success. Perseverance furthers. If someone is not as he should be, he has misfortune. It does not further one to undertake anything." } },
    { name: { zh: "山天大畜", en: "Da Xu (The Taming Power of the Great)" }, statement: { zh: "大畜：利贞。不家食，吉。利涉大川。", en: "Da Xu: perseverance furthers. Not eating at home brings good fortune. It furthers one to cross the great water." } },
    { name: { zh: "山雷颐", en: "Yi (The Corners of the Mouth / Nourishment)" }, statement: { zh: "颐：贞吉。观颐，自求口实。", en: "Yi: perseverance brings good fortune. Pay heed to the providing of nourishment and what a man seeks to fill his mouth with." } },
    { name: { zh: "泽风大过", en: "Da Guo (Preponderance of the Great)" }, statement: { zh: "大过：栋桡，利有攸往，亨。", en: "Da Guo: preponderance of the great. The ridgepole sags to the breaking point. It furthers one to have somewhere to go. Success." } },
    { name: { zh: "坎为水", en: "Kan (The Abysmal)" }, statement: { zh: "习坎：有孚，维心亨，行有尚。", en: "Kan: the abysmal repeated. If you are sincere, you have success in your heart, and whatever you do succeeds." } },
    { name: { zh: "离为火", en: "Li (The Clinging)" }, statement: { zh: "离：利贞，亨。畜牝牛，吉。", en: "Li: the clinging. Perseverance furthers. It brings success. Care of the cow brings good fortune." } },
    { name: { zh: "泽山咸", en: "Xian (Influence)" }, statement: { zh: "咸：亨，利贞，取女吉。", en: "Xian: influence. Success. Perseverance furthers. To take a maiden to wife brings good fortune." } },
    { name: { zh: "雷风恒", en: "Heng (Duration)" }, statement: { zh: "恒：亨，无咎，利贞，利有攸往。", en: "Heng: duration. Success. No blame. Perseverance furthers. It furthers one to have somewhere to go." } },
    { name: { zh: "天山遁", en: "Dun (Retreat)" }, statement: { zh: "遁：亨，小利贞。", en: "Dun: retreat. Success. In what is small, perseverance furthers." } },
    { name: { zh: "雷天大壮", en: "Da Zhuang (The Power of the Great)" }, statement: { zh: "大壮：利贞。", en: "Da Zhuang: the power of the great. Perseverance furthers." } },
    { name: { zh: "火地晋", en: "Jin (Progress)" }, statement: { zh: "晋：康侯用锡马蕃庶，昼日三接。", en: "Jin: the powerful prince is honored with horses in large numbers. In a single day he is granted audience three times." } },
    { name: { zh: "地火明夷", en: "Ming Yi (Darkening of the Light)" }, statement: { zh: "明夷：利艰贞。", en: "Ming Yi: in adversity it furthers one to be persevering." } },
    { name: { zh: "风火家人", en: "Jia Ren (The Family)" }, statement: { zh: "家人：利女贞。", en: "Jia Ren: the family shows the perserverance of a woman furthers." } },
    { name: { zh: "火泽睽", en: "Kui (Opposition)" }, statement: { zh: "睽：小事吉。", en: "Kui: in small matters good fortune." } },
    { name: { zh: "水山蹇", en: "Jian (Obstruction)" }, statement: { zh: "蹇：利西南，不利东北。利见大人，贞吉。", en: "Jian: obstruction. The southwest furthers. The northeast does not further. It furthers one to see the great man. Perseverance brings good fortune." } },
    { name: { zh: "雷水解", en: "Xie (Deliverance)" }, statement: { zh: "解：利西南，无所往，其来复吉。有攸往，夙吉。", en: "Xie: deliverance. The southwest furthers. If there is no longer anything where one has to go, return brings good fortune. If there is still something where one has to go, hastening brings good fortune." } },
    { name: { zh: "山泽损", en: "Sun (Decrease)" }, statement: { zh: "损：有孚，元吉，无咎，可贞，利有攸往。曷之用，二簋可用享。", en: "Sun: decrease combined with sincerity brings about supreme good fortune without blame. One can be persevering in this. It furthers one to undertake something. How is this to be carried out? Two small bowls may be used for the sacrifice." } },
    { name: { zh: "风雷益", en: "Yi (Increase)" }, statement: { zh: "益：利有攸往，利涉大川。", en: "Yi: it furthers one to undertake something. It furthers one to cross the great water." } },
    { name: { zh: "泽天夬", en: "Guai (Breakthrough)" }, statement: { zh: "夬：扬于王庭，孚号有厉。告自邑，不利即戎，利有攸往。", en: "Guai: resoluteness. One must resolutely make the matter known at the court of the king. It must be announced truthfully. Danger. It is necessary to notify one's own city. It does not further one to resort to arms. It furthers one to undertake something." } },
    { name: { zh: "天风姤", en: "Gou (Coming to Meet)" }, statement: { zh: "姤：女壮，勿用取女。", en: "Gou: coming to meet. The maiden is powerful. One should not marry such a maiden." } },
    { name: { zh: "泽地萃", en: "Cui (Gathering Together)" }, statement: { zh: "萃：亨。王假有庙，利见大人，亨，利贞。用大牲吉，利有攸往。", en: "Cui: gathering together. Success. The king approaches his temple. It furthers one to see the great man. This brings success. Perseverance furthers. To bring great offerings creates good fortune. It furthers one to undertake something." } },
    { name: { zh: "地风升", en: "Sheng (Pushing Upward)" }, statement: { zh: "升：元亨，用见大人，勿恤，南征吉。", en: "Sheng: pushing upward has supreme success. One must see the great man. Fear not. Departure toward the south brings good fortune." } },
    { name: { zh: "泽水困", en: "Kun (Oppression / Exhaustion)" }, statement: { zh: "困：亨，贞，大人吉，无咎。有言不信。", en: "Kun: oppression, exhaustion. Success. Perseverance. The great man brings about good fortune. No blame. When one has something to say, it is not believed." } },
    { name: { zh: "水风井", en: "Jing (The Well)" }, statement: { zh: "井：改邑不改井，无丧无得。往来井井。汔至，亦未繘井，羸其瓶，凶。", en: "Jing: the town may be changed, but the well cannot be changed. It neither decreases nor increases. They come and go and draw from the well. If one gets down almost to the water and the rope does not go all the way, or the jug breaks, it brings misfortune." } },
    { name: { zh: "泽火革", en: "Ge (Revolution / Moulting)" }, statement: { zh: "革：己日乃孚，元亨，利贞，悔亡。", en: "Ge: on your own day you are believed. Supreme success, furthering through perseverance. Remorse disappears." } },
    { name: { zh: "火风鼎", en: "Ding (The Caldron)" }, statement: { zh: "鼎：元吉，亨。", en: "Ding: the caldron. Supreme good fortune. Success." } },
    { name: { zh: "震为雷", en: "Zhen (The Arousing / Shock)" }, statement: { zh: "震：亨。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。", en: "Zhen: shock brings success. Shock comes — oh, oh! Laughing words — ha, ha! The shock terrifies for a hundred miles, yet he does not let fall the sacrificial spoon and chalice." } },
    { name: { zh: "艮为山", en: "Gen (Keeping Still)" }, statement: { zh: "艮其背，不获其身，行其庭，不见其人，无咎。", en: "Gen: keeping his back still so that he no longer feels his body. He goes into his courtyard and does not see his people. No blame." } },
    { name: { zh: "风山渐", en: "Jian (Development / Gradual Progress)" }, statement: { zh: "渐：女归吉，利贞。", en: "Jian: development. The maiden is given in marriage. Good fortune. Perseverance furthers." } },
    { name: { zh: "雷泽归妹", en: "Gui Mei (The Marrying Maiden)" }, statement: { zh: "归妹：征凶，无攸利。", en: "Gui Mei: the marrying maiden. Undertakings bring misfortune. Nothing that would further." } },
    { name: { zh: "雷火丰", en: "Feng (Abundance)" }, statement: { zh: "丰：亨，王假之，勿忧，宜日中。", en: "Feng: abundance has success. The king attains abundance. Be not sad. Be like the sun at midday." } },
    { name: { zh: "火山旅", en: "Lü (The Wanderer)" }, statement: { zh: "旅：小亨，旅贞吉。", en: "Lü: the wanderer. Success through smallness. Perseverance brings good fortune to the wanderer." } },
    { name: { zh: "巽为风", en: "Xun (The Gentle / Penetrating)" }, statement: { zh: "巽：小亨，利有攸往，利见大人。", en: "Xun: the gentle. Success through what is small. It furthers one to have somewhere to go. It furthers one to see the great man." } },
    { name: { zh: "兑为泽", en: "Dui (The Joyous)" }, statement: { zh: "兑：亨，利贞。", en: "Dui: the joyous. Success. Perseverance is favorable." } },
    { name: { zh: "风水涣", en: "Huan (Dispersion)" }, statement: { zh: "涣：亨。王假有庙，利涉大川，利贞。", en: "Huan: dispersion. Success. The king approaches his temple. It furthers one to cross the great water. Perseverance furthers." } },
    { name: { zh: "水泽节", en: "Jie (Limitation)" }, statement: { zh: "节：亨。苦节不可贞。", en: "Jie: limitation. Success. Galling limitation must not be persevered in." } },
    { name: { zh: "风泽中孚", en: "Zhong Fu (Inner Truth)" }, statement: { zh: "中孚：豚鱼吉，利涉大川，利贞。", en: "Zhong Fu: inner truth. Pigs and fishes. Good fortune. It furthers one to cross the great water. Perseverance furthers." } },
    { name: { zh: "雷山小过", en: "Xiao Guo (Preponderance of the Small)" }, statement: { zh: "小过：亨，利贞。可小事，不可大事。飞鸟遗之音，不宜上宜下，大吉。", en: "Xiao Guo: preponderance of the small. Success. Perseverance furthers. Small things may be done; great things should not be done. The flying bird brings the message: not advised to ascend, advised to descend — great good fortune." } },
    { name: { zh: "水火既济", en: "Ji Ji (After Completion)" }, statement: { zh: "既济：亨小，利贞，初吉终乱。", en: "Ji Ji: after completion. Success in small matters. Perseverance furthers. At the beginning good fortune. At the end disorder." } },
    { name: { zh: "火水未济", en: "Wei Ji (Before Completion)" }, statement: { zh: "未济：亨。小狐汔济，濡其尾，无攸利。", en: "Wei Ji: before completion. Success. But if the little fox, after nearly completing the crossing, gets his tail in the water, there is nothing that would further." } },
  ];

  /* ---------- 起卦算法（纯函数） ---------- */
  function mod8(n) { var r = n % 8; return r === 0 ? 8 : r; }
  function mod6(n) { var r = n % 6; return r === 0 ? 6 : r; }

  /* 三爻（自下而上）→ 二进制索引：bit0 = 初爻，与 KING_WEN 矩阵索引一致 */
  function binOf(three) { return three[0] + three[1] * 2 + three[2] * 4; }
  function hexNo(lowerLines, upperLines) { return KING_WEN[binOf(lowerLines)][binOf(upperLines)]; }

  function trigramOfLines(three) {
    for (var i = 0; i < TRIGRAMS.length; i++) {
      var t = TRIGRAMS[i].lines;
      if (t[0] === three[0] && t[1] === three[1] && t[2] === three[2]) return TRIGRAMS[i];
    }
    return null; /* 不可达 */
  }

  /* 动爻在下卦（1-3）则下卦为用、上卦为体；在上卦（4-6）反之 */
  function buildChart(upperNo, lowerNo, moving, meta) {
    var upper = TRIGRAMS[upperNo - 1];
    var lower = TRIGRAMS[lowerNo - 1];
    var lines = lower.lines.concat(upper.lines); /* 六爻自下而上 */
    var mutualLowerLines = lines.slice(1, 4);
    var mutualUpperLines = lines.slice(2, 5);
    var changedLines = lines.slice();
    changedLines[moving - 1] = changedLines[moving - 1] ? 0 : 1;
    return {
      meta: meta,
      lines: lines,
      moving: moving,
      upper: upper,
      lower: lower,
      primaryNo: hexNo(lower.lines, upper.lines),
      mutualNo: hexNo(mutualLowerLines, mutualUpperLines),
      mutualUpper: trigramOfLines(mutualUpperLines),
      mutualLower: trigramOfLines(mutualLowerLines),
      changedNo: hexNo(changedLines.slice(0, 3), changedLines.slice(3, 6)),
      changedUpper: trigramOfLines(changedLines.slice(3, 6)),
      changedLower: trigramOfLines(changedLines.slice(0, 3)),
      ti: moving <= 3 ? upper : lower,
      yong: moving <= 3 ? lower : upper,
    };
  }

  /* 时间起卦（邵雍法）：上卦 = (年支序+月+日) mod 8，下卦加时支序，动爻 = 总数 mod 6。
     闰月取绝对值月数（梅花取数不闰）。 */
  function castByTime(now) {
    var sol = Solar.fromYmdHms(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
    var lunar = sol.getLunar();
    var yearNo = ZHI.indexOf(lunar.getYearZhi()) + 1;
    var month = Math.abs(lunar.getMonth());
    var day = lunar.getDay();
    var hourNo = ZHI.indexOf(lunar.getTimeZhi()) + 1;
    var upperSum = yearNo + month + day;
    var lowerSum = upperSum + hourNo;
    return buildChart(mod8(upperSum), mod8(lowerSum), mod6(lowerSum), {
      method: "time",
      solar: fmtDateTime(now),
      lunar: lunar.getYearInGanZhi() + "年" + lunar.getMonthInChinese() + "月" + lunar.getDayInChinese() + " " + lunar.getTimeZhi() + "时",
    });
  }

  /* 数字起卦：首数为上卦，次数为下卦，两数之和定动爻 */
  function castByNumbers(a, b) {
    return buildChart(mod8(a), mod8(b), mod6(a + b), { method: "number", numbers: [a, b] });
  }

  function tiYongVerdictKey(tiEl, yongEl) {
    if (tiEl === yongEl) return "he";
    if (GENERATES[yongEl] === tiEl) return "yongShengTi";
    if (GENERATES[tiEl] === yongEl) return "tiShengYong";
    if (CONTROLS[tiEl] === yongEl) return "tiKeYong";
    return "yongKeTi"; /* 用克体 */
  }

  function two(n) { return (n < 10 ? "0" : "") + n; }
  function fmtDateTime(d) {
    return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()) + " " + two(d.getHours()) + ":" + two(d.getMinutes());
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  /* ---------- DOM ---------- */
  var qInput = document.getElementById("meihua-question");
  var castBtn = document.getElementById("meihua-cast");
  var libError = document.getElementById("meihua-lib-error");
  var numbersWrap = document.getElementById("meihua-numbers");
  var timeHint = document.getElementById("meihua-time-hint");
  var numInput1 = document.getElementById("meihua-num-1");
  var numInput2 = document.getElementById("meihua-num-2");
  var resultBox = document.getElementById("meihua-result");
  var interpretBtn = document.getElementById("meihua-interpret-btn");
  var interpretSection = document.getElementById("meihua-interpret");
  var errorBox = document.getElementById("meihua-error");
  var chartSnapshot = null;

  function currentMethod() {
    var checked = app.querySelector('input[name="meihua-method"]:checked');
    return checked && checked.value === "number" ? "number" : "time";
  }

  /* ---------- 历书 CDN 守卫：时间起卦依赖 lunar-javascript；
     数字起卦不依赖，可先行。主 CDN 失败时 onerror 异步注入备源，故短轮询等待。 ---------- */
  var libState = "loading"; /* loading | ready | failed */
  function waitLib(retries) {
    if (typeof Solar !== "undefined" && typeof Lunar !== "undefined") {
      libState = "ready";
      updateCastGate();
      return;
    }
    if (retries <= 0) {
      libState = "failed";
      libError.textContent = T.errMap.cdn_failed;
      if (currentMethod() === "time") libError.hidden = false;
      updateCastGate();
      return;
    }
    setTimeout(function () { waitLib(retries - 1); }, 500);
  }

  function updateCastGate() {
    castBtn.disabled = currentMethod() === "time" && libState !== "ready";
  }

  Array.prototype.forEach.call(app.querySelectorAll('input[name="meihua-method"]'), function (radio) {
    radio.addEventListener("change", function () {
      var isNumber = currentMethod() === "number";
      numbersWrap.hidden = !isNumber;
      timeHint.hidden = isNumber;
      libError.hidden = isNumber || libState !== "failed";
      updateCastGate();
    });
  });

  /* ---------- 起卦 ---------- */
  function readNumbers() {
    var v1 = numInput1.value.trim();
    var v2 = numInput2.value.trim();
    if (!/^\d{1,6}$/.test(v1) || !/^\d{1,6}$/.test(v2)) return null;
    var a = parseInt(v1, 10);
    var b = parseInt(v2, 10);
    if (a < 1 || a > 100000 || b < 1 || b > 100000) return null;
    return [a, b];
  }

  castBtn.addEventListener("click", function () {
    var question = qInput.value.trim();
    if (!question) {
      errorBox.textContent = T.noQuestion;
      errorBox.hidden = false;
      return;
    }
    var chart;
    if (currentMethod() === "number") {
      var nums = readNumbers();
      if (!nums) {
        errorBox.textContent = T.invalidNumbers;
        errorBox.hidden = false;
        return;
      }
      chart = castByNumbers(nums[0], nums[1]);
    } else {
      if (libState !== "ready") {
        errorBox.textContent = T.errMap.cdn_failed;
        errorBox.hidden = false;
        return;
      }
      chart = castByTime(new Date());
    }
    chart.question = question;
    chartSnapshot = chart;
    errorBox.hidden = true;
    interpretSection.hidden = true;
    showResult(chart);
    document.getElementById("meihua-step3").scrollIntoView({ behavior: "smooth" });
  });

  /* ---------- 排盘渲染 ---------- */
  function hexCard(label, no, upperT, lowerT, withStatement) {
    var h = HEXAGRAMS[no - 1];
    var html = '<div class="meihua-hex-card">';
    html += '<div class="meihua-symbol">' + String.fromCharCode(0x4DC0 + no - 1) + "</div>";
    html += "<div>" + esc(label) + "</div>";
    html += "<div>" + esc(h.name[LANG]) + "</div>";
    html += '<div class="meihua-trigrams">' + esc(T.upper) + " " + esc(upperT.name[LANG]) + " · " + esc(T.lower) + " " + esc(lowerT.name[LANG]) + "</div>";
    if (withStatement) html += '<p class="meihua-statement">' + esc(h.statement[LANG]) + "</p>";
    html += "</div>";
    return html;
  }

  function showResult(chart) {
    var meta = chart.meta;
    var html = "<h2>" + esc(T.resultTitle) + "</h2>";
    html += '<p class="meihua-meta">';
    if (meta.method === "time") {
      html += esc(T.time) + " · " + esc(meta.solar) + " · " + esc(T.lunarLabel) + " " + esc(meta.lunar);
    } else {
      html += esc(T.number) + " · " + meta.numbers[0] + ", " + meta.numbers[1];
    }
    html += "</p>";
    html += '<div class="meihua-hex-display">';
    html += hexCard(T.primary, chart.primaryNo, chart.upper, chart.lower, true);
    html += hexCard(T.mutual, chart.mutualNo, chart.mutualUpper, chart.mutualLower, false);
    html += hexCard(T.changed, chart.changedNo, chart.changedUpper, chart.changedLower, false);
    html += "</div>";
    html += '<div class="meihua-chart-detail">';
    html += '<div class="meihua-lines" aria-hidden="true">';
    for (var i = 5; i >= 0; i--) {
      var yang = chart.lines[i] === 1;
      var moving = chart.moving === i + 1;
      html += '<div class="yaoline ' + (yang ? "yang" : "yin") + (moving ? " moving" : "") + '"></div>';
    }
    html += "</div>";
    var verdictKey = tiYongVerdictKey(chart.ti.element.zh, chart.yong.element.zh);
    html += '<dl class="meihua-tiyong">';
    html += "<div><dt>" + esc(T.moving) + "</dt><dd>" + esc(T.movingLineText(chart.moving)) + "</dd></div>";
    html += "<div><dt>" + esc(T.ti) + "</dt><dd>" + esc(chart.ti.name[LANG]) + "（" + esc(chart.ti.element[LANG]) + "）</dd></div>";
    html += "<div><dt>" + esc(T.yong) + "</dt><dd>" + esc(chart.yong.name[LANG]) + "（" + esc(chart.yong.element[LANG]) + "）</dd></div>";
    html += "<div><dt>" + esc(T.verdict) + "</dt><dd>" + esc(T.tiyong[verdictKey]) + "</dd></div>";
    html += "</dl>";
    html += "</div>";
    resultBox.innerHTML = html;
    resultBox.hidden = false;
    interpretBtn.hidden = false;
  }

  /* ---------- 解读请求 ---------- */
  function hexPayload(no, upperT, lowerT) {
    var h = HEXAGRAMS[no - 1];
    return { name: h.name.zh, statement: h.statement.zh, upper: upperT.name.zh, lower: lowerT.name.zh };
  }

  function buildPayload(chart) {
    var payload = {
      lang: LANG,
      question: chart.question,
      method: chart.meta.method,
      primary: hexPayload(chart.primaryNo, chart.upper, chart.lower),
      mutual: hexPayload(chart.mutualNo, chart.mutualUpper, chart.mutualLower),
      changed: hexPayload(chart.changedNo, chart.changedUpper, chart.changedLower),
      movingLine: chart.moving,
      body: { trigram: chart.ti.name.zh, element: chart.ti.element.zh },
      application: { trigram: chart.yong.name.zh, element: chart.yong.element.zh },
    };
    if (chart.meta.method === "time") {
      payload.solar = chart.meta.solar;
      payload.lunar = chart.meta.lunar;
    } else {
      payload.numbers = chart.meta.numbers;
    }
    return payload;
  }

  function setStatus(text, withRetry) {
    var body = interpretSection.querySelector(".meihua-card-body");
    body.innerHTML = "";
    var p = document.createElement("p");
    p.className = "status loading";
    p.textContent = text;
    body.appendChild(p);
    if (withRetry) {
      var btn = document.createElement("button");
      btn.className = "meihua-retry";
      btn.textContent = T.retry;
      btn.addEventListener("click", requestInterpret);
      body.appendChild(btn);
    }
  }

  function renderMarkdown(md) {
    if (typeof DOMPurify === "undefined" || typeof marked === "undefined") {
      throw new Error(T.mdLibLoading);
    }
    interpretSection.querySelector(".meihua-card-body").innerHTML = DOMPurify.sanitize(marked.parse(md));
  }

  function requestInterpret() {
    errorBox.hidden = true;
    interpretSection.hidden = false;
    setStatus(T.loading, false);
    fetch("/api/meihua/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildPayload(chartSnapshot)),
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!json.ok) {
          var code = json.error && json.error.code;
          /* 抛出的已是完整用户文案（映射或兜底），catch 处直接展示、不再拼前缀 */
          throw new Error((T.errMap && T.errMap[code]) || T.failed + "HTTP " + res.status);
        }
        return json.data.markdown;
      });
    }).then(function (md) {
      renderMarkdown(md);
    }).catch(function (e) {
      setStatus(e.message, true);
    });
  }

  interpretBtn.addEventListener("click", requestInterpret);

  /* ---------- 初始化 ---------- */
  function init() {
    updateCastGate();
    waitLib(10);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
