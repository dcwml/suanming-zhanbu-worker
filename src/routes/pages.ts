import { Hono } from "hono";
import { LANGS, pagePath, type Lang } from "../config/site";
import { renderPage } from "../layout/render";
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

// /zh/sample → 301 补尾斜杠
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
