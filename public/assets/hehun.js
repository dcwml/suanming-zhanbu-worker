/* 八字合婚页脚本：lunar-javascript 双人排盘 → 地支/天干关系查表 → 配对徽章 → 单次请求合婚解读 */
(function () {
  "use strict";

  var app = document.getElementById("hehun-app");
  if (!app) return;
  var LANG = app.dataset.lang === "en" ? "en" : "zh";

  /* ---------- 五行与关系查表（与 src/fortune/rules.ts 同值；rules.ts 是生成期专用不进运行时，此处自带） ---------- */

  var GAN_WX = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
  var ZHI_WX = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" };

  /* 六合：子丑 寅亥 卯戌 辰酉 巳申 午未 */
  var LIUHE = ["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"];
  /* 六冲：子午 丑未 寅申 卯酉 辰戌 巳亥 */
  var LIUCHONG = ["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"];
  /* 六害：子未 丑午 寅巳 卯辰 申亥 酉戌 */
  var LIUHAI = ["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"];
  /* 三合局：申子辰(水) 寅午戌(火) 巳酉丑(金) 亥卯未(木) */
  var SANHE = ["申子辰", "寅午戌", "巳酉丑", "亥卯未"];
  /* 天干五合：甲己 乙庚 丙辛 丁壬 戊癸 */
  var WUHE = ["甲己", "乙庚", "丙辛", "丁壬", "戊癸"];

  function inPairs(pairs, a, b) {
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      if ((p.charAt(0) === a && p.charAt(1) === b) || (p.charAt(0) === b && p.charAt(1) === a)) return true;
    }
    return false;
  }

  /** 地支关系：same → liuhe → chong → hai → sanhe → none（判定顺序同 fortune/rules.ts） */
  function branchRelation(a, b) {
    if (a === b) return "same";
    if (inPairs(LIUHE, a, b)) return "liuhe";
    if (inPairs(LIUCHONG, a, b)) return "chong";
    if (inPairs(LIUHAI, a, b)) return "hai";
    for (var i = 0; i < SANHE.length; i++) {
      if (SANHE[i].indexOf(a) >= 0 && SANHE[i].indexOf(b) >= 0) return "sanhe";
    }
    return "none";
  }

  /** 天干关系：wuhe / none */
  function stemRelation(a, b) {
    return inPairs(WUHE, a, b) ? "wuhe" : "none";
  }

  /* ---------- 术语表 ---------- */

  var T = {
    zh: {
      male: "男方", female: "女方",
      cols: ["", "年柱", "月柱", "日柱", "时柱"],
      rows: ["天干", "地支", "藏干", "纳音"],
      chartTitle: "排盘结果", solar: "公历", lunar: "农历", dayMaster: "日主", wuxing: "五行统计",
      badgesTitle: "配对速览",
      dim: { yearZhi: "年支", dayZhi: "日支", dayGan: "日干" },
      relBranch: { liuhe: "六合", sanhe: "三合", chong: "相冲", hai: "相害", same: "同支", none: "无特殊关系" },
      relStem: { wuhe: "五合", none: "无五合" },
      maleSupply: "男方补", femaleSupply: "女方补",
      loading: "正在解读…", retry: "重试", failed: "解读失败：", invalidDate: "日期无效，请检查输入",
      libLoading: "历书没能送达，请刷新页面或检查网络",
      mdLibLoading: "解读组件未完全加载，请稍后重试",
      errMap: {
        rate_limited: "来合婚的人有点多，月老正在逐一牵线，请稍等片刻再来",
        upstream_timeout: "月老翻查姻缘簿超时了，请再试一次",
        upstream_error: "月老暂时不在，稍后再来问问吧",
        not_configured: "月老暂时不在，稍后再来问问吧",
        invalid_request: "庚帖写得不太对，请核对后再递上来",
        payload_too_large: "庚帖太长了，请精简后再递上来",
        invalid_json: "庚帖写得不太对，请核对后再递上来",
      },
    },
    en: {
      male: "The Man", female: "The Woman",
      cols: ["", "Year", "Month", "Day", "Hour"],
      rows: ["Stem", "Branch", "Hidden", "NaYin"],
      chartTitle: "Charts Result", solar: "Solar", lunar: "Lunar", dayMaster: "Day Master", wuxing: "Five Elements",
      badgesTitle: "Pairing at a Glance",
      dim: { yearZhi: "Year Branch ", dayZhi: "Day Branch ", dayGan: "Day Stems " },
      relBranch: { liuhe: "Six Harmony", sanhe: "Three Harmony", chong: "Clash", hai: "Harm", same: "Same Branch", none: "No Special Tie" },
      relStem: { wuhe: "Five Union", none: "No Union" },
      maleSupply: "He supplies ", femaleSupply: "She supplies ",
      loading: "Interpreting…", retry: "Retry", failed: "Reading failed: ", invalidDate: "Invalid date, please check input",
      libLoading: "The almanac failed to load — please refresh or check your connection.",
      mdLibLoading: "Reading components not fully loaded, please retry later",
      errMap: {
        rate_limited: "The matchmaker is seeing many couples right now — please return in a few moments.",
        upstream_timeout: "The matchmaker is still flipping through the records — please try again.",
        upstream_error: "The matchmaker is away right now — please check back later.",
        not_configured: "The matchmaker is away right now — please check back later.",
        invalid_request: "Something in your submission looks off — please double-check and try again.",
        payload_too_large: "Your submission is a bit too long — please trim it and try again.",
        invalid_json: "Something in your submission looks off — please double-check and try again.",
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

  /* ---------- 排盘（口径与 bazi.js 一致） ---------- */

  function buildPerson(input) {
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

    function pillar(part) {
      var gan = ec["get" + part + "Gan"]();
      var zhi = ec["get" + part + "Zhi"]();
      return {
        gan: gan,
        zhi: zhi,
        ganZhi: gan + zhi,
        hideGan: ec["get" + part + "HideGan"]().join(","),
        naYin: ec["get" + part + "NaYin"](),
      };
    }
    var pillars = {
      year: pillar("Year"),
      month: pillar("Month"),
      day: pillar("Day"),
      hour: pillar("Time"),
    };

    // 五行统计只数四柱明干明支 8 个（与 bazi.js 口径一致，不含藏干）
    var wx = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
    ["year", "month", "day", "hour"].forEach(function (k) {
      wx[GAN_WX[pillars[k].gan]]++;
      wx[ZHI_WX[pillars[k].zhi]]++;
    });

    function two(n) { return (n < 10 ? "0" : "") + n; }
    return {
      solar: solar.getYear() + "-" + two(solar.getMonth()) + "-" + two(solar.getDay()),
      lunar: lunar.toString() + " " + lunar.getTimeZhi() + "时",
      dayMaster: pillars.day.gan + GAN_WX[pillars.day.gan],
      pillars: pillars,
      wuxingCount: wx,
    };
  }

  /* API 只传校验所需字段子集 */
  function apiPillar(p) {
    return { ganZhi: p.ganZhi, hideGan: p.hideGan, naYin: p.naYin };
  }
  function apiPerson(p) {
    return {
      solar: p.solar, lunar: p.lunar, dayMaster: p.dayMaster,
      pillars: { year: apiPillar(p.pillars.year), month: apiPillar(p.pillars.month), day: apiPillar(p.pillars.day), hour: apiPillar(p.pillars.hour) },
      wuxingCount: p.wuxingCount,
    };
  }

  /* ---------- 结果渲染 ---------- */

  function renderPersonBlock(title, p) {
    var order = ["year", "month", "day", "hour"];
    function row(label, cell) {
      return "<tr><th>" + esc(label) + "</th>" + order.map(cell).join("") + "</tr>";
    }
    var html = '<div class="hehun-chart"><h3>' + esc(title) + "</h3>";
    html += "<p>" + esc(T.solar) + "：" + esc(p.solar) + "<br>" + esc(T.lunar) + "：" + esc(p.lunar) + "<br>" + esc(T.dayMaster) + "：" + esc(p.dayMaster) + "</p>";
    html += '<table class="bazi-table"><tr>' + T.cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr>";
    html += row(T.rows[0], function (k) { return '<td class="bazi-gan">' + wxSpan(p.pillars[k].gan, GAN_WX[p.pillars[k].gan]) + "</td>"; });
    html += row(T.rows[1], function (k) { return '<td class="bazi-gan">' + wxSpan(p.pillars[k].zhi, ZHI_WX[p.pillars[k].zhi]) + "</td>"; });
    html += row(T.rows[2], function (k) { return "<td>" + esc(p.pillars[k].hideGan) + "</td>"; });
    html += row(T.rows[3], function (k) { return "<td>" + esc(p.pillars[k].naYin) + "</td>"; });
    html += "</table>";
    var wxText = ["金", "木", "水", "火", "土"].map(function (k) { return k + p.wuxingCount[k]; }).join(" ");
    html += "<p>" + esc(T.wuxing) + "：" + esc(wxText) + "</p></div>";
    return html;
  }

  /* 徽章配色：六合/三合/五合=吉(绿)，冲/害=凶(红)，同支/无=中性 */
  function badgeClass(v) {
    if (v === "liuhe" || v === "sanhe" || v === "wuhe") return "ji";
    if (v === "chong" || v === "hai") return "xiong";
    return "zhong";
  }

  function renderBadges(m, f, pairing) {
    var yzM = m.pillars.year.ganZhi.charAt(1);
    var yzF = f.pillars.year.ganZhi.charAt(1);
    var dzM = m.pillars.day.ganZhi.charAt(1);
    var dzF = f.pillars.day.ganZhi.charAt(1);
    var dgM = m.pillars.day.ganZhi.charAt(0);
    var dgF = f.pillars.day.ganZhi.charAt(0);
    var html = "<h3>" + esc(T.badgesTitle) + '</h3><div class="hehun-badges">';
    html += '<span class="hehun-badge ' + badgeClass(pairing.yearZhi) + '">' + esc(T.dim.yearZhi + T.relBranch[pairing.yearZhi]) + "（" + esc(yzM + yzF) + "）</span>";
    html += '<span class="hehun-badge ' + badgeClass(pairing.dayZhi) + '">' + esc(T.dim.dayZhi + T.relBranch[pairing.dayZhi]) + "（" + esc(dzM + dzF) + "）</span>";
    html += '<span class="hehun-badge ' + badgeClass(pairing.dayGan) + '">' + esc(T.dim.dayGan + T.relStem[pairing.dayGan]) + "（" + esc(dgM + dgF) + "）</span>";
    // 五行互补：一方缺（0 个）且另一方旺（≥3 个）
    ["金", "木", "水", "火", "土"].forEach(function (k) {
      if (f.wuxingCount[k] === 0 && m.wuxingCount[k] >= 3) {
        html += '<span class="hehun-badge ji">' + esc(T.maleSupply + k) + "</span>";
      }
      if (m.wuxingCount[k] === 0 && f.wuxingCount[k] >= 3) {
        html += '<span class="hehun-badge ji">' + esc(T.femaleSupply + k) + "</span>";
      }
    });
    html += "</div>";
    return html;
  }

  function renderResult(male, female, pairing) {
    var box = document.getElementById("hehun-result");
    var html = "<h2>" + esc(T.chartTitle) + "</h2>";
    html += '<div class="hehun-charts">';
    html += renderPersonBlock(T.male, male);
    html += renderPersonBlock(T.female, female);
    html += "</div>";
    html += renderBadges(male, female, pairing);
    box.innerHTML = html;
    box.hidden = false;
  }

  /* ---------- 解读请求（单次，失败可重试） ---------- */

  function setStatus(cls, text, withRetry, retryFn) {
    var body = document.querySelector("#card-hehun .bazi-card-body");
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

  function renderMarkdown(md) {
    // marked/DOMPurify 由 CDN 异步加载，未就绪时抛友好文案（走 catch/重试路径）
    if (typeof DOMPurify === "undefined" || typeof marked === "undefined") {
      throw new Error(T.mdLibLoading);
    }
    document.querySelector("#card-hehun .bazi-card-body").innerHTML = DOMPurify.sanitize(marked.parse(md));
  }

  function requestInterpret(payload) {
    return fetch("/api/hehun/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!json.ok) {
          var code = json.error && json.error.code;
          /* 抛出的已是完整用户文案（映射或兜底），catch 处直接展示、不再拼前缀 */
          throw new Error((T.errMap && T.errMap[code]) || T.failed + "HTTP " + res.status);
        }
        return json.data.markdown;
      });
    });
  }

  function runInterpret(payload) {
    setStatus("loading", T.loading, false);
    requestInterpret(payload).then(renderMarkdown).catch(function (e) {
      setStatus("error", e.message, true, function () { runInterpret(payload); });
    });
  }

  /* ---------- 表单 ---------- */

  var form = document.getElementById("hehun-form");

  function wireLeap(prefix) {
    var wrap = document.getElementById("hehun-" + prefix + "-leap-wrap");
    Array.prototype.forEach.call(form.elements[prefix + "-calendar"], function (r) {
      r.addEventListener("change", function () {
        wrap.hidden = form.elements[prefix + "-calendar"].value !== "lunar";
      });
    });
  }
  wireLeap("m");
  wireLeap("f");

  function readParty(prefix) {
    return {
      calendar: form.elements[prefix + "-calendar"].value,
      leap: document.getElementById("hehun-" + prefix + "-leap").checked,
      year: parseInt(document.getElementById("hehun-" + prefix + "-year").value, 10),
      month: parseInt(document.getElementById("hehun-" + prefix + "-month").value, 10),
      day: parseInt(document.getElementById("hehun-" + prefix + "-day").value, 10),
      hour: parseInt(document.getElementById("hehun-" + prefix + "-hour").value, 10),
    };
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var errBox = document.getElementById("hehun-form-error");
    errBox.hidden = true;
    if (typeof Lunar === "undefined" || typeof Solar === "undefined") {
      errBox.textContent = T.libLoading;
      errBox.hidden = false;
      return;
    }
    var male, female;
    try {
      male = buildPerson(readParty("m"));
      female = buildPerson(readParty("f"));
    } catch (e) {
      // lunar-javascript 对非法日期（如农历无此闰月、2月30日）直接抛异常
      errBox.textContent = T.invalidDate;
      errBox.hidden = false;
      return;
    }
    var pairing = {
      yearZhi: branchRelation(male.pillars.year.zhi, female.pillars.year.zhi),
      dayZhi: branchRelation(male.pillars.day.zhi, female.pillars.day.zhi),
      dayGan: stemRelation(male.pillars.day.gan, female.pillars.day.gan),
    };
    renderResult(male, female, pairing);
    var payload = { lang: LANG, male: apiPerson(male), female: apiPerson(female), pairing: pairing };
    document.getElementById("hehun-interpret").hidden = false;
    runInterpret(payload);
    document.getElementById("hehun-result").scrollIntoView({ behavior: "smooth" });
  });
})();
