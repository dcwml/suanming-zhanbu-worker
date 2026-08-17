import { OTHER_LANG, SITE_NAME, SITE_NAME_EN, pagePath, type Lang } from "../config/site";
import { navPages } from "../pages/registry";
import { DAILY_ARCHIVE_META } from "../pages/daily";
import { WEEKLY_ARCHIVE_META } from "../pages/weekly";
import { MONTHLY_ARCHIVE_META } from "../pages/monthly";
import { escapeHtml } from "../seo/meta";

/** 「运势」下拉菜单：导航用标签与各归档页标题解耦（daily 页标题仍为「今日宜忌」） */
export const FORTUNE_NAV_LABEL: Record<Lang, string> = { zh: "运势", en: "Horoscopes" };

export const FORTUNE_NAV_ITEMS: readonly { slug: string; label: Record<Lang, string> }[] = [
  { slug: DAILY_ARCHIVE_META.slug, label: { zh: "每日运势", en: "Daily Almanac" } },
  { slug: WEEKLY_ARCHIVE_META.slug, label: { zh: "每周运势", en: "Weekly Horoscope" } },
  { slug: MONTHLY_ARCHIVE_META.slug, label: { zh: "每月运势", en: "Monthly Horoscope" } },
];

const FORTUNE_SLUGS = FORTUNE_NAV_ITEMS.map((item) => item.slug);

/** langSwitchSlug 缺省时语言切换指向当前页的另一语言版本；
 *  404/500 等无真实页面的场景应显式传 "" 指向对方语言首页。 */
export function renderNav(lang: Lang, currentSlug: string, langSwitchSlug?: string): string {
  const flatLinks = navPages()
    .map((p) => {
      const active = p.slug === currentSlug ? ' class="active" aria-current="page"' : "";
      return `<a href="${pagePath(lang, p.slug)}"${active}>${escapeHtml(p.meta[lang].title)}</a>`;
    })
    .join("\n        ");

  const inFortune = FORTUNE_SLUGS.includes(currentSlug);
  const fortuneItems = FORTUNE_NAV_ITEMS.map((item) => {
    const active = item.slug === currentSlug ? ' class="active" aria-current="page"' : "";
    return `<a href="${pagePath(lang, item.slug)}"${active}>${escapeHtml(item.label[lang])}</a>`;
  }).join("\n          ");
  const dropdown = `<div class="nav-dropdown">
          <button type="button" class="nav-dropdown-toggle${inFortune ? " active" : ""}" aria-haspopup="true" aria-expanded="false">${escapeHtml(FORTUNE_NAV_LABEL[lang])}<span class="nav-caret" aria-hidden="true">▾</span></button>
          <div class="nav-dropdown-menu">
          ${fortuneItems}
          </div>
        </div>`;

  const other = OTHER_LANG[lang];
  const switchLabel = other === "en" ? "English" : "中文";
  const siteName = lang === "zh" ? SITE_NAME : SITE_NAME_EN;

  return `<nav class="site-nav" aria-label="${lang === "zh" ? "主导航" : "Main navigation"}">
      <a class="site-brand" href="${pagePath(lang, "")}">
        <img class="brand-logo" src="/assets/logo.png" alt="${escapeHtml(siteName)}" width="36" height="36">
        <span class="brand-name">${escapeHtml(siteName)}</span>
      </a>
      <div class="nav-links">
        ${flatLinks}
        ${dropdown}
      </div>
      <a class="lang-switch" href="${pagePath(other, langSwitchSlug ?? currentSlug)}">${switchLabel}</a>
    </nav>`;
}
