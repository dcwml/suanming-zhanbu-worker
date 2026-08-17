import { HTML_LANG, SITE_NAME, SITE_NAME_EN, pagePath, type Lang } from "../config/site";
import type { PageEntry } from "../pages/registry";
import { NOT_FOUND_CONTENT } from "../pages/registry";
import type { DailyArchiveItem, DailyPost } from "../pages/daily";
import { DAILY_ARCHIVE_META } from "../pages/daily";
import type { WeeklyArchiveItem, WeeklyPost } from "../pages/weekly";
import { WEEKLY_ARCHIVE_META } from "../pages/weekly";
import type { MonthlyArchiveItem, MonthlyPost } from "../pages/monthly";
import { MONTHLY_ARCHIVE_META } from "../pages/monthly";
import {
  buildDailyArchiveHead,
  buildDailyPostHead,
  buildHead,
  buildMonthlyArchiveHead,
  buildMonthlyPostHead,
  buildPlainHead,
  buildWeeklyArchiveHead,
  buildWeeklyPostHead,
} from "../seo/meta";
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

/** 构建统计数据的 HTML 片段（注入到首页底部，一行小字） */
function buildStatsHtml(stats: StatsData, lang: Lang): string {
  const isZh = lang === "zh";
  const fmt = (n: number) => n.toLocaleString("en-US");

  const labels = isZh
    ? { pv: "访问", bazi: "八字", liuyao: "六爻", today: "今日", api: "API" }
    : { pv: "visits", bazi: "BaZi", liuyao: "I Ching", today: "today", api: "API" };

  const parts = [
    `${labels.pv} ${fmt(stats.total.homepage_pv)}`,
    `${labels.bazi} ${fmt(stats.total.bazi_usage)}`,
    `${labels.liuyao} ${fmt(stats.total.liuyao_usage)}`,
    `${labels.today} ${fmt(stats.today.homepage_pv)}`,
  ];

  // API 调用数据追加到后面
  stats.api_calls.forEach((api) => {
    parts.push(`${api.api_path} ${fmt(api.total_calls)}(${fmt(api.today_calls)})`);
  });

  return `\n<p class="site-stats" role="status" aria-label="${isZh ? '访问统计' : 'Statistics'}">${parts.join(" · ")}</p>`;
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

/** weekly 单篇：导航高亮归档页（slug="weekly"），语言切换指向同周一另一语言版 */
export function renderWeeklyPost(post: WeeklyPost, lang: Lang): string {
  return layout(
    lang,
    buildWeeklyPostHead(post, lang),
    renderNav(lang, "weekly", `weekly/${post.monday}`),
    post.content[lang],
  );
}

/** weekly 归档页：按周一倒序列出文章链接 */
export function renderWeeklyArchive(items: WeeklyArchiveItem[], lang: Lang): string {
  const title = WEEKLY_ARCHIVE_META.title[lang];
  const links = items
    .map(
      (item) =>
        `      <article class="weekly-archive-item">\n        <h2><a href="${pagePath(lang, `weekly/${item.monday}`)}">${item.title[lang]}</a></h2>\n      </article>`,
    )
    .join("\n");
  const main = `      <h1>${title}</h1>\n${links}`;
  return layout(lang, buildWeeklyArchiveHead(lang), renderNav(lang, "weekly", "weekly"), main);
}

/** monthly 单篇：导航高亮归档页（slug="monthly"），语言切换指向同月份另一语言版 */
export function renderMonthlyPost(post: MonthlyPost, lang: Lang): string {
  return layout(
    lang,
    buildMonthlyPostHead(post, lang),
    renderNav(lang, "monthly", `monthly/${post.month}`),
    post.content[lang],
  );
}

/** monthly 归档页：按月份倒序列出文章链接 */
export function renderMonthlyArchive(items: MonthlyArchiveItem[], lang: Lang): string {
  const title = MONTHLY_ARCHIVE_META.title[lang];
  const links = items
    .map(
      (item) =>
        `      <article class="monthly-archive-item">\n        <h2><a href="${pagePath(lang, `monthly/${item.month}`)}">${item.title[lang]}</a></h2>\n      </article>`,
    )
    .join("\n");
  const main = `      <h1>${title}</h1>\n${links}`;
  return layout(lang, buildMonthlyArchiveHead(lang), renderNav(lang, "monthly", "monthly"), main);
}
