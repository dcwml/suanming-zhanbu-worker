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
import type { StatsData } from "../stats";

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

/** 首页专用：渲染页面并注入统计数据 */
export function renderPageWithStats(page: PageEntry, lang: Lang, stats: StatsData | null): string {
  const main = page.content[lang];
  const statsHtml = stats ? buildStatsHtml(stats, lang) : "";
  return layout(lang, buildHead(page, lang), renderNav(lang, page.slug), main + statsHtml);
}

/** 构建统计数据的 HTML 片段（注入到首页底部） */
function buildStatsHtml(stats: StatsData, lang: Lang): string {
  const isZh = lang === "zh";

  // 格式化数字（加千分位）
  const fmt = (n: number) => n.toLocaleString("en-US");

  const labels = isZh
    ? { title: "访问统计", total: "总计", today: "今日", apiCalls: "API 调用", pv: "访问量", bazi: "八字使用", liuyao: "六爻使用" }
    : { title: "Statistics", total: "Total", today: "Today", apiCalls: "API Calls", pv: "Visits", bazi: "BaZi Usage", liuyao: "I Ching Usage" };

  const apiRows = stats.api_calls
    .map(
      (api) => `        <tr>
          <td>${api.api_path}</td>
          <td>${fmt(api.total_calls)}</td>
          <td>${fmt(api.today_calls)}</td>
        </tr>`,
    )
    .join("\n");

  return `
<section class="site-stats" aria-label="${labels.title}">
  <h2>${labels.title}</h2>
  <table class="stats-table">
    <thead>
      <tr>
        <th></th>
        <th>${labels.total}</th>
        <th>${labels.today}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${labels.pv}</td>
        <td>${fmt(stats.total.homepage_pv)}</td>
        <td>${fmt(stats.today.homepage_pv)}</td>
      </tr>
      <tr>
        <td>${labels.bazi}</td>
        <td>${fmt(stats.total.bazi_usage)}</td>
        <td>${fmt(stats.today.bazi_usage)}</td>
      </tr>
      <tr>
        <td>${labels.liuyao}</td>
        <td>${fmt(stats.total.liuyao_usage)}</td>
        <td>${fmt(stats.today.liuyao_usage)}</td>
      </tr>
    </tbody>
  </table>
${apiRows ? `  <h3>${labels.apiCalls}</h3>\n  <table class="stats-table">\n    <thead>\n      <tr>\n        <th>API</th>\n        <th>${labels.total}</th>\n        <th>${labels.today}</th>\n      </tr>\n    </thead>\n    <tbody>\n${apiRows}\n    </tbody>\n  </table>` : ""}
</section>`;
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
