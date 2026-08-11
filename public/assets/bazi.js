/* 八字排盘页脚本：lunar-javascript 排盘 → 渲染结果 → 串行请求三段命理解读 */
(function () {
  "use strict";

  var app = document.getElementById("bazi-app");
  if (!app) return;
  var LANG = app.dataset.lang === "en" ? "en" : "zh";

  /* ---------- 术语表 ---------- */

  var GAN_WX = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
  var ZHI_WX = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" };
  var ZHIS = "子丑寅卯辰巳午未申酉戌亥";
  var CHANG_SHENG = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"];
  /* 十干长生起始支；阳干顺行、阴干逆行 */
  var CS_START = { 甲: "亥", 丙: "寅", 戊: "寅", 庚: "巳", 壬: "申", 乙: "午", 丁: "酉", 己: "酉", 辛: "子", 癸: "卯" };
  var YANG_GAN = "甲丙戊庚壬";

  function changSheng(gan, zhi) {
    var start = ZHIS.indexOf(CS_START[gan]);
    var pos = ZHIS.indexOf(zhi);
    var step = YANG_GAN.indexOf(gan) >= 0 ? pos - start : start - pos;
    return CHANG_SHENG[((step % 12) + 12) % 12];
  }

  /* ---------- 命局神煞查表（对齐问真八字排盘） ---------- */

  var PILLAR_LABELS = ["年柱", "月柱", "日柱", "时柱"];
  var PILLAR_LABEL_EN = { 年柱: "Year", 月柱: "Month", 日柱: "Day", 时柱: "Hour" };

  /* 吉神——年干+日干基准（值=目标地支串，在四柱地支中查找） */
  var SS_TIAN_YI = { 甲: "丑未", 乙: "子申", 丙: "亥酉", 丁: "亥酉", 戊: "丑未", 己: "子申", 庚: "丑未", 辛: "寅午", 壬: "卯巳", 癸: "卯巳" };
  var SS_TAI_JI = { 甲: "子午", 乙: "子午", 丙: "卯酉", 丁: "卯酉", 戊: "辰戌丑未", 己: "辰戌丑未", 庚: "寅亥", 辛: "寅亥", 壬: "巳申", 癸: "巳申" };
  var SS_WEN_CHANG = { 甲: "巳", 乙: "午", 丙: "申", 丁: "酉", 戊: "申", 己: "酉", 庚: "亥", 辛: "子", 壬: "寅", 癸: "卯" };
  var SS_GUO_YIN = { 甲: "戌", 乙: "亥", 丙: "丑", 丁: "寅", 戊: "丑", 己: "寅", 庚: "辰", 辛: "巳", 壬: "未", 癸: "申" };
  var SS_JIN_YU = { 甲: "辰", 乙: "巳", 丙: "未", 丁: "申", 戊: "未", 己: "申", 庚: "戌", 辛: "亥", 壬: "丑", 癸: "寅" };
  var SS_TIAN_CHU = { 甲: "巳", 乙: "午", 丙: "巳", 丁: "午", 戊: "申", 己: "酉", 庚: "亥", 辛: "子", 壬: "寅", 癸: "卯" };
  var SS_FU_XING = { 甲: "寅子", 丙: "寅子", 乙: "卯丑", 癸: "卯丑", 戊: "申", 己: "未", 丁: "亥", 庚: "午", 辛: "巳", 壬: "辰" };

  /* 日干基准（值=目标地支串，在四柱地支中查找） */
  var SS_LU_SHEN = { 甲: "寅", 乙: "卯", 丙: "巳", 丁: "午", 戊: "巳", 己: "午", 庚: "申", 辛: "酉", 壬: "亥", 癸: "子" };
  var SS_YANG_REN = { 甲: "卯", 乙: "寅", 丙: "午", 丁: "巳", 戊: "午", 己: "巳", 庚: "酉", 辛: "申", 壬: "子", 癸: "亥" };
  var SS_FEI_REN = { 甲: "酉", 乙: "申", 丙: "子", 丁: "亥", 戊: "子", 己: "亥", 庚: "卯", 辛: "寅", 壬: "午", 癸: "巳" };
  var SS_LIU_XIA = { 甲: "酉", 乙: "戌", 丙: "未", 丁: "申", 戊: "巳", 己: "午", 庚: "辰", 辛: "卯", 壬: "亥", 癸: "寅" };
  var SS_HONG_YAN = { 甲: "午", 乙: "午", 丙: "寅", 丁: "未", 戊: "辰", 己: "辰", 庚: "戌", 辛: "酉", 壬: "子", 癸: "申" };

  /* 年支+日支双查（年支查时目标为月/日/时支，日支查时目标为年/月/时支） */
  var SS_YI_MA = { 子: "寅", 丑: "亥", 寅: "申", 卯: "巳", 辰: "寅", 巳: "亥", 午: "申", 未: "巳", 申: "寅", 酉: "亥", 戌: "申", 亥: "巳" };
  var SS_JIANG_XING = { 子: "子", 丑: "酉", 寅: "午", 卯: "卯", 辰: "子", 巳: "酉", 午: "午", 未: "卯", 申: "子", 酉: "酉", 戌: "午", 亥: "卯" };
  var SS_HUA_GAI = { 子: "辰", 丑: "丑", 寅: "戌", 卯: "未", 辰: "辰", 巳: "丑", 午: "戌", 未: "未", 申: "辰", 酉: "丑", 戌: "戌", 亥: "未" };
  var SS_JIE_SHA = { 子: "巳", 丑: "寅", 寅: "亥", 卯: "申", 辰: "巳", 巳: "寅", 午: "亥", 未: "申", 申: "巳", 酉: "寅", 戌: "亥", 亥: "申" };
  var SS_WANG_SHEN = { 子: "亥", 丑: "申", 寅: "巳", 卯: "寅", 辰: "亥", 巳: "申", 午: "巳", 未: "寅", 申: "亥", 酉: "申", 戌: "巳", 亥: "寅" };
  var SS_TAO_HUA = { 子: "酉", 丑: "午", 寅: "卯", 卯: "子", 辰: "酉", 巳: "午", 午: "卯", 未: "子", 申: "酉", 酉: "午", 戌: "卯", 亥: "子" };
  var SS_TIAN_LUO_DI_WANG = { 辰: "巳", 巳: "辰", 戌: "亥", 亥: "戌" };

  /* 年支单查（目标为月/日/时支） */
  var SS_ZAI_SHA = { 子: "午", 丑: "卯", 寅: "子", 卯: "酉", 辰: "午", 巳: "卯", 午: "子", 未: "酉", 申: "午", 酉: "卯", 戌: "子", 亥: "酉" };
  var SS_GU_CHEN = { 子: "寅", 丑: "寅", 寅: "巳", 卯: "巳", 辰: "巳", 巳: "申", 午: "申", 未: "申", 申: "亥", 酉: "亥", 戌: "亥", 亥: "寅" };
  var SS_GUA_SU = { 子: "戌", 丑: "戌", 寅: "丑", 卯: "丑", 辰: "丑", 巳: "辰", 午: "辰", 未: "辰", 申: "未", 酉: "未", 戌: "未", 亥: "戌" };
  var SS_GOU_JIAO = { 子: "卯", 丑: "辰", 寅: "巳", 卯: "午", 辰: "未", 巳: "申", 午: "酉", 未: "戌", 申: "亥", 酉: "子", 戌: "丑", 亥: "寅" };
  var SS_TIAN_XI = { 子: "酉", 丑: "申", 寅: "未", 卯: "午", 辰: "巳", 巳: "辰", 午: "卯", 未: "寅", 申: "丑", 酉: "子", 戌: "亥", 亥: "戌" };
  var SS_HONG_LUAN = { 子: "卯", 丑: "寅", 寅: "丑", 卯: "子", 辰: "亥", 巳: "戌", 午: "酉", 未: "申", 申: "未", 酉: "午", 戌: "巳", 亥: "辰" };
  var SS_YUAN_CHEN_M = { 子: "未", 丑: "申", 寅: "酉", 卯: "戌", 辰: "亥", 巳: "子", 午: "丑", 未: "寅", 申: "卯", 酉: "辰", 戌: "巳", 亥: "午" };
  var SS_YUAN_CHEN_F = { 子: "巳", 丑: "午", 寅: "未", 卯: "申", 辰: "酉", 巳: "戌", 午: "亥", 未: "子", 申: "丑", 酉: "寅", 戌: "卯", 亥: "辰" };
  var SS_PI_MA = { 子: "酉", 丑: "戌", 寅: "亥", 卯: "子", 辰: "丑", 巳: "寅", 午: "卯", 未: "辰", 申: "巳", 酉: "午", 戌: "未", 亥: "申" };
  var SS_DIAO_KE = { 子: "戌", 丑: "亥", 寅: "子", 卯: "丑", 辰: "寅", 巳: "卯", 午: "辰", 未: "巳", 申: "午", 酉: "未", 戌: "申", 亥: "酉" };
  var SS_SANG_MEN = { 子: "寅", 丑: "卯", 寅: "辰", 卯: "巳", 辰: "午", 巳: "未", 午: "申", 未: "酉", 申: "戌", 酉: "亥", 戌: "子", 亥: "丑" };

  /* 月支→地支（目标为四柱地支） */
  var SS_TIAN_YI_YI = { 子: "亥", 丑: "子", 寅: "丑", 卯: "寅", 辰: "卯", 巳: "辰", 午: "巳", 未: "午", 申: "未", 酉: "申", 戌: "酉", 亥: "戌" };
  var SS_XUE_REN = { 子: "午", 丑: "子", 寅: "丑", 卯: "未", 辰: "寅", 巳: "申", 午: "卯", 未: "酉", 申: "辰", 酉: "戌", 戌: "巳", 亥: "亥" };

  /* 月支→天干（目标为四柱天干） */
  var SS_YUE_DE = { 子: "壬", 丑: "庚", 寅: "丙", 卯: "甲", 辰: "壬", 巳: "庚", 午: "丙", 未: "甲", 申: "壬", 酉: "庚", 戌: "丙", 亥: "甲" };
  var SS_YUE_DE_HE = { 子: "丁", 丑: "乙", 寅: "辛", 卯: "己", 辰: "丁", 巳: "乙", 午: "辛", 未: "己", 申: "丁", 酉: "乙", 戌: "辛", 亥: "己" };
  var SS_DE_XIU = { 寅: "丙丁戊癸", 午: "丙丁戊癸", 戌: "丙丁戊癸", 申: "壬癸戊己丙辛甲", 子: "壬癸戊己丙辛甲", 辰: "壬癸戊己丙辛甲", 巳: "乙庚辛", 酉: "乙庚辛", 丑: "乙庚辛", 亥: "甲乙丁壬", 卯: "甲乙丁壬", 未: "甲乙丁壬" };

  /* 天德贵人/天德合：月支→天干时查四柱天干，月支→地支时查四柱地支 */
  var SS_TIAN_DE_GAN = { 丑: "庚", 寅: "丁", 辰: "壬", 巳: "辛", 未: "甲", 申: "癸", 戌: "丙", 亥: "乙" };
  var SS_TIAN_DE_ZHI = { 子: "巳", 卯: "申", 午: "亥", 酉: "寅" };
  var SS_TIAN_DE_HE_GAN = { 丑: "乙", 寅: "壬", 辰: "丁", 巳: "丙", 未: "己", 申: "戊", 戌: "辛", 亥: "庚" };
  var SS_TIAN_DE_HE_ZHI = { 子: "申", 卯: "巳", 午: "寅", 酉: "亥" };

  /* 童子煞：月支→地支（目标为日支、时支） */
  var SS_TONG_ZI = { 子: "卯未辰", 丑: "卯未辰", 巳: "卯未辰", 午: "卯未辰", 未: "卯未辰", 亥: "卯未辰", 寅: "寅子", 卯: "寅子", 辰: "寅子", 申: "寅子", 酉: "寅子", 戌: "寅子" };
  /* 童子煞（年纳音五行）：金/木→午卯，水/火→酉戌，土→辰巳 */
  var SS_TONG_ZI_NY = { 金: "午卯", 木: "午卯", 水: "酉戌", 火: "酉戌", 土: "辰巳" };

  /* 年纳音五行→地支（学堂/词馆目标为月/日/时支） */
  var SS_XUE_TANG = { 金: "巳", 木: "亥", 水: "申", 土: "申", 火: "寅" };
  var SS_CI_GUAN = { 金: "申", 木: "寅", 水: "亥", 土: "亥", 火: "巳" };
  /* 年纳音五行→干支（正学堂/正词馆目标为月/日/时柱干支） */
  var SS_ZHENG_XUE_TANG = { 金: "辛巳", 木: "己亥", 水: "甲申", 土: "戊申", 火: "丙寅" };
  var SS_ZHENG_CI_GUAN = { 金: "壬申", 木: "庚寅", 水: "癸亥", 土: "丁亥", 火: "乙巳" };

  /* 月支→日柱干支 */
  var SS_TIAN_ZHUAN = { 寅: "乙卯", 卯: "乙卯", 辰: "乙卯", 巳: "丙午", 午: "丙午", 未: "丙午", 申: "辛酉", 酉: "辛酉", 戌: "辛酉", 亥: "壬子", 子: "壬子", 丑: "壬子" };
  var SS_DI_ZHUAN = { 寅: "辛卯", 卯: "辛卯", 辰: "辛卯", 巳: "戊午", 午: "戊午", 未: "戊午", 申: "癸酉", 酉: "癸酉", 戌: "癸酉", 亥: "丙子", 子: "丙子", 丑: "丙子" };
  var SS_TIAN_SHE = { 寅: "戊寅", 卯: "戊寅", 辰: "戊寅", 巳: "甲午", 午: "甲午", 未: "甲午", 申: "戊申", 酉: "戊申", 戌: "戊申", 亥: "甲子", 子: "甲子", 丑: "甲子" };
  var SS_SI_FEI = [
    { 寅: "庚申", 卯: "庚申", 辰: "庚申", 巳: "壬子", 午: "壬子", 未: "壬子", 申: "甲寅", 酉: "甲寅", 戌: "甲寅", 亥: "丙午", 子: "丙午", 丑: "丙午" },
    { 寅: "辛酉", 卯: "辛酉", 辰: "辛酉", 巳: "癸亥", 午: "癸亥", 未: "癸亥", 申: "乙卯", 酉: "乙卯", 戌: "乙卯", 亥: "丁巳", 子: "丁巳", 丑: "丁巳" },
  ];

  /* 日柱干支集合（命中即落日柱） */
  var SS_DAY_SETS_JI = {
    十灵日: ["乙亥", "癸未", "庚寅", "丁酉", "壬寅", "甲辰", "庚戌", "辛亥", "丙辰", "戊午"],
    六秀日: ["戊子", "己丑", "丙午", "丁未", "戊午", "己未"],
  };
  var SS_DAY_SETS_XIONG = {
    十恶大败: ["壬申", "庚辰", "辛巳", "丁亥", "己丑", "丙申", "戊戌", "甲辰", "乙巳", "癸亥"],
    阴差阳错: ["丙子", "丁丑", "戊寅", "辛卯", "壬辰", "丙午", "丁未", "戊申", "辛酉", "壬戌", "癸亥", "癸巳"],
    九丑日: ["己卯", "壬午", "戊子", "辛卯", "丁酉", "己酉", "壬子", "戊午", "辛酉"],
    魁罡日: ["庚辰", "壬辰", "戊戌", "庚戌"],
    八专日: ["戊戌", "丁未", "癸丑", "甲寅", "乙卯", "己未", "庚申", "辛酉"],
    孤鸾煞: ["丁巳", "乙巳", "丙午", "戊申", "辛亥", "壬子", "甲寅", "戊午"],
  };
  /* 金神：日柱或时柱干支属集合即命中 */
  var SS_JIN_SHEN = ["乙丑", "癸酉", "己巳"];
  /* 拱禄：时柱干支→日柱干支 */
  var SS_GONG_LU = { 癸丑: "癸亥", 癸亥: "癸丑", 丁未: "丁巳", 己巳: "己未", 戊午: "戊辰" };
  /* 三奇贵人：年/月/日或月/日/时天干顺排成局 */
  var SS_SAN_QI = ["甲戊庚", "乙丙丁", "壬癸辛"];

  /**
   * 计算命局神煞（查表与问真八字排盘对齐）。
   * px = { year, month, day, hour }，每项含 gan/zhi/ganZhi/naYin/xunKong。
   * gender = "male" | "female"（元辰分男女）。
   * 返回 { auspicious: [{name, pillars}], inauspicious: [...] }
   */
  function computeShenSha(px, gender) {
    var gans = [px.year.gan, px.month.gan, px.day.gan, px.hour.gan];
    var zhis = [px.year.zhi, px.month.zhi, px.day.zhi, px.hour.zhi];
    var ganZhis = [px.year.ganZhi, px.month.ganZhi, px.day.ganZhi, px.hour.ganZhi];
    var auspicious = [];
    var inauspicious = [];

    /** 在指定柱位的地支中查找目标地支串，返回命中的柱位标签数组 */
    function matchZhis(targets, idxs) {
      var hits = [];
      for (var n = 0; n < idxs.length; n++) {
        if (targets.indexOf(zhis[idxs[n]]) >= 0) hits.push(PILLAR_LABELS[idxs[n]]);
      }
      return hits;
    }

    /** 在四柱天干中查找目标天干串，返回命中的柱位标签数组 */
    function matchGans(targets) {
      var hits = [];
      for (var i = 0; i < 4; i++) {
        if (targets.indexOf(gans[i]) >= 0) hits.push(PILLAR_LABELS[i]);
      }
      return hits;
    }

    function push(name, hits, list) {
      if (hits.length) list.push({ name: name, pillars: hits });
    }

    /** 年干+日干基准：目标地支串在四柱地支中命中即入列 */
    function pushGanBase(table, name, list) {
      var seen = {};
      var merged = [];
      [gans[0], gans[2]].forEach(function (g) {
        var targets = table[g];
        if (!targets) return;
        matchZhis(targets, [0, 1, 2, 3]).forEach(function (p) {
          if (!seen[p]) { seen[p] = true; merged.push(p); }
        });
      });
      push(name, merged, list);
    }

    /** 年支+日支双查：年支查月/日/时支，日支查年/月/时支 */
    function pushDual(table, name, list) {
      var seen = {};
      var merged = [];
      [[zhis[0], [1, 2, 3]], [zhis[2], [0, 1, 3]]].forEach(function (pair) {
        var targets = table[pair[0]];
        if (!targets) return;
        pair[1].forEach(function (i) {
          if (targets.indexOf(zhis[i]) >= 0 && !seen[i]) { seen[i] = true; merged.push(PILLAR_LABELS[i]); }
        });
      });
      push(name, merged, list);
    }

    /** 年支单查：目标为月/日/时支 */
    function pushYear(table, name, list) {
      var targets = table[zhis[0]];
      if (targets) push(name, matchZhis(targets, [1, 2, 3]), list);
    }

    /** 月支→地支表：目标为四柱地支 */
    function pushMonthZhi(table, name, list) {
      var targets = table[zhis[1]];
      if (targets) push(name, matchZhis(targets, [0, 1, 2, 3]), list);
    }

    /** 月支→天干表：目标为四柱天干 */
    function pushMonthGan(table, name, list) {
      var targets = table[zhis[1]];
      if (targets) push(name, matchGans(targets), list);
    }

    /** 月支→日柱干支：命中落日柱 */
    function pushMonthDayPillar(table, name, list) {
      var val = table[zhis[1]];
      if (val && ganZhis[2] === val) push(name, ["日柱"], list);
    }

    var monthZhi = zhis[1];
    var dayGanZhi = ganZhis[2];
    var nyWx = px.year.naYin.charAt(px.year.naYin.length - 1); // 年纳音五行：路旁土→土

    // ---- 吉神 ----
    // 年干+日干基准
    pushGanBase(SS_TIAN_YI, "天乙贵人", auspicious);
    pushGanBase(SS_TAI_JI, "太极贵人", auspicious);
    pushGanBase(SS_WEN_CHANG, "文昌贵人", auspicious);
    pushGanBase(SS_GUO_YIN, "国印贵人", auspicious);
    pushGanBase(SS_JIN_YU, "金舆", auspicious);
    pushGanBase(SS_TIAN_CHU, "天厨贵人", auspicious);
    pushGanBase(SS_FU_XING, "福星贵人", auspicious);
    // 日干基准
    push("禄神", matchZhis(SS_LU_SHEN[gans[2]], [0, 1, 2, 3]), auspicious);
    // 年支+日支双查
    pushDual(SS_YI_MA, "驿马", auspicious);
    pushDual(SS_JIANG_XING, "将星", auspicious);
    pushDual(SS_HUA_GAI, "华盖", auspicious);
    // 月支基准
    pushMonthGan(SS_YUE_DE, "月德贵人", auspicious);
    pushMonthGan(SS_YUE_DE_HE, "月德合", auspicious);
    pushMonthGan(SS_DE_XIU, "德秀贵人", auspicious);
    pushMonthGan(SS_TIAN_DE_GAN, "天德贵人", auspicious);
    push("天德贵人", matchZhis(SS_TIAN_DE_ZHI[monthZhi] || "", [0, 1, 2, 3]), auspicious);
    pushMonthGan(SS_TIAN_DE_HE_GAN, "天德合", auspicious);
    push("天德合", matchZhis(SS_TIAN_DE_HE_ZHI[monthZhi] || "", [0, 1, 2, 3]), auspicious);
    pushMonthZhi(SS_TIAN_YI_YI, "天医", auspicious);
    // 年支单查
    pushYear(SS_TIAN_XI, "天喜", auspicious);
    pushYear(SS_HONG_LUAN, "红鸾", auspicious);
    // 年纳音五行
    push("学堂", matchZhis(SS_XUE_TANG[nyWx] || "", [1, 2, 3]), auspicious);
    push("词馆", matchZhis(SS_CI_GUAN[nyWx] || "", [1, 2, 3]), auspicious);
    ["月柱", "日柱", "时柱"].forEach(function (label, n) {
      if (ganZhis[n + 1] === SS_ZHENG_XUE_TANG[nyWx]) auspicious.push({ name: "正学堂", pillars: [label] });
      if (ganZhis[n + 1] === SS_ZHENG_CI_GUAN[nyWx]) auspicious.push({ name: "正词馆", pillars: [label] });
    });
    // 日柱/时柱干支集合
    var jinShenHits = [];
    [2, 3].forEach(function (i) { if (SS_JIN_SHEN.indexOf(ganZhis[i]) >= 0) jinShenHits.push(PILLAR_LABELS[i]); });
    push("金神", jinShenHits, auspicious);
    pushMonthDayPillar(SS_TIAN_SHE, "天赦日", auspicious);
    pushMonthDayPillar(SS_TIAN_ZHUAN, "天转日", auspicious);
    pushMonthDayPillar(SS_DI_ZHUAN, "地转日", auspicious);
    Object.keys(SS_DAY_SETS_JI).forEach(function (name) {
      if (SS_DAY_SETS_JI[name].indexOf(dayGanZhi) >= 0) auspicious.push({ name: name, pillars: ["日柱"] });
    });
    // 三奇贵人：年月日或月日时天干顺排
    (function () {
      var ymd = gans[0] + gans[1] + gans[2];
      var mdh = gans[1] + gans[2] + gans[3];
      for (var q = 0; q < SS_SAN_QI.length; q++) {
        if (ymd === SS_SAN_QI[q]) { auspicious.push({ name: "三奇贵人", pillars: ["年柱", "月柱", "日柱"] }); return; }
        if (mdh === SS_SAN_QI[q]) { auspicious.push({ name: "三奇贵人", pillars: ["月柱", "日柱", "时柱"] }); return; }
      }
    })();
    // 拱禄：时柱→日柱干支配对
    if (SS_GONG_LU[ganZhis[3]] === dayGanZhi) auspicious.push({ name: "拱禄", pillars: ["日柱"] });

    // ---- 凶煞 ----
    // 日干基准
    push("羊刃", matchZhis(SS_YANG_REN[gans[2]], [0, 1, 2, 3]), inauspicious);
    push("飞刃", matchZhis(SS_FEI_REN[gans[2]], [0, 1, 2, 3]), inauspicious);
    push("流霞", matchZhis(SS_LIU_XIA[gans[2]], [0, 1, 2, 3]), inauspicious);
    push("红艳煞", matchZhis(SS_HONG_YAN[gans[2]], [0, 1, 2, 3]), inauspicious);
    // 年支+日支双查
    pushDual(SS_JIE_SHA, "劫煞", inauspicious);
    pushDual(SS_WANG_SHEN, "亡神", inauspicious);
    pushDual(SS_TAO_HUA, "桃花", inauspicious);
    pushDual(SS_TIAN_LUO_DI_WANG, "天罗地网", inauspicious);
    // 年支单查
    pushYear(SS_ZAI_SHA, "灾煞", inauspicious);
    pushYear(SS_GU_CHEN, "孤辰", inauspicious);
    pushYear(SS_GUA_SU, "寡宿", inauspicious);
    pushYear(SS_GOU_JIAO, "勾绞煞", inauspicious);
    pushYear(gender === "female" ? SS_YUAN_CHEN_F : SS_YUAN_CHEN_M, "元辰", inauspicious);
    pushYear(SS_PI_MA, "披麻", inauspicious);
    pushYear(SS_DIAO_KE, "吊客", inauspicious);
    pushYear(SS_SANG_MEN, "丧门", inauspicious);
    // 月支基准
    pushMonthZhi(SS_XUE_REN, "血刃", inauspicious);
    // 童子煞：月支查法与年纳音查法合并（目标为日支、时支）
    (function () {
      var seen = {};
      var merged = [];
      [SS_TONG_ZI[monthZhi], SS_TONG_ZI_NY[nyWx]].forEach(function (targets) {
        if (!targets) return;
        [2, 3].forEach(function (i) {
          if (targets.indexOf(zhis[i]) >= 0 && !seen[i]) { seen[i] = true; merged.push(PILLAR_LABELS[i]); }
        });
      });
      push("童子煞", merged, inauspicious);
    })();
    // 天罗（年纳音火→戌亥，查日支）/地网（年纳音水土→辰巳，查日支）
    if (nyWx === "火") push("天罗", matchZhis("戌亥", [2]), inauspicious);
    if (nyWx === "水" || nyWx === "土") push("地网", matchZhis("辰巳", [2]), inauspicious);
    // 空亡：年柱旬空查月/日/时支，日柱旬空查年/月/时支（合并去重）
    (function () {
      var seen = {};
      var merged = [];
      [[px.year.xunKong, [1, 2, 3]], [px.day.xunKong, [0, 1, 3]]].forEach(function (pair) {
        pair[1].forEach(function (i) {
          if (pair[0].indexOf(zhis[i]) >= 0 && !seen[i]) { seen[i] = true; merged.push(PILLAR_LABELS[i]); }
        });
      });
      push("空亡", merged, inauspicious);
    })();
    // 月支→日柱干支
    SS_SI_FEI.forEach(function (table) { pushMonthDayPillar(table, "四废日", inauspicious); });
    // 日柱干支集合
    Object.keys(SS_DAY_SETS_XIONG).forEach(function (name) {
      if (SS_DAY_SETS_XIONG[name].indexOf(dayGanZhi) >= 0) inauspicious.push({ name: name, pillars: ["日柱"] });
    });

    return { auspicious: auspicious, inauspicious: inauspicious };
  }

  var T = {
    zh: {
      rows: ["主星", "天干", "地支", "藏干", "副星", "星运", "自坐", "空亡", "纳音", "命局神煞"],
      cols: ["", "年柱", "月柱", "日柱", "时柱"],
      chartTitle: "排盘结果", solar: "公历", lunar: "农历", taiYuan: "胎元", mingGong: "命宫",
      shenGong: "身宫", wuxing: "五行统计", qiYun: "起运", daYun: "大运",
      qiYunTpl: "出生后 {y} 年 {m} 个月 {d} 天起运，{year} 年起运",
      age: "岁", loading: "正在解读…", waiting: "正在解读…",
      retry: "重试", failed: "解读失败：", invalidDate: "日期无效，请检查输入",
      libLoading: "历书没能送达，请刷新页面或检查网络",
      mdLibLoading: "解读组件未完全加载，请稍后重试",
      shenShaTitle: "命局神煞", auspicious: "吉神", inauspicious: "凶煞", shenShaEmpty: "无",
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
      rows: ["Main Star", "Stem", "Branch", "Hidden", "Sub Stars", "Stage", "Self-Sit", "Void", "NaYin", "Natal Stars"],
      cols: ["", "Year", "Month", "Day", "Hour"],
      chartTitle: "Chart Result", solar: "Solar", lunar: "Lunar", taiYuan: "Conception 胎元", mingGong: "Life Palace 命宫",
      shenGong: "Body Palace 身宫", wuxing: "Five Elements", qiYun: "Luck Start", daYun: "Luck Cycles 大运",
      qiYunTpl: "Luck starts {y}y {m}m {d}d after birth, from {year}",
      age: "age", loading: "Interpreting…", waiting: "Interpreting…",
      retry: "Retry", failed: "Reading failed: ", invalidDate: "Invalid date, please check input",
      libLoading: "The almanac failed to load — please refresh or check your connection.",
      mdLibLoading: "Reading components not fully loaded, please retry later",
      shenShaTitle: "Natal Stars (ShenSha)", auspicious: "Auspicious", inauspicious: "Inauspicious", shenShaEmpty: "None",
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

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function wxSpan(ch, wx) {
    return '<span class="wx-' + wx + '">' + esc(ch) + "（" + wx + "）</span>";
  }
  /** 神煞柱位标签：数据层统一存中文，英文模式映射为英文 */
  function pillarLabel(p) {
    return LANG === "en" ? PILLAR_LABEL_EN[p] || p : p;
  }

  /* ---------- 排盘 ---------- */

  function pillarData(ec, part) {
    // part: Year/Month/Day/Time，封装 lunar-javascript EightChar 的同名 getter
    var gan = ec["get" + part + "Gan"]();
    var zhi = ec["get" + part + "Zhi"]();
    return {
      gan: gan,
      zhi: zhi,
      ganZhi: gan + zhi,
      shiShenGan: part === "Day" ? (LANG === "zh" ? "日主" : "日主 Day Master") : ec["get" + part + "ShiShenGan"](),
      hideGan: ec["get" + part + "HideGan"]().join(","),
      shiShenZhi: ec["get" + part + "ShiShenZhi"]().join(","),
      naYin: ec["get" + part + "NaYin"](),
      diShi: ec["get" + part + "DiShi"](),
      ziZuo: changSheng(gan, zhi),
      xunKong: ec["get" + part + "XunKong"](),
    };
  }

  function buildChart(input) {
    var solar;
    if (input.calendar === "solar") {
      // lunar-javascript 对公历溢出日期（如 2 月 30 日）不抛错，需自行往返校验
      var probe = new Date(input.year, input.month - 1, input.day);
      if (probe.getFullYear() !== input.year || probe.getMonth() !== input.month - 1 || probe.getDate() !== input.day) {
        throw new Error("invalid date");
      }
      solar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, 0, 0);
    } else {
      // 农历；闰月用负月份（lunar-javascript 约定）
      var lunarMonth = input.leap ? -input.month : input.month;
      solar = Lunar.fromYmdHms(input.year, lunarMonth, input.day, input.hour, 0, 0).getSolar();
    }
    var lunar = solar.getLunar();
    var ec = lunar.getEightChar();

    var pillars = {
      year: pillarData(ec, "Year"),
      month: pillarData(ec, "Month"),
      day: pillarData(ec, "Day"),
      hour: pillarData(ec, "Time"),
    };

    var wx = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
    ["year", "month", "day", "hour"].forEach(function (k) {
      wx[GAN_WX[pillars[k].gan]]++;
      wx[ZHI_WX[pillars[k].zhi]]++;
    });

    // 大运：取不含起运前的 10 步（首条 ganZhi 为空是起运前，过滤掉）
    var yun = ec.getYun(input.gender === "male" ? 1 : 0);
    var nowYear = new Date().getFullYear();
    var daYun = yun.getDaYun().filter(function (d) { return d.getGanZhi() !== ""; }).slice(0, 10)
      .map(function (d) {
        return {
          ganZhi: d.getGanZhi(),
          startAge: d.getStartAge(),
          startYear: d.getStartYear(),
          endYear: d.getEndYear(),
          isCurrent: nowYear >= d.getStartYear() && nowYear <= d.getEndYear(),
        };
      });

    var qiYun = T.qiYunTpl
      .replace("{y}", yun.getStartYear()).replace("{m}", yun.getStartMonth())
      .replace("{d}", yun.getStartDay()).replace("{year}", yun.getStartSolar().getYear());

    // 当前时间信息：今日三柱 + 未来 10 年流年 + 今年 12 流月
    var todaySolar = Solar.fromDate(new Date());
    var todayLunar = todaySolar.getLunar();
    var birthYear = solar.getYear();
    var liuNian = [];
    for (var i = 0; i < 10; i++) {
      var y = todaySolar.getYear() + i;
      liuNian.push({
        year: y,
        ganZhi: Solar.fromYmd(y, 7, 1).getLunar().getYearInGanZhiExact(),
        age: y - birthYear + 1,
      });
    }
    var liuYue = [];
    for (var mo = 1; mo <= 12; mo++) {
      liuYue.push({
        month: mo,
        ganZhi: Solar.fromYmd(todaySolar.getYear(), mo, 20).getLunar().getMonthInGanZhiExact(),
      });
    }

    function two(n) { return (n < 10 ? "0" : "") + n; }

    return {
      gender: input.gender,
      solar: solar.getYear() + "-" + two(solar.getMonth()) + "-" + two(solar.getDay()) + " " + two(solar.getHour()) + ":00",
      lunar: lunar.toString() + " " + lunar.getTimeZhi() + "时",
      pillars: {
        year: apiPillar(pillars.year), month: apiPillar(pillars.month),
        day: apiPillar(pillars.day), hour: apiPillar(pillars.hour),
      },
      display: { pillars: pillars, taiYuan: ec.getTaiYuan(), mingGong: ec.getMingGong(), shenGong: ec.getShenGong(), shenSha: computeShenSha(pillars, input.gender) },
      dayMaster: pillars.day.gan + GAN_WX[pillars.day.gan],
      wuxingCount: wx,
      qiYun: qiYun,
      daYun: daYun,
      now: {
        solar: todaySolar.getYear() + "-" + two(todaySolar.getMonth()) + "-" + two(todaySolar.getDay()),
        lunar: todayLunar.toString(),
        ganZhi: {
          year: todayLunar.getYearInGanZhiExact(),
          month: todayLunar.getMonthInGanZhiExact(),
          day: todayLunar.getDayInGanZhi(),
        },
        liuNian: liuNian,
        liuYue: liuYue,
      },
    };
  }

  /* API 只需四柱的子集字段（display 字段不上传） */
  function apiPillar(p) {
    return { ganZhi: p.ganZhi, shiShenGan: p.shiShenGan, hideGan: p.hideGan, shiShenZhi: p.shiShenZhi, naYin: p.naYin, xunKong: p.xunKong };
  }

  /* ---------- 结果渲染 ---------- */

  function renderResult(chart) {
    var px = chart.display.pillars;
    var order = ["year", "month", "day", "hour"];
    function row(label, cell) {
      return "<tr><th>" + esc(label) + "</th>" + order.map(cell).join("") + "</tr>";
    }
    var html = "<h2>" + esc(T.chartTitle) + "</h2>";
    html += "<p>" + esc(T.solar) + "：" + esc(chart.solar) + "<br>" + esc(T.lunar) + "：" + esc(chart.lunar) + "</p>";
    html += '<table class="bazi-table"><tr>' + T.cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr>";
    html += row(T.rows[0], function (k) { return "<td>" + esc(px[k].shiShenGan) + "</td>"; });
    html += row(T.rows[1], function (k) { return '<td class="bazi-gan">' + wxSpan(px[k].gan, GAN_WX[px[k].gan]) + "</td>"; });
    html += row(T.rows[2], function (k) { return '<td class="bazi-gan">' + wxSpan(px[k].zhi, ZHI_WX[px[k].zhi]) + "</td>"; });
    html += row(T.rows[3], function (k) { return "<td>" + esc(px[k].hideGan) + "</td>"; });
    html += row(T.rows[4], function (k) { return "<td>" + esc(px[k].shiShenZhi) + "</td>"; });
    html += row(T.rows[5], function (k) { return "<td>" + esc(px[k].diShi) + "</td>"; });
    html += row(T.rows[6], function (k) { return "<td>" + esc(px[k].ziZuo) + "</td>"; });
    html += row(T.rows[7], function (k) { return "<td>" + esc(px[k].xunKong) + "</td>"; });
    html += row(T.rows[8], function (k) { return "<td>" + esc(px[k].naYin) + "</td>"; });

    // 神煞行：按柱位分组，每柱一个 td，吉神（绿）在上、凶煞（红）在下
    var ss = chart.display.shenSha;
    function shenShaCell(key) {
      var label = PILLAR_LABELS[order.indexOf(key)];
      var aus = ss.auspicious.filter(function (i) { return i.pillars.indexOf(label) >= 0; });
      var ina = ss.inauspicious.filter(function (i) { return i.pillars.indexOf(label) >= 0; });
      if (!aus.length && !ina.length) return "<td></td>";
      var parts = aus.map(function (i) {
        return '<span class="ss-ji">' + esc(i.name) + "</span>";
      }).concat(ina.map(function (i) {
        return '<span class="ss-xiong">' + esc(i.name) + "</span>";
      }));
      return '<td class="bazi-shensha-cell">' + parts.join("") + "</td>";
    }
    html += row(T.rows[9], function (k) { return shenShaCell(k); });
    html += "</table>";

    var wxText = Object.keys(chart.wuxingCount).map(function (k) { return k + chart.wuxingCount[k]; }).join(" ");
    html += '<dl class="bazi-extra">';
    html += "<dt>" + esc(T.taiYuan) + "</dt><dd>" + esc(chart.display.taiYuan) + "</dd>";
    html += "<dt>" + esc(T.mingGong) + "</dt><dd>" + esc(chart.display.mingGong) + "</dd>";
    html += "<dt>" + esc(T.shenGong) + "</dt><dd>" + esc(chart.display.shenGong) + "</dd>";
    html += "<dt>" + esc(T.wuxing) + "</dt><dd>" + esc(wxText) + "</dd>";
    html += "<dt>" + esc(T.qiYun) + "</dt><dd>" + esc(chart.qiYun) + "</dd>";
    html += "</dl>";

    html += "<h2>" + esc(T.daYun) + '</h2><div class="bazi-dayun">';
    chart.daYun.forEach(function (d) {
      html += '<div class="bazi-dayun-item' + (d.isCurrent ? " current" : "") + '">'
        + '<div class="bazi-gan">' + esc(d.ganZhi) + "</div>"
        + "<div>" + d.startAge + T.age + "</div>"
        + "<div>" + d.startYear + "-" + d.endYear + "</div></div>";
    });
    html += "</div>";

    var box = document.getElementById("bazi-result");
    box.innerHTML = html;
    box.hidden = false;
  }

  /* ---------- 解读请求（串行） ---------- */

  var PART_IDS = ["bazi", "dayun", "liunian"];
  var chainVersion = 0; // 每次提交递增，旧链据此丢弃过期的 DOM 写入

  function cardBody(part) {
    return document.querySelector("#card-" + part + " .bazi-card-body");
  }

  function setStatus(part, cls, text, withRetry, retryFn) {
    var body = cardBody(part);
    body.innerHTML = "";
    var p = document.createElement("p");
    p.className = "status " + cls;
    p.textContent = text;
    body.appendChild(p);
    if (withRetry) {
      var btn = document.createElement("button");
      btn.className = "bazi-retry";
      btn.textContent = T.retry;
      btn.addEventListener("click", retryFn);
      body.appendChild(btn);
    }
  }

  function renderMarkdown(part, md) {
    // marked/DOMPurify 由 CDN 异步加载，未就绪时抛友好文案（走现有 catch/重试路径）
    if (typeof DOMPurify === "undefined" || typeof marked === "undefined") {
      throw new Error(T.mdLibLoading);
    }
    cardBody(part).innerHTML = DOMPurify.sanitize(marked.parse(md));
  }

  function requestPart(part, chartSnapshot) {
    return fetch("/api/bazi/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ part: part, lang: LANG, chart: chartSnapshot }),
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!json.ok) {
          var code = json.error && json.error.code;
          throw new Error((T.errMap && T.errMap[code]) || T.failed);
        }
        return json.data.markdown;
      });
    });
  }

  /* 从 startIndex 开始串行执行；失败则停在当前段，重试成功后继续后续段。
     链绑定提交时的 chartSnapshot 与 version，版本过期（用户重新排盘）则丢弃不写 DOM */
  function runChain(startIndex, chartSnapshot, version) {
    if (version !== chainVersion) return;
    if (startIndex >= PART_IDS.length) return;
    var part = PART_IDS[startIndex];
    setStatus(part, "loading", T.loading, false);
    for (var j = startIndex + 1; j < PART_IDS.length; j++) {
      setStatus(PART_IDS[j], "", T.waiting, false);
    }
    requestPart(part, chartSnapshot).then(function (md) {
      if (version !== chainVersion) return;
      renderMarkdown(part, md);
      runChain(startIndex + 1, chartSnapshot, version);
    }).catch(function (e) {
      if (version !== chainVersion) return;
      setStatus(part, "error", T.failed + e.message, true, function () { runChain(startIndex, chartSnapshot, version); });
    });
  }

  /* ---------- 表单 ---------- */

  var form = document.getElementById("bazi-form");
  var leapWrap = document.getElementById("bazi-leap-wrap");
  Array.prototype.forEach.call(form.elements.calendar, function (r) {
    r.addEventListener("change", function () {
      leapWrap.hidden = form.elements.calendar.value !== "lunar";
    });
  });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var errBox = document.getElementById("bazi-form-error");
    errBox.hidden = true;
    if (typeof Lunar === "undefined" || typeof Solar === "undefined") {
      errBox.textContent = T.libLoading;
      errBox.hidden = false;
      return;
    }
    var input = {
      calendar: form.elements.calendar.value,
      leap: document.getElementById("bazi-leap").checked,
      year: parseInt(document.getElementById("bazi-year").value, 10),
      month: parseInt(document.getElementById("bazi-month").value, 10),
      day: parseInt(document.getElementById("bazi-day").value, 10),
      hour: parseInt(document.getElementById("bazi-hour").value, 10),
      gender: form.elements.gender.value,
    };
    var chart;
    try {
      chart = buildChart(input);
    } catch (e) {
      // lunar-javascript 对非法日期（如农历无此闰月、2月30日）直接抛异常
      errBox.textContent = T.invalidDate;
      errBox.hidden = false;
      return;
    }
    renderResult(chart);
    // API 只传校验过的字段，display 剔除；快照随链传递，避免再次提交后新旧链混用
    var chartSnapshot = {
      gender: chart.gender, solar: chart.solar, lunar: chart.lunar, pillars: chart.pillars,
      dayMaster: chart.dayMaster, wuxingCount: chart.wuxingCount, qiYun: chart.qiYun,
      daYun: chart.daYun, now: chart.now, shenSha: chart.display.shenSha,
    };
    document.getElementById("bazi-interpret").hidden = false;
    chainVersion++;
    runChain(0, chartSnapshot, chainVersion);
    document.getElementById("bazi-result").scrollIntoView({ behavior: "smooth" });
  });
})();
