/**
 * 灵签数据校验器：校验 public/assets/qian/*.zh.js / *.en.js 六份数据文件。
 * 用法：npm run qian:validate
 *
 * 校验项：签数齐全、编号连续唯一、等级合法、签诗行数与内容、断语与类目对齐、
 * zh/en 逐签对应（编号/等级/中文签题/中文签诗）、en gradeLabels 覆盖全部等级、
 * 文案红线（不得出现 AI / 人工智能 / 算法 / 模型 字样）。
 * 横向扩品类（如关帝灵签）时新增数据文件后跑同一校验器。
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const qianDir = join(root, "public", "assets", "qian");
const LOTS = ["huangdaxian", "guanyin", "yuelao"];
const LANGS = ["zh", "en"];

/** 禁词（文案红线）：AI（独立词）、人工智能、算法、模型 */
const FORBIDDEN = [/\bAI\b/, /人工智能/, /算法/, /模型/];

function loadData(lot, lang) {
  const file = join(qianDir, `${lot}.${lang}.js`);
  const code = readFileSync(file, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: file });
  const data = sandbox.window.QIAN_DATA ?? sandbox.QIAN_DATA;
  if (!data || typeof data !== "object") throw new Error(`${file}: 未挂载 window.QIAN_DATA`);
  return data;
}

const errors = [];
const warns = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warns.push(msg);

function scanForbidden(text, where) {
  for (const re of FORBIDDEN) {
    const m = text.match(re);
    if (m) err(`${where}: 出现禁词「${m[0]}」`);
  }
}

function validateFile(lot, lang, data) {
  const tag = `${lot}.${lang}`;
  // 长度阈值按语言区分（月老祠体系签文引经据典，1-8 行均合法：单句签如「可妻也」、八行律诗等）
  const maxPoemLine = lang === "zh" ? 40 : 160;
  const maxMeaning = lang === "zh" ? 260 : 700;
  if (data.id !== lot) err(`${tag}: id 应为 ${lot}，实际 ${data.id}`);
  if (!Number.isInteger(data.total) || data.total < 1) err(`${tag}: total 非法`);
  if (!Array.isArray(data.signs)) {
    err(`${tag}: signs 不是数组`);
    return;
  }
  if (data.signs.length !== data.total) err(`${tag}: signs 数量 ${data.signs.length} ≠ total ${data.total}`);

  const nos = data.signs.map((s) => s.no);
  const uniq = new Set(nos);
  if (uniq.size !== nos.length) err(`${tag}: 编号有重复`);
  for (let i = 1; i <= data.total; i++) {
    if (!uniq.has(i)) err(`${tag}: 缺编号 ${i}`);
  }

  const gradeSet = new Set(data.grades);
  if (!Array.isArray(data.aspects) || data.aspects.length < 2) err(`${tag}: aspects 类目缺失`);

  if (lang === "en") {
    if (!data.nameZh) err(`${tag}: 缺 nameZh`);
    const labels = data.gradeLabels ?? {};
    for (const g of data.grades) {
      if (!labels[g]) err(`${tag}: gradeLabels 缺等级「${g}」`);
    }
  }

  for (const s of data.signs) {
    const w = `${tag} 第${s.no}签`;
    if (!gradeSet.has(s.grade)) err(`${w}: 等级「${s.grade}」不在 grades 集合`);
    if (!s.title || !s.title.trim()) err(`${w}: title 为空`);
    if (!s.poem || !s.poem.trim()) {
      err(`${w}: poem 为空`);
    } else {
      const lines = s.poem.split("\n").map((l) => l.trim());
      if (lines.length < 1 || lines.length > 8) err(`${w}: 签诗 ${lines.length} 行（应在 1-8 行）`);
      if (lines.some((l) => !l)) err(`${w}: 签诗存在空行`);
      if (lines.some((l) => l.length > maxPoemLine)) warn(`${w}: 签诗行超长（>${maxPoemLine} 字）`);
    }
    if (!s.meaning || s.meaning.trim().length < 30) err(`${w}: meaning 为空或过短`);
    if (s.meaning && s.meaning.length > maxMeaning) warn(`${w}: meaning 偏长（${s.meaning.length} 字）`);
    if (!Array.isArray(s.aspects)) {
      err(`${w}: aspects 不是数组`);
    } else {
      if (s.aspects.length !== data.aspects.length) err(`${w}: 断语 ${s.aspects.length} 项 ≠ 类目 ${data.aspects.length} 项`);
      for (const v of s.aspects) {
        if (!v || !v.trim()) err(`${w}: 存在空断语`);
        if (lang === "zh" && v && v.length > 8) warn(`${w}: 断语「${v}」超 8 字`);
      }
    }
    if (lang === "en") {
      if (!s.titleZh) err(`${w}: 缺 titleZh`);
      if (!s.poemZh) err(`${w}: 缺 poemZh`);
    }
    scanForbidden(
      [s.title, s.titleZh ?? "", s.poem, s.poemZh ?? "", s.meaning, (s.aspects ?? []).join("/")].join("\n"),
      w,
    );
  }
  scanForbidden([data.name, data.nameZh ?? "", Object.values(data.gradeLabels ?? {}).join("/")].join("\n"), tag);
}

function validateParity(lot, zh, en) {
  const tag = `${lot} zh/en`;
  if (zh.total !== en.total) err(`${tag}: total 不一致`);
  if (zh.grades.join("|") !== en.grades.join("|")) err(`${tag}: grades 集合不一致`);
  if (zh.aspects.length !== en.aspects.length) err(`${tag}: aspects 类目数不一致`);
  const enByNo = new Map(en.signs.map((s) => [s.no, s]));
  for (const z of zh.signs) {
    const e = enByNo.get(z.no);
    if (!e) {
      err(`${tag}: 第${z.no}签缺英文版`);
      continue;
    }
    if (z.grade !== e.grade) err(`${tag}: 第${z.no}签等级不一致（${z.grade} / ${e.grade}）`);
    if (e.titleZh !== z.title) err(`${tag}: 第${z.no}签 titleZh 与 zh title 不一致`);
    if (e.poemZh !== z.poem) err(`${tag}: 第${z.no}签 poemZh 与 zh poem 不一致`);
  }
}

/* ---------- 汇总输出 ---------- */
const summary = [];
for (const lot of LOTS) {
  const zh = loadData(lot, "zh");
  const en = loadData(lot, "en");
  validateFile(lot, "zh", zh);
  validateFile(lot, "en", en);
  validateParity(lot, zh, en);
  const dist = new Map();
  for (const s of zh.signs) dist.set(s.grade, (dist.get(s.grade) ?? 0) + 1);
  summary.push(
    `${lot}: ${zh.signs.length} 签 · ${zh.name} / ${en.name} · 等级分布 ${zh.grades
      .map((g) => `${g}×${dist.get(g) ?? 0}`)
      .join(" ")}`,
  );
}

console.log(summary.join("\n"));
if (warns.length) {
  console.log(`\n警告 ${warns.length} 条：`);
  for (const w of warns) console.log(`  - ${w}`);
}
if (errors.length) {
  console.error(`\n校验失败 ${errors.length} 处：`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("\n灵签数据校验通过。");
