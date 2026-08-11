/* 择吉日页脚本：lunar-javascript 扫描未来日子 → 宜忌/避冲/评分过滤排序 → 渲染日卡 → LLM 详解 */
(function () {
  "use strict";

  var LANG = document.documentElement.lang === "zh-CN" ? "zh" : "en";

  /* ---------- 核心常量 ---------- */

  /* 事项全量词表（库官方用词；已排除哨兵词"馀事勿取""诸事不宜"） */
  var MATTERS = ["祭祀","开光","解除","进人口","交易","立券","纳财","纳畜","嫁娶","祈福","求嗣","出行","安床","栽种","移柩","会亲友","除服","成服","动土","筑堤","开池","塞穴","入殓","破土","安葬","裁衣","安门","扫舍","作灶","造畜稠","拆卸","修造","起基","上梁","开渠","启钻","纳采","订盟","安香","出火","入宅","移徙","安机械","经络","修饰垣墙","平治道涂","沐浴","谢土","捕捉","破屋","坏垣","治病","伐木","开市","普渡","冠笄","竖柱","理发","放水","作梁","补垣","盖屋","合脊","塑绘","牧养","斋醮","定磉","结网","畋猎","挂匾","造桥","造车器","开仓","出货财","断蚁","修坟","立碑","整手足甲","架马","合寿木","求医","造仓","开厕","掘井","取渔","入学","开生坟","割蜜","置产","合帐","教牛马","问名","造庙","纳婿","针灸","雕刻","归岫","开柱眼","安碓磑","归宁","造船","习艺","赴任","修门"];

  /* 分组：zh 四组 + 其余归"其他"；en 同成员、组名英文 */
  var MATTER_GROUPS_ZH = {
    "婚恋嫁娶": ["嫁娶","纳采","订盟","问名","纳婿","归宁","会亲友"],
    "宅居动土": ["入宅","移徙","修造","动土","起基","上梁","竖柱","安门","盖屋","安床","作灶","开渠","掘井","破屋","坏垣","修门"],
    "商务出行": ["开市","交易","立券","纳财","出行","赴任","入学","习艺","开仓","出货财","置产"],
    "祭祀祈福": ["祭祀","祈福","开光","斋醮","求嗣","安葬","入殓","移柩","破土","启钻","修坟","立碑"],
  };
  var MATTER_GROUPS_EN = {
    "婚恋嫁娶": "Weddings & Family",
    "宅居动土": "Home & Building",
    "商务出行": "Business & Travel",
    "祭祀祈福": "Worship & Blessings",
  };

  var ZODIACS = ["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"];
  var ZODIAC_EN = { 鼠: "Rat", 牛: "Ox", 虎: "Tiger", 兔: "Rabbit", 龙: "Dragon", 蛇: "Snake", 马: "Horse", 羊: "Goat", 猴: "Monkey", 鸡: "Rooster", 狗: "Dog", 猪: "Pig" };
  var BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  var GANS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
  var DIR_EN = { 东: "East", 南: "South", 西: "West", 北: "North" };
  /* 八卦方位 → 通俗方位（zh 与 almanac 的 Desc 用词一致；en 用罗盘八方） */
  var GUA_DIR = {
    坎: { zh: "正北", en: "North" },
    艮: { zh: "东北", en: "Northeast" },
    震: { zh: "正东", en: "East" },
    巽: { zh: "东南", en: "Southeast" },
    离: { zh: "正南", en: "South" },
    坤: { zh: "西南", en: "Southwest" },
    兑: { zh: "正西", en: "West" },
    乾: { zh: "西北", en: "Northwest" },
  };
  var WD_ZH = ["周日","周一","周二","周三","周四","周五","周六"];
  var WD_EN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  var MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  /* 12 时辰起始小时（子时起 23 点） */
  var HOUR_STARTS = [23,1,3,5,7,9,11,13,15,17,19,21];

  /* 六十甲子（干支序数同奇偶即阴阳相配） */
  var JIAZI = [];
  for (var zi = 0; zi < 60; zi++) JIAZI.push(GANS[zi % 10] + BRANCHES[zi % 12]);

  /* 六冲：地支序号相差 6 */
  function isChong(a, b) {
    var ia = BRANCHES.indexOf(a), ib = BRANCHES.indexOf(b);
    return ia >= 0 && ib >= 0 && Math.abs(ia - ib) === 6;
  }
  /* 六害 */
  var HARM = { 子:"未", 未:"子", 丑:"午", 午:"丑", 寅:"巳", 巳:"寅", 卯:"辰", 辰:"卯", 申:"亥", 亥:"申", 酉:"戌", 戌:"酉" };
  /* 三刑（不含自刑）：寅巳申、丑戌未三刑 + 子卯互刑 */
  function isXing(a, b) {
    var g1 = ["寅","巳","申"], g2 = ["丑","戌","未"];
    if (g1.indexOf(a) >= 0 && g1.indexOf(b) >= 0 && a !== b) return true;
    if (g2.indexOf(a) >= 0 && g2.indexOf(b) >= 0 && a !== b) return true;
    return (a === "子" && b === "卯") || (a === "卯" && b === "子");
  }
  /* 煞方：日支三合推导 */
  var SHA_DIR = { 寅:"北", 午:"北", 戌:"北", 申:"南", 子:"南", 辰:"南", 巳:"东", 酉:"东", 丑:"东", 亥:"西", 卯:"西", 未:"西" };
  /* 杨公忌：农历月 → 忌日（七月两个） */
  var YANG_GONG = { 1:[13], 2:[11], 3:[9], 4:[7], 5:[5], 6:[3], 7:[1,29], 8:[27], 9:[25], 10:[23], 11:[21], 12:[19] };
  /* 建除权重 */
  var ZHI_XING_SCORE = { 成:2, 开:2, 除:1, 定:1, 危:-1, 破:-2, 闭:-2 };

  /* 错误文案（与后端约定逐字一致） */
  var ERR_MAP = {
    zh: {
      rate_limited: "问卦的人有点多，天师正在逐一回复，请稍等片刻再来",
      upstream_timeout: "天师凝神推演超时了，请再试一次",
      upstream_error: "天师暂时没空，稍后再来问问吧",
      not_configured: "天师暂时没空，稍后再来问问吧",
      invalid_request: "卦帖写得不太对，请核对后再递上来",
      payload_too_large: "卦帖太长了，请精简后再递上来",
      invalid_json: "卦帖写得不太对，请核对后再递上来",
      cdn_failed: "历书没能送达，请刷新页面或检查网络",
    },
    en: {
      rate_limited: "The Master is attending to many visitors — please return in a few moments.",
      upstream_timeout: "The Master's reading ran long — please try again.",
      upstream_error: "The Master is unavailable right now — please check back later.",
      not_configured: "The Master is unavailable right now — please check back later.",
      invalid_request: "Something in your request looks off — please double-check and try again.",
      payload_too_large: "Your request is a bit too long — please trim it and try again.",
      invalid_json: "Something in your request looks off — please double-check and try again.",
      cdn_failed: "The almanac failed to load — please refresh or check your connection.",
    },
  };

  var T = {
    zh: {
      note: "",
      zodiacNone: "不指定",
      pillarNone: "不选",
      invalidDate: "日期无效，请检查输入",
      converted: "已按生日排出四柱",
      empty: "当前条件下暂无合适日子，可尝试放宽日期范围或关闭严格模式。",
      lunarPrefix: "农历",
      clashTpl: "冲{chong}煞{dir}",
      jiShen: "吉神", xiongSha: "凶煞", none: "无",
      huangdao: "黄道吉日", heidao: "黑道日",
      tongshuTpl: "{road}，{zx}值日，宜{matter}；冲{chong}煞{dir}。",
      colloquial: "日子是参考传统黄历的讲究，心诚则灵，祝你办事顺利。",
      clashWarn: "提示：此日冲{zodiac}，与所填生肖相冲，建议避开。",
      more: "展开详情（方位与吉时）",
      xiShen: "喜神", caiShen: "财神", fuShen: "福神",
      luckyTimes: "吉时 Top 3", noLuckyTime: "本日无吉时记录",
      yiLabel: "宜",
      detail: "详解", loading: "天师推演中…", retry: "重试", failed: "详解失败：",
      mdLibLoading: "解读组件未完全加载，请稍后重试",
    },
    en: {
      note: "Terms follow the traditional almanac wording",
      zodiacNone: "None",
      pillarNone: "—",
      invalidDate: "Invalid date, please check input",
      converted: "Pillars derived from birth date",
      empty: "No suitable dates under current conditions — try widening the range or turning off strict mode.",
      lunarPrefix: "Lunar ",
      clashTpl: "Clashes with {chong}, sha {dir}",
      jiShen: "Lucky gods", xiongSha: "Evil spirits", none: "None",
      huangdao: "Yellow Road lucky day", heidao: "Black Road day",
      tongshuTpl: "{road}: {zx} officer presides, suitable for {matter}; clashes with {chong}, sha {dir}.",
      colloquial: "These are traditional almanac references — may your plans go smoothly.",
      clashWarn: "Heads-up: this day clashes with {zodiac}, matching an entered zodiac — consider avoiding it.",
      more: "Details (directions & lucky hours)",
      xiShen: "Joy 喜神", caiShen: "Wealth 财神", fuShen: "Fortune 福神",
      luckyTimes: "Top 3 lucky hours", noLuckyTime: "No lucky hours recorded for this day",
      yiLabel: "Good for",
      detail: "Full reading", loading: "The Master is consulting…", retry: "Retry", failed: "Reading failed: ",
      mdLibLoading: "Reading components not fully loaded, please retry later",
    },
  }[LANG];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function zodiacOf(branch) {
    var i = BRANCHES.indexOf(branch);
    return i >= 0 ? ZODIACS[i] : "";
  }
  function zodiacName(branch) {
    var z = zodiacOf(branch);
    return LANG === "zh" ? z : (ZODIAC_EN[z] || z);
  }

  /* ---------- 扫描/过滤/排序主流程 ---------- */

  function scanDays(n) {
    var out = [], today = new Date();
    for (var i = 0; i < n; i++) {
      var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      var lunar = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate()).getLunar();
      out.push({ date: d, lunar: lunar, yi: lunar.getDayYi(),
        dayGanZhi: lunar.getDayInGanZhi(), dayZhi: lunar.getDayInGanZhi().slice(1),
        chongShengXiao: lunar.getDayChongShengXiao(), jiShen: lunar.getDayJiShen(),
        xiongSha: lunar.getDayXiongSha(), tianShenLuck: lunar.getDayTianShenLuck(),
        zhiXing: lunar.getZhiXing(), xiu: lunar.getXiu(), xiuLuck: lunar.getXiuLuck(),
        weekday: d.getDay() });
    }
    return out;
  }
  function isGeneralBad(day) {
    if (day.xiongSha.indexOf("月破") >= 0) return true;
    var yg = YANG_GONG[day.lunar.getMonth()];
    return !!(yg && yg.indexOf(day.lunar.getDay()) >= 0);
  }
  function personBranches(person) {
    if (person.pillars) return [person.pillars.year.slice(1), person.pillars.day.slice(1)];
    return [person.yearBranch];
  }
  function isClashForPersons(dayZhi, persons, strict) {
    for (var i = 0; i < persons.length; i++) {
      var bs = personBranches(persons[i]);
      for (var j = 0; j < bs.length; j++) {
        if (isChong(dayZhi, bs[j])) return true;
        if (strict && (HARM[dayZhi] === bs[j] || isXing(dayZhi, bs[j]))) return true;
      }
    }
    return false;
  }
  function scoreDay(day) {
    return (day.tianShenLuck === "吉" ? 3 : -3) + (ZHI_XING_SCORE[day.zhiXing] || 0) + (day.xiuLuck === "吉" ? 1 : -1);
  }

  /* ---------- DOM 引用 ---------- */

  var matterSel = document.getElementById("zeji-matter");
  var rangeSel = document.getElementById("zeji-range");
  var results = document.getElementById("zeji-results");
  var emptyBox = document.getElementById("zeji-empty");
  var runBtn = document.getElementById("zeji-run");
  var libError = document.getElementById("zeji-lib-error");
  var strictBox = document.getElementById("zeji-strict");
  var addPersonBtn = document.getElementById("zeji-add-person");
  var person2Wrap = document.getElementById("zeji-person2-wrap");
  if (!matterSel || !runBtn) return;

  /* 每人状态：{ yearBranch: 地支|null, pillars: {year,month,day,hour}|null } */
  var personState = [{ yearBranch: null, pillars: null }, { yearBranch: null, pillars: null }];
  var lastHits = [];

  /* ---------- 表单填充 ---------- */

  function fillMatterSelect() {
    var grouped = {};
    Object.keys(MATTER_GROUPS_ZH).forEach(function (g) {
      var og = document.createElement("optgroup");
      og.label = LANG === "zh" ? g : MATTER_GROUPS_EN[g];
      MATTER_GROUPS_ZH[g].forEach(function (m) {
        grouped[m] = true;
        var op = document.createElement("option");
        op.value = m;
        op.textContent = m;
        og.appendChild(op);
      });
      matterSel.appendChild(og);
    });
    var others = MATTERS.filter(function (m) { return !grouped[m]; });
    if (others.length) {
      var og2 = document.createElement("optgroup");
      og2.label = LANG === "zh" ? "其他" : "Other";
      others.forEach(function (m) {
        var op = document.createElement("option");
        op.value = m;
        op.textContent = m;
        og2.appendChild(op);
      });
      matterSel.appendChild(og2);
    }
    if (LANG === "en" && T.note) {
      var note = document.createElement("p");
      note.className = "zeji-note";
      note.textContent = T.note;
      var form = matterSel.closest(".zeji-form");
      if (form) form.insertBefore(note, form.firstChild);
    }
  }

  function fillZodiacSelect(sel) {
    var op0 = document.createElement("option");
    op0.value = "";
    op0.textContent = T.zodiacNone;
    sel.appendChild(op0);
    ZODIACS.forEach(function (z, i) {
      var op = document.createElement("option");
      op.value = BRANCHES[i];
      op.textContent = LANG === "zh" ? z : z + " " + ZODIAC_EN[z];
      sel.appendChild(op);
    });
  }

  /* 柱位下拉：填六十甲子 */
  function fillPillarSelect(sel) {
    var prev = sel.value;
    sel.innerHTML = "";
    var op0 = document.createElement("option");
    op0.value = "";
    op0.textContent = T.pillarNone;
    sel.appendChild(op0);
    JIAZI.forEach(function (gz) {
      var op = document.createElement("option");
      op.value = gz;
      op.textContent = gz;
      sel.appendChild(op);
    });
    if (prev && sel.querySelector('option[value="' + prev + '"]')) sel.value = prev;
  }

  function shichenLabel(i) {
    var s = HOUR_STARTS[i], e = HOUR_STARTS[(i + 1) % 12];
    var range = two(s) + ":00–" + two(e) + ":00";
    return LANG === "zh" ? BRANCHES[i] + "时（" + range + "）" : BRANCHES[i] + " hour (" + range + ")";
  }
  function fillHourSelect(sel) {
    for (var i = 0; i < 12; i++) {
      var op = document.createElement("option");
      /* 午时缺省取 12:00，其余时辰取起始小时 */
      op.value = String(i === 6 ? 12 : HOUR_STARTS[i]);
      op.textContent = shichenLabel(i);
      sel.appendChild(op);
    }
    sel.value = "12";
  }

  /* ---------- 每人（p1/p2）接线 ---------- */

  function personEls(i) {
    var p = i === 0 ? "p1" : "p2";
    var box = document.getElementById("zeji-bazi-" + (i + 1));
    return {
      box: box,
      mode: document.getElementById("zeji-mode-" + (i + 1)),
      zodiac: document.getElementById("zeji-zodiac-" + (i + 1)),
      pillarRow: box ? box.querySelector(".zeji-pillar-row") : null,
      birthRow: box ? box.querySelector(".zeji-birth-row") : null,
      pillars: box ? box.querySelectorAll("[data-pillar-slot]") : [],
      birth: function (f) { return box ? box.querySelector('[data-birth-field="' + p + "-" + f + '"]') : null; },
      radios: box ? box.querySelectorAll('[data-birth-field="' + p + '-calendar"]') : [],
    };
  }

  function pillarSlot(els, name) {
    for (var i = 0; i < els.pillars.length; i++) {
      if (els.pillars[i].getAttribute("data-pillar-slot").slice(-name.length) === name) return els.pillars[i];
    }
    return null;
  }

  function showPersonError(els, msg) {
    var errEl = els.box.querySelector(".zeji-person-error");
    if (!errEl) {
      errEl = document.createElement("p");
      errEl.className = "zeji-error zeji-person-error";
      els.box.appendChild(errEl);
    }
    if (msg) {
      errEl.textContent = msg;
      errEl.hidden = false;
    } else {
      errEl.hidden = true;
    }
  }

  /* 从四柱下拉同步状态：四柱齐全则成柱（回填并锁定生肖），否则清柱 */
  function syncPillarsFromSelects(i, els) {
    var names = ["year", "month", "day", "hour"];
    var vals = names.map(function (n) { return pillarSlot(els, n).value; });
    if (vals.every(function (v) { return v; })) {
      personState[i].pillars = { year: vals[0], month: vals[1], day: vals[2], hour: vals[3] };
      var yb = vals[0].slice(1);
      personState[i].yearBranch = yb;
      els.zodiac.value = yb;
      els.zodiac.disabled = true;
      showPersonError(els, "");
    } else if (personState[i].pillars) {
      personState[i].pillars = null;
      els.zodiac.disabled = false;
    }
    updateStrictState();
  }

  /* 生日转四柱（同 bazi.js 模式）：往返校验非法日期，行内报错不弹框 */
  function convertBirth(i, els) {
    var year = parseInt(els.birth("year").value, 10);
    var month = parseInt(els.birth("month").value, 10);
    var day = parseInt(els.birth("day").value, 10);
    var hour = parseInt(els.birth("hour").value, 10);
    if (!year || !month || !day || isNaN(hour)) {
      /* 字段未填齐：不转换，但清除旧行内提示避免误导 */
      showPersonError(els, "");
      return;
    }
    var calendar = "solar";
    Array.prototype.forEach.call(els.radios, function (r) { if (r.checked) calendar = r.value; });
    var leap = els.birth("leap").checked;
    var solar;
    try {
      if (calendar === "solar") {
        /* lunar-javascript 对公历溢出日期（如 2 月 30 日）不抛错，需自行往返校验 */
        var probe = new Date(year, month - 1, day);
        if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
          throw new Error("invalid date");
        }
        solar = Solar.fromYmdHms(year, month, day, hour, 0, 0);
      } else {
        /* 农历；闰月用负月份（lunar-javascript 约定） */
        solar = Lunar.fromYmdHms(year, leap ? -month : month, day, hour, 0, 0).getSolar();
      }
    } catch (e) {
      showPersonError(els, T.invalidDate);
      return;
    }
    var ec = solar.getLunar().getEightChar();
    var pillars = {
      year: ec.getYearGan() + ec.getYearZhi(),
      month: ec.getMonthGan() + ec.getMonthZhi(),
      day: ec.getDayGan() + ec.getDayZhi(),
      hour: ec.getTimeGan() + ec.getTimeZhi(),
    };
    /* 回填四柱下拉 */
    pillarSlot(els, "year").value = pillars.year;
    ["month", "day", "hour"].forEach(function (n) { pillarSlot(els, n).value = pillars[n]; });
    syncPillarsFromSelects(i, els);
    showPersonError(els, T.converted);
  }

  function wirePerson(i) {
    var els = personEls(i);
    if (!els.box || !els.zodiac) return;

    /* 双模式切换 */
    els.mode.addEventListener("change", function () {
      var birth = els.mode.value === "birth";
      els.pillarRow.hidden = birth;
      els.birthRow.hidden = !birth;
    });

    /* 公历/农历切换 → 闰月复选框显隐，并按新历法重排四柱 */
    Array.prototype.forEach.call(els.radios, function (r) {
      r.addEventListener("change", function () {
        var lunar = false;
        Array.prototype.forEach.call(els.radios, function (r2) { if (r2.checked && r2.value === "lunar") lunar = true; });
        var leapLabel = els.birth("leap").closest("label");
        if (leapLabel) leapLabel.hidden = !lunar;
        convertBirth(i, els);
      });
    });

    /* 生肖下拉 */
    els.zodiac.addEventListener("change", function () {
      if (!els.zodiac.disabled) {
        personState[i].yearBranch = els.zodiac.value || null;
        updateStrictState();
      }
    });

    /* 柱位下拉：填六十甲子。六十甲子本身即阴阳相配（阳干配阳支、阴干配阴支），
       各柱阴阳互不约束（真实八字年月日时柱奇偶可不同），故不做跨柱过滤。 */
    var names = ["year", "month", "day", "hour"];
    names.forEach(function (n) {
      var sel = pillarSlot(els, n);
      fillPillarSelect(sel);
      sel.addEventListener("change", function () {
        syncPillarsFromSelects(i, els);
      });
    });

    /* 生日字段变化 → 尝试转换 */
    fillHourSelect(els.birth("hour"));
    ["leap", "year", "month", "day", "hour"].forEach(function (f) {
      var el = els.birth(f);
      if (el) el.addEventListener("change", function () { convertBirth(i, els); });
    });
  }

  /* ---------- 严格开关联动 ---------- */

  function anyPersonHasData() {
    for (var i = 0; i < 2; i++) {
      var visible = i === 0 || !person2Wrap.hidden;
      if (visible && (personState[i].yearBranch || personState[i].pillars)) return true;
    }
    return false;
  }
  function updateStrictState() {
    if (!strictBox) return;
    var has = anyPersonHasData();
    strictBox.disabled = !has;
    if (!has) strictBox.checked = false;
  }

  /* ---------- 查询 ---------- */

  function collectPersons() {
    var out = [];
    for (var i = 0; i < 2; i++) {
      if (i === 1 && person2Wrap.hidden) continue;
      var st = personState[i];
      if (st.pillars) {
        out.push({ yearBranch: st.pillars.year.slice(1), pillars: st.pillars });
      } else if (st.yearBranch) {
        out.push({ yearBranch: st.yearBranch });
      }
    }
    return out;
  }

  function query() {
    var matter = matterSel.value;
    var n = parseInt(rangeSel.value, 10) || 90;
    var persons = collectPersons();
    var strict = !!(strictBox && strictBox.checked);
    var hits = scanDays(n).filter(function (day) {
      return day.yi.indexOf(matter) >= 0 && !isGeneralBad(day) && !isClashForPersons(day.dayZhi, persons, strict);
    });
    hits.sort(function (a, b) {
      var s = scoreDay(b) - scoreDay(a);
      return s !== 0 ? s : a.date - b.date;
    });
    lastHits = hits;
    renderCards(hits, matter, persons);
  }

  /* ---------- 卡片渲染 ---------- */

  function dateHead(day) {
    var d = day.date;
    if (LANG === "zh") {
      return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日 · " + WD_ZH[day.weekday];
    }
    return MONTHS_EN[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear() + " · " + WD_EN[day.weekday];
  }
  function lunarHead(day) {
    return T.lunarPrefix + day.lunar.getMonthInChinese() + "月" + day.lunar.getDayInChinese();
  }
  /* 冲肖展示：zh 用原词，en 映射英文（库返回的是生肖名而非地支） */
  function chongName(day) {
    return LANG === "zh" ? day.chongShengXiao : (ZODIAC_EN[day.chongShengXiao] || day.chongShengXiao);
  }
  function clashText(day) {
    var dir = SHA_DIR[day.dayZhi];
    return T.clashTpl
      .replace("{chong}", chongName(day))
      .replace("{dir}", LANG === "zh" ? dir : DIR_EN[dir] || dir);
  }
  function tongshuText(day, matter) {
    var road = day.tianShenLuck === "吉" ? T.huangdao : T.heidao;
    var dir = SHA_DIR[day.dayZhi];
    return T.tongshuTpl
      .replace("{road}", road)
      .replace("{zx}", day.zhiXing)
      .replace("{matter}", matter)
      .replace("{chong}", chongName(day))
      .replace("{dir}", LANG === "zh" ? dir : (DIR_EN[dir] || dir));
  }
  function colloquialText(day, persons) {
    var text = T.colloquial;
    for (var i = 0; i < persons.length; i++) {
      var bs = personBranches(persons[i]);
      for (var j = 0; j < bs.length; j++) {
        if (isChong(day.dayZhi, bs[j])) {
          return text + " " + T.clashWarn.replace("{zodiac}", zodiacName(bs[j]));
        }
      }
    }
    return text;
  }

  function timeRange(i) {
    return two(HOUR_STARTS[i]) + ":00–" + two(HOUR_STARTS[(i + 1) % 12]) + ":00";
  }
  /* 吉时 Top 3：吉时入池，所宜含所选事项者优先 */
  function luckyTimes(day, matter) {
    var pool = [];
    for (var i = 0; i < 12; i++) {
      var t = Solar.fromYmdHms(day.date.getFullYear(), day.date.getMonth() + 1, day.date.getDate(), HOUR_STARTS[i], 0, 0).getLunar();
      if (t.getTimeTianShenLuck() !== "吉") continue;
      var yi = t.getTimeYi();
      pool.push({ idx: i, yi: yi, hit: yi.indexOf(matter) >= 0 });
    }
    pool.sort(function (a, b) { return (b.hit ? 1 : 0) - (a.hit ? 1 : 0); });
    return pool.slice(0, 3);
  }

  /* 八卦方位 → 「艮·东北」式：保留八卦字符并补上通俗方位 */
  function posText(gua) {
    var d = GUA_DIR[gua];
    if (!d) return gua;
    return gua + "·" + (LANG === "zh" ? d.zh : d.en);
  }

  function extraHtml(day, matter) {
    var html = '<dl class="zeji-positions">';
    html += "<dt>" + esc(T.xiShen) + "</dt><dd>" + esc(posText(day.lunar.getDayPositionXi())) + "</dd>";
    html += "<dt>" + esc(T.caiShen) + "</dt><dd>" + esc(posText(day.lunar.getDayPositionCai())) + "</dd>";
    html += "<dt>" + esc(T.fuShen) + "</dt><dd>" + esc(posText(day.lunar.getDayPositionFu())) + "</dd>";
    html += "</dl>";
    html += '<p class="zeji-times-title">' + esc(T.luckyTimes) + "</p>";
    var times = luckyTimes(day, matter);
    if (!times.length) {
      html += "<p>" + esc(T.noLuckyTime) + "</p>";
      return html;
    }
    html += '<ul class="zeji-times">';
    times.forEach(function (t) {
      var head = BRANCHES[t.idx] + "时 " + timeRange(t.idx);
      html += "<li><strong>" + esc(head) + "</strong> · " + esc(T.yiLabel) + "：" + esc(t.yi.slice(0, 4).join("、")) + "</li>";
    });
    html += "</ul>";
    return html;
  }

  function renderCards(hits, matter, persons) {
    emptyBox.hidden = hits.length > 0;
    if (!hits.length) {
      results.innerHTML = "";
      return;
    }
    var html = "";
    hits.forEach(function (day, idx) {
      var ji = day.tianShenLuck === "吉";
      html += '<div class="zeji-card">';
      html += '<div class="zeji-card-head">';
      html += '<span class="zeji-date">' + esc(dateHead(day)) + "</span>";
      html += '<span class="zeji-lunar">' + esc(lunarHead(day)) + "</span>";
      html += '<span class="zeji-ganzhi">' + esc(day.dayGanZhi) + "</span>";
      html += '<span class="zeji-badge ' + (ji ? "ji" : "xiong") + '">' + esc(ji ? T.huangdao : T.heidao) + "</span>";
      html += '<span class="zeji-zhixing">' + esc(day.zhiXing) + "</span>";
      html += "</div>";
      html += '<div class="zeji-card-mid">';
      html += '<span class="zeji-clash">' + esc(clashText(day)) + "</span>";
      html += '<span class="zeji-shen">' + esc(T.jiShen) + "：" + esc(day.jiShen.slice(0, 3).join("、") || T.none) + "</span>";
      html += '<span class="zeji-sha">' + esc(T.xiongSha) + "：" + esc(day.xiongSha.slice(0, 3).join("、") || T.none) + "</span>";
      html += "</div>";
      html += '<p class="zeji-tongshu">' + esc(tongshuText(day, matter)) + "</p>";
      html += '<p class="zeji-colloquial">' + esc(colloquialText(day, persons)) + "</p>";
      html += "<details>" + "<summary>" + esc(T.more) + "</summary>" + extraHtml(day, matter) + "</details>";
      html += '<div class="zeji-detail-wrap">';
      html += '<button type="button" class="zeji-detail" data-idx="' + idx + '">' + esc(T.detail) + "</button>";
      html += '<div class="zeji-detail-body"></div>';
      html += "</div>";
      html += "</div>";
    });
    results.innerHTML = html;
  }

  /* ---------- LLM 详解 ---------- */

  function buildRequest(day, matter, persons) {
    var lunar = day.lunar;
    return {
      lang: LANG,
      matter: matter,
      candidate: {
        solar: day.date.getFullYear() + "-" + two(day.date.getMonth() + 1) + "-" + two(day.date.getDate()),
        lunar: lunar.getMonthInChinese() + "月" + lunar.getDayInChinese(),
        dayGanZhi: day.dayGanZhi,
        zhiXing: day.zhiXing,
        tianShenLuck: day.tianShenLuck,
        xiu: day.xiu,
        jiShen: day.jiShen.slice(),
        xiongSha: day.xiongSha.slice(),
        chongShengXiao: day.chongShengXiao,
        shaDirection: SHA_DIR[day.dayZhi],
      },
      persons: persons,
    };
  }

  function requestDetail(btn) {
    var idx = parseInt(btn.getAttribute("data-idx"), 10);
    var day = lastHits[idx];
    if (!day) return;
    var body = btn.closest(".zeji-detail-wrap").querySelector(".zeji-detail-body");
    btn.disabled = true;
    btn.textContent = T.loading;
    fetch("/api/zeji/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildRequest(day, matterSel.value, collectPersons())),
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!json.ok) {
          var code = json.error && json.error.code;
          throw new Error(code && ERR_MAP[LANG][code] ? ERR_MAP[LANG][code] : T.failed + "HTTP " + res.status);
        }
        /* marked/DOMPurify 由 CDN 异步加载，未就绪时报友好文案 */
        if (typeof DOMPurify === "undefined" || typeof marked === "undefined") {
          throw new Error(T.mdLibLoading);
        }
        body.innerHTML = DOMPurify.sanitize(marked.parse(json.data.markdown));
        btn.textContent = T.detail;
        btn.disabled = false;
      });
    }).catch(function (e) {
      body.innerHTML = "";
      var p = document.createElement("p");
      p.className = "zeji-error";
      p.textContent = e.message;
      body.appendChild(p);
      btn.textContent = T.retry;
      btn.disabled = false;
    });
  }

  results.addEventListener("click", function (ev) {
    var btn = ev.target.closest(".zeji-detail");
    if (btn && !btn.disabled) requestDetail(btn);
  });

  /* ---------- 初始化 ---------- */

  /* CDN 守卫：历书未达则报错并禁用查询。主 CDN 失败时 onerror 会异步注入
     备源脚本，故短轮询等待备源（最多约 5 秒），超时才判为加载失败。 */
  function waitLib(retries, onOk, onFail) {
    if (typeof Solar !== "undefined") return onOk();
    if (retries <= 0) return onFail();
    setTimeout(function () { waitLib(retries - 1, onOk, onFail); }, 500);
  }

  function init() {
    waitLib(10, boot, function () {
      libError.textContent = ERR_MAP[LANG].cdn_failed;
      libError.hidden = false;
      runBtn.disabled = true;
    });
  }

  function boot() {
    fillMatterSelect();
    fillZodiacSelect(document.getElementById("zeji-zodiac-1"));
    fillZodiacSelect(document.getElementById("zeji-zodiac-2"));
    wirePerson(0);
    wirePerson(1);
    updateStrictState();

    addPersonBtn.addEventListener("click", function () {
      person2Wrap.hidden = false;
      addPersonBtn.hidden = true;
    });

    runBtn.addEventListener("click", function () {
      emptyBox.hidden = true;
      query();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
