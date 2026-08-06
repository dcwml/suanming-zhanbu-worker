/**
 * almanac-canvas.js — 老黄历 Canvas 渲染引擎（传统黄历通胜式）
 *
 * 渐进增强策略：
 *   1. 页面默认输出 HTML（SEO + 无JS兜底）
 *   2. JS 执行后读取内嵌 JSON 数据 → Canvas 2D 绘制传统黄历风格图片
 *   3. 绘制成功后隐藏原始 HTML，展示 Canvas 图片
 *   4. 用户可右键/长按保存或复制图片
 *
 * 数据来源：section.daily-almanac 内的 <script type="application/json" class="almanac-data">
 */
(function () {
  "use strict";

  // ── 配置常量 ──────────────────────────────────────────────
  const W = 750; // 画布逻辑宽度（微信标准分享尺寸）
  const SCALE = window.devicePixelRatio || 1; // 高清屏适配
  const PAD_X = 48; // 水平内边距
  const FONT_SERIF = '"Noto Serif SC", "Songti SC", "SimSun", "STSong", Georgia, serif';

  // 传统黄历配色
  const C = {
    paper: "#faf6ed",       // 宣纸底色
    paperDark: "#f3ede0",   // 宣纸暗部（用于交替行/区块）
    ink: "#241f1b",         // 墨色主文字
    inkMuted: "#5a5045",    // 墨色次要文字
    vermilion: "#a62e1b",   // 朱红（标题/宜）
    vermilionBg: "rgba(166, 46, 27, 0.06)", // 宜区背景
    gold: "#a08050",        // 金色装饰线/印章
    goldDark: "#8a6838",    // 深金
    borderOuter: "#8b7355", // 外框线
    borderInner: "#c4b49a", // 内框线
    grayText: "#666656",    // 忌文字色
    grayBg: "rgba(80, 80, 70, 0.04)", // 忌区背景
    highlightBg: "#fdf6ec", // 日柱高亮背景
    highlightBorder: "#c4a060", // 日柱高亮边框
  };

  // ── 工具函数 ──────────────────────────────────────────────

  /** 安全取值 */
  function get(obj, path, fallback) {
    const keys = path.split(".");
    let cur = obj;
    for (const k of keys) {
      if (cur == null) return fallback;
      cur = cur[k];
    }
    return cur ?? fallback;
  }

  /** 设置字体并返回当前行高估算值 */
  function setFont(ctx, size, weight) {
    ctx.font = `${weight || ""} ${size}px ${FONT_SERIF}`;
    return size * 1.75; // 行高比
  }

  /** 测量文字宽度 */
  function measure(ctx, text) {
    return ctx.measureText(text).width;
  }

  /** 文字自动换行：返回每行文字数组 */
  function wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    const lines = [];
    // 按 · 或空格分词（宜忌内容用 · 分隔）
    let remaining = text;
    while (remaining.length > 0) {
      if (measure(ctx, remaining) <= maxWidth) {
        lines.push(remaining);
        break;
      }
      // 尝试在分隔符处断行
      let brIdx = -1;
      // 优先在 · 处断
      const dotIdx = remaining.indexOf("·");
      const spaceIdx = remaining.indexOf(" ");
      let searchEnd = remaining.length;
      for (let i = 0; i < remaining.length; i++) {
        const seg = remaining.slice(0, i + 1);
        if (measure(ctx, seg) > maxWidth) {
          searchEnd = i;
          break;
        }
      }
      // 在 searchEnd 范围内找最近的断点
      for (let i = searchEnd; i >= 0; i--) {
        if (remaining[i] === "·" || remaining[i] === " ") {
          brIdx = i + 1; // 断点之后
          break;
        }
      }
      if (brIdx <= 0) {
        // 无法断词，强制截断
        brIdx = searchEnd || 1;
      }
      lines.push(remaining.slice(0, brIdx).trim());
      remaining = remaining.slice(brIdx).trimStart();
    }
    return lines;
  }

  /** 绘制圆角矩形（实心或描边） */
  function roundRect(ctx, x, y, w, h, r, fill, stroke, lineWidth) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
  }

  // ── 高度计算阶段（先算总高度再绘制）──────────────────────

  /** 计算所需画布总高度 */
  function calcHeight(data) {
    // 使用离屏 canvas 测量（不显示）
    const mc = document.createElement("canvas");
    const ctx = mc.getContext("2d");
    mc.width = W * SCALE;
    ctx.scale(SCALE, SCALE);

    let y = 0;

    // 顶部留白 + 标题
    y += 36; // top padding
    y += 42; // title
    y += 10; // gap
    y += 22; // date
    y += 20; // gap after date

    // 四柱
    y += 90; // sizhu area height
    y += 18; // gap

    // 干支网格 2×2
    y += 44 * 2 + 12; // 2 rows + gap
    y += 14; // gap

    // 生肖
    y += 24;
    y += 16; // gap

    // 宜 — 需要测量
    setFont(ctx, 28);
    const yiLines = wrapText(ctx, data.yi || "", W - PAD_X * 2 - 40);
    y += Math.max(yiLines.length * 34 + 28, 64); // padding + lines
    y += 12;

    // 忌
    setFont(ctx, 28);
    const jiLines = wrapText(ctx, data.ji || "", W - PAD_X * 2 - 40);
    y += Math.max(jiLines.length * 34 + 28, 64);
    y += 16;

    // 解读
    setFont(ctx, 26);
    const interpLines = wrapText(ctx, data.interpretation || "", W - PAD_X * 2 - 32);
    y += interpLines.length * 36 + 36; // lines + padding

    y += 40; // bottom padding

    return Math.ceil(y);
  }

  // ── 绘制函数 ──────────────────────────────────────────────

  /** 主绘制入口 */
  function draw(canvas, data) {
    const H = calcHeight(data);
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    const ctx = canvas.getContext("2d");
    ctx.scale(SCALE, SCALE);

    // 清空背景（宣纸色）
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, W, H);

    // 宣纸纹理效果（极淡噪点）
    drawPaperTexture(ctx, W, H);

    // 外框双线边框
    drawDoubleFrame(ctx, W, H);

    let y = 36; // 当前 Y 坐标

    // ── 标题 ──
    y = drawTitle(ctx, data.title, y);
    y += 10;

    // ── 日期 ──
    y = drawDate(ctx, data.date, y);
    y += 20;

    // ── 四柱 ──
    y = drawSizhu(ctx, data.sizhu, y);
    y += 18;

    // ── 干支信息网格 ──
    y = drawGanzhiGrid(ctx, data.ganzhi, y);
    y += 14;

    // ── 生肖 ──
    y = drawZodiacNote(ctx, data.zodiac, data.lang, y);
    y += 16;

    // ── 宜 ──
    y = drawYiJi(ctx, data.yi, "yi", y);
    y += 12;

    // ── 忌 ──
    y = drawYiJi(ctx, data.ji, "ji", y);
    y += 16;

    // ── 解读 ──
    y = drawInterpretation(ctx, data.interpretation, y);

    // ── 印章 ──
    drawSeal(ctx, W - PAD_X - 10, H - 36);
  }

  /** 宣纸噪点纹理 */
  function drawPaperTexture(ctx, w, h) {
    const imgData = ctx.createImageData(Math.floor(w), Math.floor(h));
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 6 | 0; // 0~5 的随机噪声
      d[i] = 250 - v;     // R
      d[i + 1] = 246 - v; // G
      d[i + 2] = 237 - v; // B
      d[i + 3] = 15;      // Alpha（非常淡）
    }
    ctx.putImageData(imgData, 0, 0);
  }

  /** 双线外框 */
  function drawDoubleFrame(ctx, w, h) {
    const m = 10; // 外边距
    const outerW = 3;
    const innerW = 1;
    const gap = 4;

    // 外框
    ctx.strokeStyle = C.borderOuter;
    ctx.lineWidth = outerW;
    ctx.strokeRect(m, m, w - m * 2, h - m * 2);

    // 内框
    ctx.strokeStyle = C.borderInner;
    ctx.lineWidth = innerW;
    ctx.strokeRect(m + outerW + gap, m + outerW + gap, w - (m + outerW + gap) * 2, h - (m + outerW + gap) * 2);

    // 四角装饰点
    const corners = [[m, m], [w - m, m], [m, h - m], [w - m, h - m]];
    ctx.fillStyle = C.gold;
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /** 标题区域 */
  function drawTitle(ctx, title, y) {
    setFont(ctx, 38, "700");
    ctx.fillStyle = C.vermilion;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(title, W / 2, y + 21);

    // 标题下方装饰线
    const tw = measure(ctx, title);
    const lx = (W - tw) / 2 - 20;
    const rx = (W + tw) / 2 + 20;
    const ly = y + 42;

    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo((W - tw) / 2 - 6, ly);
    ctx.moveTo((W + tw) / 2 + 6, ly);
    ctx.lineTo(rx, ly);
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 中间小菱形装饰
    ctx.beginPath();
    ctx.moveTo(W / 2, ly - 4);
    ctx.lineTo(W / 2 + 4, ly);
    ctx.lineTo(W / 2, ly + 4);
    ctx.lineTo(W / 2 - 4, ly);
    ctx.closePath();
    ctx.fillStyle = C.gold;
    ctx.fill();

    return y + 52;
  }

  /** 日期行 */
  function drawDate(ctx, date, y) {
    setFont(ctx, 24);
    ctx.fillStyle = C.inkMuted;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(date, W / 2, y);
    return y + 28;
  }

  /** 四柱区域 */
  function drawSizhu(ctx, sizhu, y) {
    const count = sizhu ? sizhu.length : 4;
    const boxW = (W - PAD_X * 2 - (count - 1) * 10) / count;
    const boxH = 78;

    (sizhu || []).forEach((item, i) => {
      const x = PAD_X + i * (boxW + 10);
      const isHighlight = item.highlight;

      // 背景
      roundRect(ctx, x, y, boxW, boxH, 6,
        isHighlight ? C.highlightBg : "#fdfbf7",
        isHighlight ? C.highlightBorder : "#e5ddd2", 1);

      // 标签
      setFont(ctx, 20);
      ctx.fillStyle = C.inkMuted;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(item.label || "", x + boxW / 2, y + 10);

      // 值
      setFont(ctx, 30, "700");
      ctx.fillStyle = isHighlight ? C.vermilion : C.ink;
      ctx.textBaseline = "middle";
      ctx.fillText(item.value || "", x + boxW / 2, y + boxH / 2 + 4);

      // 备注（如"今日""子时例"）
      if (item.note) {
        setFont(ctx, 16);
        ctx.fillStyle = C.goldDark;
        ctx.textBaseline = "bottom";
        ctx.fillText(item.note, x + boxW / 2, y + boxH - 8);
      }
    });

    return y + boxH;
  }

  /** 干支信息 2×2 网格 */
  function drawGanzhiGrid(ctx, ganzhi, y) {
    const gridW = (W - PAD_X * 2 - 12) / 2; // 2列，中间 12px 间距
    const cellH = 44;

    (ganzhi || []).forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = PAD_X + col * (gridW + 12);
      const cy = y + row * (cellH + 6);

      // 背景
      roundRect(ctx, x, cy, gridW, cellH, 5, "#faf7ef", "#e8e0d0", 1);

      // 标签
      setFont(ctx, 19);
      ctx.fillStyle = C.inkMuted;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(item.label || "", x + 14, cy + cellH / 2);

      // 值
      setFont(ctx, 23, "600");
      ctx.fillStyle = C.ink;
      ctx.textAlign = "right";
      ctx.fillText(item.value || "", x + gridW - 14, cy + cellH / 2);
    });

    return y + cellH * 2 + 6;
  }

  /** 生肖提示 */
  function drawZodiacNote(ctx, zodiac, lang, y) {
    setFont(ctx, 21);
    ctx.fillStyle = C.inkMuted;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const label = lang === "zh"
      ? `当日生肖：${zodiac}`
      : `Day Zodiac: ${zodiac}`;
    ctx.fillText(label, W / 2, y);
    return y + 26;
  }

  /** 宜/忌 区域 */
  function drawYiJi(ctx, text, type, y) {
    const isYi = type === "yi";
    const innerPad = 16;
    const maxTextW = W - PAD_X * 2 - innerPad * 2 - 30; // 减去左侧标签宽

    setFont(ctx, 28);
    const lines = wrapText(ctx, text || "", maxTextW);
    const blockH = Math.max(lines.length * 34 + innerPad * 2, 58);

    // 背景
    roundRect(ctx, PAD_X, y, W - PAD_X * 2, blockH, 6,
      isYi ? C.vermilionBg : C.grayBg,
      isYi ? C.vermilion : "#99998a", 2);

    // 左侧竖标签
    ctx.save();
    ctx.translate(PAD_X + 14, y + blockH / 2);
    ctx.rotate(-Math.PI / 2);
    setFont(ctx, 22, "700");
    ctx.fillStyle = isYi ? C.vermilion : "#77776a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(isYi ? "◆ 宜" : "✕ 忌", 0, 0);
    ctx.restore();

    // 内容文字
    setFont(ctx, 27);
    ctx.fillStyle = isYi ? "#8b2518" : "#55554a";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    lines.forEach((line, i) => {
      ctx.fillText(line, PAD_X + innerPad + 28, y + innerPad + i * 34);
    });

    return y + blockH;
  }

  /** 解读区域 */
  function drawInterpretation(ctx, text, y) {
    const innerPad = 18;
    const maxTextW = W - PAD_X * 2 - innerPad * 2;

    setFont(ctx, 26);
    const lines = wrapText(ctx, text || "", maxTextW);
    const blockH = lines.length * 36 + innerPad * 2 + 8;

    // 背景
    roundRect(ctx, PAD_X + 8, y, W - PAD_X * 2 - 16, blockH, 6,
      "rgba(176, 141, 87, 0.07)", C.goldDark, 1.5);

    // 上方引号装饰
    setFont(ctx, 28);
    ctx.fillStyle = C.gold;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("\u201C", PAD_X + 20, y + 10);

    // 内容
    setFont(ctx, 25);
    ctx.fillStyle = C.ink;
    ctx.textBaseline = "top";
    lines.forEach((line, i) => {
      ctx.fillText(line, PAD_X + innerPad + 12, y + innerPad + 6 + i * 36);
    });

    return y + blockH;
  }

  /** 右下角印章 */
  function drawSeal(ctx, x, y) {
    const size = 56;

    // 印章背景（正方形微旋）
    ctx.save();
    ctx.translate(x, y - size / 2);
    ctx.rotate(-0.05);

    // 外框
    ctx.strokeStyle = C.vermilion;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-size / 2, -size / 2, size, size);

    // 内框
    ctx.lineWidth = 1;
    const inset = 5;
    ctx.strokeRect(-size / 2 + inset, -size / 2 + inset, size - inset * 2, size - inset * 2);

    // 文字（玄命阁）
    setFont(ctx, 18, "700");
    ctx.fillStyle = C.vermilion;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 竖排从右到左
    const chars = ["玄", "命", "阁"];
    chars.forEach((ch, i) => {
      ctx.fillText(ch, 8 - i * 20, 0);
    });

    ctx.restore();
  }

  // ── 入口：查找数据并渲染 ───────────────────────────────────

  function init() {
    const section = document.querySelector("section.daily-almanac");
    if (!section) return;

    const scriptEl = section.querySelector('script[type="application/json"].almanac-data');
    if (!scriptEl) return;

    let data;
    try {
      data = JSON.parse(scriptEl.textContent);
    } catch (e) {
      console.warn("[almanac-canvas] Failed to parse JSON data:", e);
      return;
    }

    // 创建 canvas 元素
    const canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", data.title || "今日宜忌");

    try {
      draw(canvas, data);

      // 用 canvas 替换 section 内容
      // 保留 section 本身但清空内部，插入 canvas
      // 同时保留原始 HTML 作为隐藏备份（便于调试和降级）
      const wrapper = document.createElement("div");
      wrapper.className = "almanac-canvas-wrap";
      wrapper.appendChild(canvas);

      // 隐藏原始内容（不删除，保留 SEO 结构）
      section.classList.add("almanac-html-fallback");

      // 在 section 末尾插入 canvas
      section.appendChild(wrapper);
    } catch (e) {
      console.warn("[almanac-canvas] Render failed:", e);
      // 渲染失败时保持原 HTML 不变
    }
  }

  // DOM 就绪后执行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
