/* 紫微斗数页脚本：iztro 三级加载排盘 → 4×4 盘格渲染 → 串行请求三段命理解读 */
(function () {
  "use strict";

  var app = document.getElementById("ziwei-app");
  if (!app) return;
  var LANG = app.dataset.lang === "en" ? "en" : "zh";

  /* ---------- iztro 三级加载：unpkg → jsdelivr → 本地 vendor ---------- */

  var IZTRO_SOURCES = [
    "https://unpkg.com/iztro@2.6.0/dist/iztro.min.js",
    "https://cdn.jsdelivr.net/npm/iztro@2.6.0/dist/iztro.min.js",
    "/assets/vendor/iztro.min.js",
  ];

  function loadIztro(idx) {
    if (idx >= IZTRO_SOURCES.length) return; // 三源皆败：提交时 !window.iztro 会提示 T.libLoading
    var s = document.createElement("script");
    s.src = IZTRO_SOURCES[idx];
    s.onload = function () {
      // CDN 错误页也返回 200 并触发 onload，须复核全局对象存在
      if (!window.iztro || !window.iztro.astro) loadIztro(idx + 1);
    };
    s.onerror = function () { loadIztro(idx + 1); };
    document.head.appendChild(s);
  }
  loadIztro(0);

  /* ---------- 文案 ---------- */

  var T = {
    zh: {
      chartTitle: "排盘结果", solar: "公历", lunar: "农历", time: "时辰",
      soul: "命主", bodyMaster: "身主", fiveElementsClass: "五行局", zodiac: "生肖",
      shenGong: "身宫", noMajor: "无主星",
      decadalBar: "当前大限：{gz}（{age} 岁）",
      loading: "正在解读…", waiting: "正在解读…",
      retry: "重试", failed: "解读失败：",
      invalidDate: "日期无效，请检查输入",
      renderFailed: "排盘渲染出了点问题，请刷新页面重试",
      libLoading: "星盘组件没能送达，请刷新页面或检查网络",
      mdLibLoading: "解读组件未完全加载，请稍后重试",
      errMap: {
        rate_limited: "问卦的人有点多，天师正在逐一回复，请稍等片刻再来",
        upstream_timeout: "天师凝神推演超时了，请再试一次",
        upstream_error: "天师暂时没空，稍后再来问问吧",
        not_configured: "天师暂时没空，稍后再来问问吧",
        invalid_request: "卦帖写得不太对，请核对后再递上来",
        payload_too_large: "卦帖太长了，请精简后再递上来",
        invalid_json: "卦帖写得不太对，请核对后再递上来",
      },
    },
    en: {
      chartTitle: "Chart Result", solar: "Solar", lunar: "Lunar", time: "Hour",
      soul: "Soul Star", bodyMaster: "Body Star", fiveElementsClass: "Five-Elements Class", zodiac: "Zodiac",
      shenGong: "Body Palace", noMajor: "No major star",
      decadalBar: "Current decade: {gz} (ages {age})",
      loading: "Interpreting…", waiting: "Interpreting…",
      retry: "Retry", failed: "Reading failed: ",
      invalidDate: "Invalid date, please check input",
      renderFailed: "Something went wrong while rendering the chart — please refresh and try again.",
      libLoading: "The chart library failed to load — please refresh or check your connection.",
      mdLibLoading: "Reading components not fully loaded, please retry later",
      errMap: {
        rate_limited: "The Master is attending to many visitors — please return in a few moments.",
        upstream_timeout: "The Master's reading ran long — please try again.",
        upstream_error: "The Master is unavailable right now — please check back later.",
        not_configured: "The Master is unavailable right now — please check back later.",
        invalid_request: "Something in your request looks off — please double-check and try again.",
        payload_too_large: "Your request is a bit too long — please trim it and try again.",
        invalid_json: "Something in your request looks off — please double-check and try again.",
      },
    },
  }[LANG];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  /* ---------- 排盘 ---------- */

  /* 4×4 盘格：十二地支固定方位（子居下、午居上、卯居左、酉居右），中宫 2×2 为信息格 */
  var BRANCH_POS = {
    巳: "1 / 1", 午: "1 / 2", 未: "1 / 3", 申: "1 / 4",
    辰: "2 / 1", 酉: "2 / 4",
    卯: "3 / 1", 戌: "3 / 4",
    寅: "4 / 1", 丑: "4 / 2", 子: "4 / 3", 亥: "4 / 4",
  };

  /* iztro minorStars.type → payload kind（其余类型不入盘面与 payload） */
  var KIND_MAP = { soft: "吉", tough: "煞", lucun: "禄", tianma: "马" };

  function two(n) { return (n < 10 ? "0" : "") + n; }

  /** 数据盘恒用 zh-CN（英文盘亮度是数值，无法展示与传输）；英文页另排一盘仅取本地化名 */
  function castPair(input, dateStr, genderZh) {
    var a = window.iztro.astro;
    if (input.calendar === "solar") {
      var zh = a.bySolar(dateStr, input.timeIndex, genderZh);
      return { zh: zh, disp: LANG === "en" ? a.bySolar(dateStr, input.timeIndex, genderZh, undefined, "en-US") : zh };
    }
    var zhL = a.byLunar(dateStr, input.timeIndex, genderZh, input.leap);
    return { zh: zhL, disp: LANG === "en" ? a.byLunar(dateStr, input.timeIndex, genderZh, input.leap, undefined, "en-US") : zhL };
  }

  function slimPalaces(chart) {
    return chart.palaces.map(function (p) {
      return {
        name: p.name,
        branch: p.earthlyBranch,
        isBody: !!p.isBodyPalace,
        majors: p.majorStars.filter(function (s) { return s.type === "major"; })
          .map(function (s) { return { name: s.name, brightness: s.brightness || "", mutagen: s.mutagen || "" }; }),
        minors: p.minorStars.filter(function (s) { return KIND_MAP[s.type]; })
          .map(function (s) { return { name: s.name, kind: KIND_MAP[s.type], mutagen: s.mutagen || "" }; }),
      };
    });
  }

  function buildChart(input) {
    var genderZh = input.gender === "male" ? "男" : "女";
    var dateStr = input.year + "-" + two(input.month) + "-" + two(input.day);
    var pair = castPair(input, dateStr, genderZh);
    var chartZh = pair.zh;

    var now = new Date();
    var todayStr = now.getFullYear() + "-" + two(now.getMonth() + 1) + "-" + two(now.getDate());
    var h = chartZh.horoscope(todayStr, input.timeIndex);
    var decadalPalace = chartZh.palaces[h.decadal.index];

    return {
      disp: pair.disp,
      api: {
        gender: input.gender,
        solar: dateStr,
        lunar: chartZh.lunarDate,
        time: chartZh.time,
        zodiac: chartZh.zodiac,
        soul: chartZh.soul,
        body: chartZh.body,
        fiveElementsClass: chartZh.fiveElementsClass,
        palaces: slimPalaces(chartZh),
        decadal: {
          ganZhi: h.decadal.heavenlyStem + h.decadal.earthlyBranch,
          ageRange: decadalPalace.decadal.range[0] + "-" + decadalPalace.decadal.range[1],
          palaceNames: h.decadal.palaceNames,
          mutagen: h.decadal.mutagen,
        },
        yearly: {
          year: now.getFullYear(),
          ganZhi: h.yearly.heavenlyStem + h.yearly.earthlyBranch,
          palaceNames: h.yearly.palaceNames,
          mutagen: h.yearly.mutagen,
        },
      },
    };
  }

  /* ---------- 盘面渲染 ---------- */

  function starMeta(m) {
    return '<span class="ziwei-star-meta">' + esc(m.brightness)
      + (m.mutagen ? '<span class="ziwei-hua">' + esc(m.mutagen) + "</span>" : "") + "</span>";
  }

  function renderResult(built) {
    var api = built.api;
    var disp = built.disp;
    var html = "<h2>" + esc(T.chartTitle) + "</h2>";
    html += "<p>" + esc(T.solar) + "：" + esc(api.solar) + "　" + esc(T.lunar) + "：" + esc(api.lunar)
      + "　" + esc(T.time) + "：" + esc(api.time) + "</p>";
    html += '<div class="ziwei-board-wrap"><div class="ziwei-board">';
    html += '<div class="ziwei-center">'
      + "<p><strong>" + esc(T.soul) + "</strong> " + esc(disp.soul)
      + "　<strong>" + esc(T.bodyMaster) + "</strong> " + esc(disp.body) + "</p>"
      + "<p>" + esc(T.fiveElementsClass) + "：" + esc(disp.fiveElementsClass) + "</p>"
      + "<p>" + esc(T.zodiac) + "：" + esc(disp.zodiac) + "</p>"
      + "</div>";
    api.palaces.forEach(function (p, i) {
      // disp 与 zh 盘同源同序；英文盘仅提供本地化星名宫名，亮度/四化/地支取中文盘
      var dp = disp.palaces[i];
      var cls = "ziwei-cell" + (p.name === "命宫" ? " ming" : "") + (p.isBody ? " body" : "");
      html += '<div class="' + cls + '" style="grid-area:' + BRANCH_POS[p.branch] + '">';
      html += '<div class="ziwei-cell-head">' + esc(dp.name)
        + (p.isBody ? "·" + esc(T.shenGong) : "")
        + '<span class="ziwei-branch">' + esc(p.branch) + "</span></div>";
      if (!p.majors.length) {
        html += '<div class="ziwei-major ziwei-empty">' + esc(T.noMajor) + "</div>";
      }
      p.majors.forEach(function (m, j) {
        var name = dp.majorStars[j] ? dp.majorStars[j].name : m.name;
        html += '<div class="ziwei-major">' + esc(name) + starMeta(m) + "</div>";
      });
      if (p.minors.length) {
        html += '<div class="ziwei-minors">';
        p.minors.forEach(function (m, j) {
          var name = dp.minorStars[j] ? dp.minorStars[j].name : m.name;
          var k = m.kind === "吉" ? "ji" : m.kind === "煞" ? "sha" : m.kind === "禄" ? "lu" : "ma";
          html += '<span class="ziwei-minor ziwei-minor-' + k + '">' + esc(name)
            + (m.mutagen ? '<span class="ziwei-hua">' + esc(m.mutagen) + "</span>" : "") + "</span>";
        });
        html += "</div>";
      }
      html += "</div>";
    });
    html += "</div></div>";
    html += '<p class="ziwei-decadal-bar">'
      + esc(T.decadalBar.replace("{gz}", api.decadal.ganZhi).replace("{age}", api.decadal.ageRange)) + "</p>";

    var box = document.getElementById("ziwei-result");
    box.innerHTML = html;
    box.hidden = false;
  }

  /* ---------- 解读请求（串行） ---------- */

  var PART_IDS = ["mingpan", "daxian", "liunian"];
  var chainVersion = 0; // 每次提交递增，旧链据此丢弃过期的 DOM 写入

  function cardBody(part) {
    return document.querySelector("#card-" + part + " .ziwei-card-body");
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
      btn.className = "ziwei-retry";
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
    return fetch("/api/ziwei/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ part: part, lang: LANG, chart: chartSnapshot }),
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
      setStatus(part, "error", e.message, true, function () { runChain(startIndex, chartSnapshot, version); });
    });
  }

  /* ---------- 表单 ---------- */

  var form = document.getElementById("ziwei-form");
  var leapWrap = document.getElementById("ziwei-leap-wrap");
  Array.prototype.forEach.call(form.elements.calendar, function (r) {
    r.addEventListener("change", function () {
      leapWrap.hidden = form.elements.calendar.value !== "lunar";
    });
  });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var errBox = document.getElementById("ziwei-form-error");
    errBox.hidden = true;
    if (!window.iztro || !window.iztro.astro) {
      errBox.textContent = T.libLoading;
      errBox.hidden = false;
      return;
    }
    var input = {
      calendar: form.elements.calendar.value,
      leap: document.getElementById("ziwei-leap").checked,
      year: parseInt(document.getElementById("ziwei-year").value, 10),
      month: parseInt(document.getElementById("ziwei-month").value, 10),
      day: parseInt(document.getElementById("ziwei-day").value, 10),
      timeIndex: parseInt(document.getElementById("ziwei-hour").value, 10),
      gender: form.elements.gender.value,
    };
    var built;
    try {
      built = buildChart(input);
    } catch (e) {
      // iztro 对非法日期（如农历无此闰月、公历溢出日期）抛异常
      errBox.textContent = T.invalidDate;
      errBox.hidden = false;
      return;
    }
    try {
      renderResult(built);
      document.getElementById("ziwei-interpret").hidden = false;
      chainVersion++;
      runChain(0, built.api, chainVersion);
      document.getElementById("ziwei-result").scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      // 渲染层异常不得静默失败：显式提示，避免无声死点击
      errBox.textContent = T.renderFailed;
      errBox.hidden = false;
      return;
    }
  });
})();
