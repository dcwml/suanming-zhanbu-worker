/* 小六壬页脚本：时间/数字起课 → 三宫落宫（月宫/日宫/落宫）→ 请求 AI 解读 */
(function () {
  "use strict";

  var app = document.getElementById("xiaoliuren-app");
  if (!app) return;
  var LANG = app.dataset.lang === "en" ? "en" : "zh";

  /* ---------- i18n 文案 ---------- */
  var T = {
    zh: {
      resultTitle: "课式结果",
      time: "时间起课", number: "数字起课",
      lunarLabel: "农历",
      monthPalace: "月宫", dayPalace: "日宫", resultPalace: "落宫",
      verseTitle: "落宫口诀",
      loading: "正在解读…", retry: "重试", failed: "解读失败：",
      noQuestion: "请先输入所求之事",
      invalidNumbers: "请输入 1 到 100000 之间的三个整数",
      mdLibLoading: "解读组件未完全加载，请稍后重试",
      errMap: {
        rate_limited: "问卦的人有点多，天师正在逐一回复，请稍等片刻再来",
        upstream_timeout: "天师凝神推演超时了，请再试一次",
        upstream_error: "天师暂时没空，稍后再来问问吧",
        not_configured: "天师暂时没空，稍后再来问问吧",
        invalid_request: "课帖写得不太对，请核对后再递上来",
        payload_too_large: "课帖太长了，请精简后再递上来",
        invalid_json: "课帖写得不太对，请核对后再递上来",
        cdn_failed: "历书没能送达，请刷新页面或检查网络",
      },
    },
    en: {
      resultTitle: "Casting Result",
      time: "Time casting", number: "Number casting",
      lunarLabel: "Lunar",
      monthPalace: "Month palace", dayPalace: "Day palace", resultPalace: "Result palace",
      verseTitle: "Result palace verse",
      loading: "Interpreting…", retry: "Retry", failed: "Reading failed: ",
      noQuestion: "Please enter your question first",
      invalidNumbers: "Please enter three integers between 1 and 100000",
      mdLibLoading: "Reading components not fully loaded, please retry later",
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

  /* ---------- 六宫数据（索引即起课序位：0 大安 … 5 空亡，与后端 src/xiaoliuren/types.ts 同表） ---------- */
  var PALACES = [
    {
      name: { zh: "大安", en: "Da An (Great Peace)" },
      deity: { zh: "青龙", en: "Green Dragon" },
      element: { zh: "木", en: "Wood" },
      grade: { zh: "大吉", en: "Great Fortune" },
      omen: { zh: "身不动时，静守安稳，谋事可成", en: "Stillness — hold steady and peace is preserved; plans may succeed" },
      poem: {
        zh: "大安事事昌，求谋在东方，失物去不远，宅舍保安康。行人身未动，病者主无妨，将军回田野，仔细好推详。",
        en: "Da An brings prosperity in all things; seek your plans toward the east. Lost objects are not far away; the household stays safe and well. The traveler has not yet set out; the sick face no harm. The general returns to the countryside — ponder carefully and all becomes clear.",
      },
    },
    {
      name: { zh: "留连", en: "Liu Lian (Lingering)" },
      deity: { zh: "玄武", en: "Black Tortoise" },
      element: { zh: "水", en: "Water" },
      grade: { zh: "平", en: "Neutral" },
      omen: { zh: "卒未归时，拖延晦暗，事难速成", en: "Lingering — delays and unclear prospects; matters are slow to complete" },
      poem: {
        zh: "留连事难成，求谋日未明，官事只宜缓，去者未回程。失物南方见，急讨方心称，更须防口舌，人口且平平。",
        en: "Liu Lian — affairs are hard to complete; plans stay unclear day after day. Official matters should be deferred; the one who left has not returned. Lost objects may be found in the south if sought promptly; guard against quarrels, and people and affairs remain middling.",
      },
    },
    {
      name: { zh: "速喜", en: "Su Xi (Swift Joy)" },
      deity: { zh: "朱雀", en: "Vermilion Bird" },
      element: { zh: "火", en: "Fire" },
      grade: { zh: "吉", en: "Favorable" },
      omen: { zh: "人即至时，喜事将临，信音即至", en: "Swift joy — happy news and good tidings approach quickly" },
      poem: {
        zh: "速喜喜来临，求财向南行，失物申午未，逢人路上寻。官事有福德，病者无祸侵，田宅六畜吉，行人有信音。",
        en: "Su Xi — joy is on its way; seek wealth toward the south. Lost objects at shen, wu or wei hours may be found along the road. Official matters carry blessings; the sick recover; fields, homes and livestock prosper; the traveler sends word.",
      },
    },
    {
      name: { zh: "赤口", en: "Chi Kou (Red Mouth)" },
      deity: { zh: "白虎", en: "White Tiger" },
      element: { zh: "金", en: "Metal" },
      grade: { zh: "凶", en: "Unfavorable" },
      omen: { zh: "官事凶时，口舌是非，争执宜防", en: "Quarrels — disputes and friction; beware of lawsuits and harsh words" },
      poem: {
        zh: "赤口主口舌，官非切宜防，失物速速讨，行人有惊慌。六畜多作怪，病者出西方，更须防咒咀，诚恐染瘟殃。",
        en: "Chi Kou rules quarrels and disputes; guard carefully against lawsuits. Seek lost objects at once; travelers face alarm. Livestock behave strangely; illness points west; beware of malice and curses, lest misfortune spread.",
      },
    },
    {
      name: { zh: "小吉", en: "Xiao Ji (Minor Fortune)" },
      deity: { zh: "六合", en: "Six Harmony" },
      element: { zh: "水", en: "Water" },
      grade: { zh: "吉", en: "Favorable" },
      omen: { zh: "人来喜时，和合吉庆，凡事可商", en: "Harmony — friendly unions and good news; matters can be settled amicably" },
      poem: {
        zh: "小吉最吉昌，路上好商量，阴人来报喜，失物在坤方。行人即便至，交关甚是强，凡事皆和合，病者叩穹苍。",
        en: "Xiao Ji — a most favorable sign; matters are settled amicably on the road. A woman brings good news; lost objects lie toward the southwest. The traveler arrives soon; dealings go well; all things harmonize; the sick recover through prayer.",
      },
    },
    {
      name: { zh: "空亡", en: "Kong Wang (Void)" },
      deity: { zh: "勾陈", en: "Hook Array" },
      element: { zh: "土", en: "Earth" },
      grade: { zh: "凶", en: "Unfavorable" },
      omen: { zh: "音信稀时，诸事落空，谋事难成", en: "Void — plans fall through; little to gain, news stays silent" },
      poem: {
        zh: "空亡事不祥，阴人少乖张，求财无利益，行人有灾殃。失物寻不见，官事有刑伤，病人逢暗鬼，解禳保安康。",
        en: "Kong Wang — affairs bode ill; matters run contrary. Seeking wealth brings no gain; travelers face harm. Lost objects will not be found; lawsuits bring injury; the sick encounter hidden evils — dispel them to regain peace.",
      },
    },
  ];

  var ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

  /* ---------- 起课算法（纯函数）：月上起月、日上起日、时上起课 ----------
     月数自大安起数，日落宫数 = 月落宫 + 日数 - 1，时落宫数 = 日落宫 + 时支序 - 1（均 mod 6）。
     数字起课同构：三数依次代月、日、时。 */
  function castByTime(now) {
    var sol = Solar.fromYmdHms(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
    var lunar = sol.getLunar();
    var month = Math.abs(lunar.getMonth()); /* 闰月取绝对值月数（民间起课不闰） */
    var day = lunar.getDay();
    var hourNo = ZHI.indexOf(lunar.getTimeZhi()) + 1; /* 子=1 … 亥=12 */
    var m = (month - 1) % 6;
    var d = (m + day - 1) % 6;
    var r = (d + hourNo - 1) % 6;
    return {
      meta: {
        method: "time",
        solar: fmtDateTime(now),
        lunar: lunar.getYearInGanZhi() + "年" + lunar.getMonthInChinese() + "月" + lunar.getDayInChinese() + " " + lunar.getTimeZhi() + "时",
      },
      palaces: [m, d, r],
    };
  }

  function castByNumbers(a, b, c) {
    var m = (a - 1) % 6;
    var d = (m + b - 1) % 6;
    var r = (d + c - 1) % 6;
    return { meta: { method: "number", numbers: [a, b, c] }, palaces: [m, d, r] };
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
  var qInput = document.getElementById("xiaoliuren-question");
  var castBtn = document.getElementById("xiaoliuren-cast");
  var libError = document.getElementById("xiaoliuren-lib-error");
  var numbersWrap = document.getElementById("xiaoliuren-numbers");
  var timeHint = document.getElementById("xiaoliuren-time-hint");
  var numInputs = [
    document.getElementById("xiaoliuren-num-1"),
    document.getElementById("xiaoliuren-num-2"),
    document.getElementById("xiaoliuren-num-3"),
  ];
  var resultBox = document.getElementById("xiaoliuren-result");
  var interpretBtn = document.getElementById("xiaoliuren-interpret-btn");
  var interpretSection = document.getElementById("xiaoliuren-interpret");
  var errorBox = document.getElementById("xiaoliuren-error");
  var chartSnapshot = null;

  function currentMethod() {
    var checked = app.querySelector('input[name="xiaoliuren-method"]:checked');
    return checked && checked.value === "number" ? "number" : "time";
  }

  /* ---------- 历书 CDN 守卫：时间起课依赖 lunar-javascript；
     数字起课不依赖，可先行。主 CDN 失败时 onerror 异步注入备源，故短轮询等待。 ---------- */
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

  Array.prototype.forEach.call(app.querySelectorAll('input[name="xiaoliuren-method"]'), function (radio) {
    radio.addEventListener("change", function () {
      var isNumber = currentMethod() === "number";
      numbersWrap.hidden = !isNumber;
      timeHint.hidden = isNumber;
      libError.hidden = isNumber || libState !== "failed";
      updateCastGate();
    });
  });

  /* ---------- 起课 ---------- */
  function readNumbers() {
    var out = [];
    for (var i = 0; i < 3; i++) {
      var v = numInputs[i].value.trim();
      if (!/^\d{1,6}$/.test(v)) return null;
      var n = parseInt(v, 10);
      if (n < 1 || n > 100000) return null;
      out.push(n);
    }
    return out;
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
      chart = castByNumbers(nums[0], nums[1], nums[2]);
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
    document.getElementById("xiaoliuren-step3").scrollIntoView({ behavior: "smooth" });
  });

  /* ---------- 课式渲染 ---------- */
  function palaceCard(label, palace, isResult) {
    var html = '<div class="xiaoliuren-palace-card' + (isResult ? " xiaoliuren-palace-result" : "") + '">';
    html += '<div class="xiaoliuren-palace-label">' + esc(label) + "</div>";
    html += '<div class="xiaoliuren-palace-name">' + esc(palace.name.zh) + "</div>";
    if (LANG === "en") html += '<div class="xiaoliuren-palace-en">' + esc(palace.name.en) + "</div>";
    html += '<div class="xiaoliuren-palace-attrs">' + esc(palace.deity[LANG]) + " · " + esc(palace.element[LANG]) + "</div>";
    html += '<div class="xiaoliuren-grade" data-grade="' + esc(palace.grade.zh) + '">' + esc(palace.grade[LANG]) + "</div>";
    html += "</div>";
    return html;
  }

  function showResult(chart) {
    var meta = chart.meta;
    var labels = [T.monthPalace, T.dayPalace, T.resultPalace];
    var html = "<h2>" + esc(T.resultTitle) + "</h2>";
    html += '<p class="xiaoliuren-meta">';
    if (meta.method === "time") {
      html += esc(T.time) + " · " + esc(meta.solar) + " · " + esc(T.lunarLabel) + " " + esc(meta.lunar);
    } else {
      html += esc(T.number) + " · " + meta.numbers.join(", ");
    }
    html += "</p>";
    html += '<div class="xiaoliuren-palace-display">';
    for (var i = 0; i < 3; i++) {
      html += palaceCard(labels[i], PALACES[chart.palaces[i]], i === 2);
    }
    html += "</div>";
    var result = PALACES[chart.palaces[2]];
    html += '<div class="xiaoliuren-verse">';
    html += "<h3>" + esc(T.verseTitle) + "</h3>";
    html += '<p class="xiaoliuren-omen">' + esc(result.omen[LANG]) + "</p>";
    html += '<p class="xiaoliuren-poem">' + esc(result.poem[LANG]) + "</p>";
    html += "</div>";
    resultBox.innerHTML = html;
    resultBox.hidden = false;
    interpretBtn.hidden = false;
  }

  /* ---------- 解读请求 ---------- */
  function buildPayload(chart) {
    var payload = {
      lang: LANG,
      question: chart.question,
      method: chart.meta.method,
      monthPalace: PALACES[chart.palaces[0]].name.zh,
      dayPalace: PALACES[chart.palaces[1]].name.zh,
      resultPalace: PALACES[chart.palaces[2]].name.zh,
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
    var body = interpretSection.querySelector(".xiaoliuren-card-body");
    body.innerHTML = "";
    var p = document.createElement("p");
    p.className = "status loading";
    p.textContent = text;
    body.appendChild(p);
    if (withRetry) {
      var btn = document.createElement("button");
      btn.className = "xiaoliuren-retry";
      btn.textContent = T.retry;
      btn.addEventListener("click", requestInterpret);
      body.appendChild(btn);
    }
  }

  function renderMarkdown(md) {
    if (typeof DOMPurify === "undefined" || typeof marked === "undefined") {
      throw new Error(T.mdLibLoading);
    }
    interpretSection.querySelector(".xiaoliuren-card-body").innerHTML = DOMPurify.sanitize(marked.parse(md));
  }

  function requestInterpret() {
    errorBox.hidden = true;
    interpretSection.hidden = false;
    setStatus(T.loading, false);
    fetch("/api/xiaoliuren/interpret", {
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
