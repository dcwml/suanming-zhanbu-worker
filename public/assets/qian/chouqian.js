/* 灵签抽签页共享脚本：三签种（黄大仙/观音/月老）同一份。
   页面骨架 #chouqian-app（data-lang / data-qian）+ 签文数据文件（window.QIAN_DATA）先于本脚本加载。
   摇签与查签均为纯前端展示，不发起任何网络请求。 */
(function () {
  "use strict";

  var app = document.getElementById("chouqian-app");
  if (!app) return;
  var LANG = app.dataset.lang === "en" ? "en" : "zh";

  /* ---------- i18n 文案 ---------- */
  var T = {
    zh: {
      shaking: "摇签中…",
      redraw: "再摇一签",
      redrawNote: "传统讲究一事一签：同一件事在情况没有变化之前，不宜反复抽签。",
      drawSource: "诚心摇得",
      lookupSource: "按签号查阅",
      questionLabel: "所问之事：",
      noData: "签文数据未完全加载，请刷新页面重试",
      invalidNo: "请输入 1 到 {total} 之间的签号",
      meaningTitle: "解签",
      aspectsTitle: "断语",
      noLabel: "第 {no} 签",
    },
    en: {
      shaking: "Shaking…",
      redraw: "Draw Another Stick",
      redrawNote: "Tradition asks for one stick per matter — avoid drawing repeatedly about the same thing while the situation is unchanged.",
      drawSource: "Drawn by shaking",
      lookupSource: "Looked up by number",
      questionLabel: "Your question: ",
      noData: "The oracle data has not fully loaded — please refresh the page and try again.",
      invalidNo: "Please enter a stick number between 1 and {total}.",
      meaningTitle: "Interpretation",
      aspectsTitle: "Verdicts",
      noLabel: "Stick No. {no}",
    },
  }[LANG];

  function data() {
    return window.QIAN_DATA || null;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function fill(tpl, map) {
    return tpl.replace(/\{(\w+)\}/g, function (_, key) {
      return Object.prototype.hasOwnProperty.call(map, key) ? String(map[key]) : "";
    });
  }

  /* 均匀随机取 1..max：优先 crypto.getRandomValues 拒绝采样，无 crypto 时回退 Math.random */
  function randomInt(max) {
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      var limit = Math.floor(0x100000000 / max) * max;
      var buf = new Uint32Array(1);
      for (;;) {
        window.crypto.getRandomValues(buf);
        if (buf[0] < limit) return (buf[0] % max) + 1;
      }
    }
    return Math.floor(Math.random() * max) + 1;
  }

  function findByNo(d, no) {
    for (var i = 0; i < d.signs.length; i++) {
      if (d.signs[i].no === no) return d.signs[i];
    }
    return null;
  }

  /* ---------- DOM ---------- */
  var drawBtn = document.getElementById("chouqian-draw");
  var tube = document.getElementById("chouqian-tube");
  var lookupBtn = document.getElementById("chouqian-lookup-btn");
  var lookupNo = document.getElementById("chouqian-lookup-no");
  var errorBox = document.getElementById("chouqian-error");
  var resultBox = document.getElementById("chouqian-result");
  var drawBtnText = drawBtn ? drawBtn.textContent : "";
  var shaking = false;

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
  }

  /* ---------- 签文渲染（摇签与查签共用） ---------- */
  function gradeLabel(grade) {
    var d = data();
    if (LANG === "en" && d && d.gradeLabels && d.gradeLabels[grade]) return d.gradeLabels[grade];
    return grade;
  }

  function showSign(sign, source) {
    var d = data();
    var html = '<div class="chouqian-sign">';
    html += '<div class="chouqian-sign-head">';
    html += '<span class="chouqian-no">' + esc(fill(T.noLabel, { no: sign.no })) + "</span>";
    html += '<span class="chouqian-grade" data-grade="' + esc(sign.grade) + '">' + esc(gradeLabel(sign.grade)) + "</span>";
    html += "</div>";
    html += '<p class="chouqian-source">' + esc(source);
    var question = document.getElementById("chouqian-question").value.trim();
    if (question) html += " · " + esc(T.questionLabel) + esc(question);
    html += "</p>";
    if (LANG === "en") {
      html += '<h3 class="chouqian-title">' + esc(sign.title) + '<span class="chouqian-title-zh">' + esc(sign.titleZh) + "</span></h3>";
      html += '<p class="chouqian-poem chouqian-poem-zh">' + esc(sign.poemZh) + "</p>";
      html += '<p class="chouqian-poem">' + esc(sign.poem) + "</p>";
    } else {
      html += '<h3 class="chouqian-title">' + esc(sign.title) + "</h3>";
      html += '<p class="chouqian-poem">' + esc(sign.poem) + "</p>";
    }
    html += '<div class="chouqian-meaning"><h4>' + esc(T.meaningTitle) + "</h4><p>" + esc(sign.meaning) + "</p></div>";
    html += '<div class="chouqian-aspects"><h4>' + esc(T.aspectsTitle) + "</h4><dl>";
    for (var i = 0; i < d.aspects.length; i++) {
      html += "<div><dt>" + esc(d.aspects[i]) + "</dt><dd>" + esc(sign.aspects[i] || "") + "</dd></div>";
    }
    html += "</dl></div>";
    html += '<button type="button" id="chouqian-redraw">' + esc(T.redraw) + "</button>";
    html += '<p class="chouqian-redraw-note">' + esc(T.redrawNote) + "</p>";
    html += "</div>";
    resultBox.innerHTML = html;
    resultBox.hidden = false;
  }

  /* ---------- 摇签：签筒动画约 1.4 秒后出签 ---------- */
  function draw() {
    if (shaking) return;
    var d = data();
    if (!d) {
      showError(T.noData);
      return;
    }
    errorBox.hidden = true;
    shaking = true;
    drawBtn.disabled = true;
    drawBtn.textContent = T.shaking;
    if (tube) tube.classList.add("is-shaking");
    setTimeout(function () {
      if (tube) tube.classList.remove("is-shaking");
      drawBtn.disabled = false;
      drawBtn.textContent = drawBtnText;
      shaking = false;
      showSign(findByNo(d, randomInt(d.total)), T.drawSource);
      document.getElementById("chouqian-step3").scrollIntoView({ behavior: "smooth" });
    }, 1400);
  }

  /* ---------- 查签：按签号直接查阅（在庙里抽了签回来查解的场景） ---------- */
  function lookup() {
    var d = data();
    if (!d) {
      showError(T.noData);
      return;
    }
    var v = (lookupNo.value || "").trim();
    var no = /^\d+$/.test(v) ? parseInt(v, 10) : NaN;
    var sign = no >= 1 && no <= d.total ? findByNo(d, no) : null;
    if (!sign) {
      showError(fill(T.invalidNo, { total: d.total }));
      return;
    }
    errorBox.hidden = true;
    showSign(sign, T.lookupSource);
    document.getElementById("chouqian-step3").scrollIntoView({ behavior: "smooth" });
  }

  drawBtn.addEventListener("click", draw);
  lookupBtn.addEventListener("click", lookup);
  lookupNo.addEventListener("keydown", function (e) {
    if (e.key === "Enter") lookup();
  });
  /* 「再摇一签」在结果区内动态渲染，用事件委托绑定 */
  resultBox.addEventListener("click", function (e) {
    if (e.target && e.target.id === "chouqian-redraw") draw();
  });
})();
