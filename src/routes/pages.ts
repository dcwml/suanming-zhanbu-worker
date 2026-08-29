import { Hono } from "hono";
import { LANGS, pagePath, type Lang } from "../config/site";
import {
  renderDailyArchive,
  renderDailyPost,
  renderMonthlyArchive,
  renderMonthlyPost,
  renderPage,
  renderPageWithStats,
  renderTuiyanArchive,
  renderTuiyanPost,
  renderWeeklyArchive,
  renderWeeklyPost,
} from "../layout/render";
import { dailyArchive, findDailyPost } from "../pages/daily";
import { findWeeklyPost, weeklyArchive } from "../pages/weekly";
import { findMonthlyPost, monthlyArchive } from "../pages/monthly";
import { findTuiyanPost, tuiyanArchive } from "../pages/tuiyan";
import { findPage } from "../pages/registry";
import { buildRobotsTxt, buildSitemapXml } from "../seo/sitemap";
import { getRealIp, recordPageView, getStats } from "../stats";
import type { StatsEnv } from "../stats";

export const pages = new Hono<{ Bindings: StatsEnv }>();

function isLang(v: string): v is Lang {
  return (LANGS as readonly string[]).includes(v);
}

// 根路径 → 默认语言首页
pages.get("/", (c) => c.redirect(pagePath("zh", ""), 301));

pages.get("/sitemap.xml", (c) =>
  c.body(buildSitemapXml(), 200, { "Content-Type": "application/xml; charset=utf-8" }),
);

pages.get("/robots.txt", (c) =>
  c.body(buildRobotsTxt(), 200, { "Content-Type": "text/plain; charset=utf-8" }),
);

// /zh 或 /en → 301 补尾斜杠
pages.get("/:lang", (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, ""), 301);
});

// /zh/daily → 301 补尾斜杠（无尾斜杠归档页）
pages.get("/:lang/daily", (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, "daily"), 301);
});

// /zh/daily/ → 归档页
pages.get("/:lang/daily/", (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();
  return c.html(renderDailyArchive(dailyArchive(), lang));
});

// /zh/daily/2026-08-03 → 301 补尾斜杠
pages.get("/:lang/daily/:date", (c) => {
  const lang = c.req.param("lang");
  const date = c.req.param("date");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, `daily/${date}`), 301);
});

// /zh/daily/2026-08-03/ → 单篇
pages.get("/:lang/daily/:date/", (c) => {
  const lang = c.req.param("lang");
  const date = c.req.param("date");
  if (!isLang(lang)) return c.notFound();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return c.notFound();
  const post = findDailyPost(date);
  if (!post) return c.notFound();
  return c.html(renderDailyPost(post, lang));
});

// /zh/weekly → 301 补尾斜杠（无尾斜杠归档页）
pages.get("/:lang/weekly", (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, "weekly"), 301);
});

// /zh/weekly/ → 归档页
pages.get("/:lang/weekly/", (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();
  return c.html(renderWeeklyArchive(weeklyArchive(), lang));
});

// /zh/weekly/2026-08-17 → 301 补尾斜杠
pages.get("/:lang/weekly/:monday", (c) => {
  const lang = c.req.param("lang");
  const monday = c.req.param("monday");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, `weekly/${monday}`), 301);
});

// /zh/weekly/2026-08-17/ → 单篇（monday 必须是合法 YYYY-MM-DD）
pages.get("/:lang/weekly/:monday/", (c) => {
  const lang = c.req.param("lang");
  const monday = c.req.param("monday");
  if (!isLang(lang)) return c.notFound();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(monday)) return c.notFound();
  const post = findWeeklyPost(monday);
  if (!post) return c.notFound();
  return c.html(renderWeeklyPost(post, lang));
});

// /zh/monthly → 301 补尾斜杠（无尾斜杠归档页）
pages.get("/:lang/monthly", (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, "monthly"), 301);
});

// /zh/monthly/ → 归档页
pages.get("/:lang/monthly/", (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();
  return c.html(renderMonthlyArchive(monthlyArchive(), lang));
});

// /zh/monthly/2026-08 → 301 补尾斜杠
pages.get("/:lang/monthly/:month", (c) => {
  const lang = c.req.param("lang");
  const month = c.req.param("month");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, `monthly/${month}`), 301);
});

// /zh/monthly/2026-08/ → 单篇（month 必须是合法 YYYY-MM）
pages.get("/:lang/monthly/:month/", (c) => {
  const lang = c.req.param("lang");
  const month = c.req.param("month");
  if (!isLang(lang)) return c.notFound();
  if (!/^\d{4}-\d{2}$/.test(month)) return c.notFound();
  const post = findMonthlyPost(month);
  if (!post) return c.notFound();
  return c.html(renderMonthlyPost(post, lang));
});

// /zh/tuiyan → 301 补尾斜杠
pages.get("/:lang/tuiyan", (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, "tuiyan"), 301);
});

// /zh/tuiyan/ → 归档页
pages.get("/:lang/tuiyan/", (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();
  return c.html(renderTuiyanArchive(tuiyanArchive(), lang));
});

// /zh/tuiyan/2026-08-13 → 301 补尾斜杠
pages.get("/:lang/tuiyan/:firstDay", (c) => {
  const lang = c.req.param("lang");
  const firstDay = c.req.param("firstDay");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, `tuiyan/${firstDay}`), 301);
});

// /zh/tuiyan/2026-08-13/ → 单篇（firstDay 必须是合法 YYYY-MM-DD）
pages.get("/:lang/tuiyan/:firstDay/", (c) => {
  const lang = c.req.param("lang");
  const firstDay = c.req.param("firstDay");
  if (!isLang(lang)) return c.notFound();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDay)) return c.notFound();
  const post = findTuiyanPost(firstDay);
  if (!post) return c.notFound();
  return c.html(renderTuiyanPost(post, lang));
});

// /zh/bazi → 301 补尾斜杠
pages.get("/:lang/:slug", (c) => {
  const lang = c.req.param("lang");
  const slug = c.req.param("slug");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, slug), 301);
});

// 首页（记录 PV + 注入统计数据）
pages.get("/:lang/", async (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();

  // 记录首页访问（异步，不阻塞响应）
  const db = c.env?.STATS_DB;
  if (db) {
    recordPageView(db, c.req.raw, "homepage").catch(() => {});
  }

  // 查询统计数据
  const stats = db ? await getStats(db) : null;

  return c.html(renderPageWithStats(findPage("")!, lang, stats));
});

// 内容页（记录工具页面访问）
pages.get("/:lang/:slug/", async (c) => {
  const lang = c.req.param("lang");
  const slug = c.req.param("slug");
  if (!isLang(lang)) return c.notFound();
  const page = findPage(slug);
  if (!page) return c.notFound();

  // 记录工具页面访问
  const db = c.env?.STATS_DB;
  if (db && (slug === "bazi" || slug === "liuyao")) {
    recordPageView(db, c.req.raw, slug as "bazi" | "liuyao").catch(() => {});
  }

  return c.html(renderPage(page, lang));
});
