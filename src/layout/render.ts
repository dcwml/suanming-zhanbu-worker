import { HTML_LANG, SITE_NAME, SITE_NAME_EN, pagePath, type Lang } from "../config/site";
import type { PageEntry } from "../pages/registry";
import { NOT_FOUND_CONTENT } from "../pages/registry";
import type { DailyArchiveItem, DailyPost } from "../pages/daily";
import { DAILY_ARCHIVE_META } from "../pages/daily";
import { buildDailyArchiveHead, buildDailyPostHead, buildHead, buildPlainHead } from "../seo/meta";
import { renderFooter } from "./footer";
import { renderNav } from "./nav";
import bodyStartSnippet from "./snippets/body-start.html";
import headSnippet from "./snippets/head.html";

/** 全站静态片段（验证 meta/GTM 等第三方代码），仅信任仓库内受控内容，不经转义直接注入 */
const HEAD_SNIPPET = headSnippet.trim();
const BODY_START_SNIPPET = bodyStartSnippet.trim();

/** 哨兵 slug：仅用于让导航不高亮任何真实页面；双下划线命名与真实 slug 命名空间不相交 */
const SENTINEL_NOTFOUND = "__notfound__";
const SENTINEL_ERROR = "__error__";

function layout(lang: Lang, head: string, nav: string, main: string): string {
  return `<!DOCTYPE html>
<html lang="${HTML_LANG[lang]}">
  <head>
    ${head}
    ${HEAD_SNIPPET}
    <link rel="stylesheet" href="/assets/style.css">
  </head>
  <body>
    ${BODY_START_SNIPPET}
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

/** daily 单篇：导航高亮归档页（slug="daily"），语言切换指向同日期另一语言版 */
export function renderDailyPost(post: DailyPost, lang: Lang): string {
  return layout(
    lang,
    buildDailyPostHead(post, lang),
    renderNav(lang, "daily", `daily/${post.date}`),
    post.content[lang],
  );
}

/** daily 归档页：按日期倒序列出文章链接 */
export function renderDailyArchive(items: DailyArchiveItem[], lang: Lang): string {
  const title = DAILY_ARCHIVE_META.title[lang];
  const links = items
    .map(
      (item) =>
        `      <article class="daily-archive-item">\n        <h2><a href="${pagePath(lang, `daily/${item.date}`)}">${item.title[lang]}</a></h2>\n      </article>`,
    )
    .join("\n");
  const main = `      <h1>${title}</h1>\n${links}`;
  return layout(lang, buildDailyArchiveHead(lang), renderNav(lang, "daily", "daily"), main);
}
