import { HTML_LANG, SITE_NAME, SITE_NAME_EN, type Lang } from "../config/site";
import type { PageEntry } from "../pages/registry";
import { NOT_FOUND_CONTENT } from "../pages/registry";
import { buildHead, buildPlainHead } from "../seo/meta";
import { renderFooter } from "./footer";
import { renderNav } from "./nav";

/** 哨兵 slug：仅用于让导航不高亮任何真实页面；双下划线命名与真实 slug 命名空间不相交 */
const SENTINEL_NOTFOUND = "__notfound__";
const SENTINEL_ERROR = "__error__";

function layout(lang: Lang, head: string, nav: string, main: string): string {
  return `<!DOCTYPE html>
<html lang="${HTML_LANG[lang]}">
  <head>
    ${head}
    <link rel="stylesheet" href="/assets/style.css">
  </head>
  <body>
    <header class="site-header">
      ${nav}
    </header>
    <main>
${main}
    </main>
    ${renderFooter(lang)}
  </body>
</html>
`;
}

export function renderPage(page: PageEntry, lang: Lang): string {
  return layout(lang, buildHead(page, lang), renderNav(lang, page.slug), page.content[lang]);
}

export function renderNotFound(lang: Lang): string {
  const title = lang === "zh" ? `页面未找到 - ${SITE_NAME}` : `Page Not Found - ${SITE_NAME_EN}`;
  return layout(lang, buildPlainHead(lang, title), renderNav(lang, SENTINEL_NOTFOUND, ""), NOT_FOUND_CONTENT[lang]);
}

export function renderError(lang: Lang): string {
  const title = lang === "zh" ? `服务器错误 - ${SITE_NAME}` : `Server Error - ${SITE_NAME_EN}`;
  const body =
    lang === "zh"
      ? "      <h1>服务器错误</h1>\n      <p>请稍后再试。</p>"
      : "      <h1>Server Error</h1>\n      <p>Please try again later.</p>";
  return layout(lang, buildPlainHead(lang, title), renderNav(lang, SENTINEL_ERROR, ""), body);
}
