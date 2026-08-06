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

  /* ---------- 命局神煞查表 ---------- */

  var PILLAR_LABELS = ["年柱", "月柱", "日柱", "时柱"];
  var PILLAR_LABEL_EN = { 年柱: "Year", 月柱: "Month", 日柱: "Day", 时柱: "Hour" };

  /* 吉神——日干基准（值=目标地支串，在四柱地支中查找） */
  var SS_TIAN_YI = { 甲: "丑未", 戊: "丑未", 庚: "丑未", 乙: "子申", 己: "子申", 丙: "亥酉", 丁: "亥酉", 壬: "卯巳", 癸: "卯巳", 辛: "寅午" };
  var SS_WEN_CHANG = { 甲: "巳", 乙: "午", 丙: "申", 戊: "申", 丁: "酉", 己: "酉", 庚: "亥", 辛: "子", 壬: "寅", 癸: "卯" };
  var SS_TAI_JI = { 甲: "子午", 乙: "子午", 丙: "卯酉", 丁: "卯酉", 戊: "辰戌丑未", 己: "辰戌丑未", 庚: "寅亥", 辛: "寅亥", 壬: "巳申", 癸: "巳申" };
  var SS_FU_XING = { 甲: "寅", 乙: "丑亥", 丙: "子", 丁: "亥", 戊: "丑", 己: "酉", 庚: "午", 辛: "巳", 壬: "辰", 癸: "卯" };
  var SS_XUE_TANG = { 甲: "亥", 乙: "午", 丙: "寅", 戊: "寅", 丁: "酉", 己: "酉", 庚: "巳", 辛: "子", 壬: "申", 癸: "卯" };
  var SS_JIN_YU = { 甲: "辰", 乙: "巳", 丙: "未", 戊: "未", 丁: "申", 己: "申", 庚: "戌", 辛: "亥", 壬: "丑", 癸: "寅" };

  /* 吉神——年支基准（值=目标地支串） */
  var SS_HUA_GAI = { 寅: "戌", 午: "戌", 戌: "戌", 申: "辰", 子: "辰", 辰: "辰", 巳: "丑", 酉: "丑", 丑: "丑", 亥: "未", 卯: "未", 未: "未" };
  var SS_JIANG_XING = { 寅: "午", 午: "午", 戌: "午", 申: "子", 子: "子", 辰: "子", 巳: "酉", 酉: "酉", 丑: "酉", 亥: "卯", 卯: "卯", 未: "卯" };

  /* 吉神——月支→天干（值=天干，与日干比较） */
  var SS_TIAN_DE = { 寅: "丁", 卯: "申", 辰: "壬", 巳: "辛", 午: "亥", 未: "甲", 申: "癸", 酉: "寅", 戌: "丙", 亥: "乙", 子: "申", 丑: "庚" };
  var SS_YUE_DE = { 寅: "丙", 午: "丙", 戌: "丙", 申: "壬", 子: "壬", 辰: "壬", 巳: "庚", 酉: "庚", 丑: "庚", 亥: "甲", 卯: "甲", 未: "甲" };

  /* 凶煞——日干基准（值=目标地支串） */
  var SS_YANG_REN = { 甲: "卯", 乙: "辰", 丙: "午", 戊: "午", 丁: "未", 己: "未", 庚: "酉", 辛: "戌", 壬: "子", 癸: "丑" };
  var SS_LIU_XIA = { 甲: "酉", 乙: "戌", 丙: "未", 戊: "巳", 丁: "申", 己: "酉", 庚: "亥", 辛: "子", 壬: "寅", 癸: "午" };

  /* 凶煞——年支基准（值=目标地支串） */
  var SS_JIE_SHA = { 寅: "亥", 午: "亥", 戌: "亥", 申: "巳", 子: "巳", 辰: "巳", 巳: "寅", 酉: "寅", 丑: "寅", 亥: "申", 卯: "申", 未: "申" };
  var SS_WANG_SHEN = { 寅: "巳", 午: "巳", 戌: "巳", 申: "亥", 子: "亥", 辰: "亥", 巳: "申", 酉: "申", 丑: "申", 亥: "寅", 卯: "寅", 未: "寅" };
  var SS_ZAI_SHA = { 寅: "子", 午: "子", 戌: "子", 申: "午", 子: "午", 辰: "午", 巳: "卯", 酉: "卯", 丑: "卯", 亥: "酉", 卯: "酉", 未: "酉" };
  var SS_TAO_HUA = { 寅: "卯", 午: "卯", 戌: "卯", 申: "酉", 子: "酉", 辰: "酉", 巳: "午", 酉: "午", 丑: "午", 亥: "子", 卯: "子", 未: "子" };
  var SS_GU_GUA = { 亥: "寅戌", 子: "寅戌", 丑: "寅戌", 寅: "巳丑", 卯: "巳丑", 辰: "巳丑", 巳: "申辰", 午: "申辰", 未: "申辰", 申: "亥未", 酉: "亥未", 戌: "亥未" };

  /* 魁罡：日柱干支属于此集合即命中 */
  var SS_KUI_GANG = ["庚辰", "壬辰", "庚戌", "戊戌"];

  /**
   * 计算命局神煞。px = { year, month, day, hour }，每项含 gan/zhi/ganZhi。
   * 返回 { auspicious: [{name, pillars}], inauspicious: [...] }
   */
  function computeShenSha(px) {
    var dayGan = px.day.gan;
    var yearZhi = px.year.zhi;
    var monthZhi = px.month.zhi;
    var dayGanZhi = px.day.ganZhi;
    var zhis = [px.year.zhi, px.month.zhi, px.day.zhi, px.hour.zhi];
    var auspicious = [];
    var inauspicious = [];

    /** 在四柱地支中查找目标地支串（如 "丑未"），返回命中的柱位标签数组 */
    function matchZhis(targets) {
      var hits = [];
      for (var i = 0; i < 4; i++) {
        if (targets.indexOf(zhis[i]) >= 0) hits.push(PILLAR_LABELS[i]);
      }
      return hits;
    }

    /** 日干/年支基准：目标地支串在四柱地支中命中即入列 */
    function pushZhi(name, targets, list) {
      var hits = matchZhis(targets);
      if (hits.length) list.push({ name: name, pillars: hits });
    }

    // 吉神——日干基准
    pushZhi("天乙贵人", SS_TIAN_YI[dayGan], auspicious);
    pushZhi("文昌贵人", SS_WEN_CHANG[dayGan], auspicious);
    pushZhi("太极贵人", SS_TAI_JI[dayGan], auspicious);
    pushZhi("福星贵人", SS_FU_XING[dayGan], auspicious);
    pushZhi("学堂", SS_XUE_TANG[dayGan], auspicious);
    pushZhi("金舆", SS_JIN_YU[dayGan], auspicious);
    // 吉神——年支基准
    pushZhi("华盖", SS_HUA_GAI[yearZhi], auspicious);
    pushZhi("将星", SS_JIANG_XING[yearZhi], auspicious);
    // 吉神——月支→天干，命中日干
    if (SS_TIAN_DE[monthZhi] === dayGan) auspicious.push({ name: "天德贵人", pillars: ["日柱"] });
    if (SS_YUE_DE[monthZhi] === dayGan) auspicious.push({ name: "月德贵人", pillars: ["日柱"] });

    // 凶煞——日干基准
    pushZhi("羊刃", SS_YANG_REN[dayGan], inauspicious);
    pushZhi("流霞", SS_LIU_XIA[dayGan], inauspicious);
    // 凶煞——年支基准
    pushZhi("劫煞", SS_JIE_SHA[yearZhi], inauspicious);
    pushZhi("亡神", SS_WANG_SHEN[yearZhi], inauspicious);
    pushZhi("灾煞", SS_ZAI_SHA[yearZhi], inauspicious);
    pushZhi("桃花", SS_TAO_HUA[yearZhi], inauspicious);
    pushZhi("孤辰寡宿", SS_GU_GUA[yearZhi], inauspicious);
    // 凶煞——魁罡（日柱干支集合）
    if (SS_KUI_GANG.indexOf(dayGanZhi) >= 0) inauspicious.push({ name: "魁罡", pillars: ["日柱"] });
    // 童子煞（民俗）：春秋月(寅卯辰申酉戌)日干甲戊庚；冬夏月(亥子丑巳午未)日干乙己辛
    var tongZiStems = "寅卯辰申酉戌".indexOf(monthZhi) >= 0 ? "甲戊庚" : "乙己辛";
    if (tongZiStems.indexOf(dayGan) >= 0) inauspicious.push({ name: "童子煞", pillars: ["日柱"], folk: true });

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
      libLoading: "排盘组件加载中，请稍候重试",
      mdLibLoading: "解读组件未完全加载，请稍后重试",
      shenShaTitle: "命局神煞", auspicious: "吉神", inauspicious: "凶煞", shenShaEmpty: "无",
      folkTag: "（民俗）",
    },
    en: {
      rows: ["Main Star", "Stem", "Branch", "Hidden", "Sub Stars", "Stage", "Self-Sit", "Void", "NaYin", "Natal Stars"],
      cols: ["", "Year", "Month", "Day", "Hour"],
      chartTitle: "Chart Result", solar: "Solar", lunar: "Lunar", taiYuan: "Conception 胎元", mingGong: "Life Palace 命宫",
      shenGong: "Body Palace 身宫", wuxing: "Five Elements", qiYun: "Luck Start", daYun: "Luck Cycles 大运",
      qiYunTpl: "Luck starts {y}y {m}m {d}d after birth, from {year}",
      age: "age", loading: "Interpreting…", waiting: "Interpreting…",
      retry: "Retry", failed: "Reading failed: ", invalidDate: "Invalid date, please check input",
      libLoading: "Calculator library still loading, please retry",
      mdLibLoading: "Reading components not fully loaded, please retry later",
      shenShaTitle: "Natal Stars (ShenSha)", auspicious: "Auspicious", inauspicious: "Inauspicious", shenShaEmpty: "None",
      folkTag: " (folklore)",
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
      display: { pillars: pillars, taiYuan: ec.getTaiYuan(), mingGong: ec.getMingGong(), shenGong: ec.getShenGong(), shenSha: computeShenSha(pillars) },
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
        return '<span class="ss-ji">' + esc(i.name) + (i.folk ? esc(T.folkTag) : "") + "</span>";
      }).concat(ina.map(function (i) {
        return '<span class="ss-xiong">' + esc(i.name) + (i.folk ? esc(T.folkTag) : "") + "</span>";
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
        if (!json.ok) throw new Error(json.error && json.error.message ? json.error.message : "HTTP " + res.status);
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
