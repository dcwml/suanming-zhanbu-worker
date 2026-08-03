import { Hono } from "hono";
import { LANGS, pagePath, type Lang } from "../config/site";
import { renderDailyArchive, renderDailyPost, renderPage } from "../layout/render";
import { dailyArchive, findDailyPost } from "../pages/daily";
import { findPage } from "../pages/registry";
import { buildRobotsTxt, buildSitemapXml } from "../seo/sitemap";

export const pages = new Hono();

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

// /zh/bazi → 301 补尾斜杠
pages.get("/:lang/:slug", (c) => {
  const lang = c.req.param("lang");
  const slug = c.req.param("slug");
  if (!isLang(lang)) return c.notFound();
  return c.redirect(pagePath(lang, slug), 301);
});

// 首页
pages.get("/:lang/", (c) => {
  const lang = c.req.param("lang");
  if (!isLang(lang)) return c.notFound();
  return c.html(renderPage(findPage("")!, lang));
});

// 内容页
pages.get("/:lang/:slug/", (c) => {
  const lang = c.req.param("lang");
  const slug = c.req.param("slug");
  if (!isLang(lang)) return c.notFound();
  const page = findPage(slug);
  if (!page) return c.notFound();
  return c.html(renderPage(page, lang));
});
