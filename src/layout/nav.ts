import { OTHER_LANG, SITE_NAME, SITE_NAME_EN, pagePath, type Lang } from "../config/site";
import { navPages } from "../pages/registry";
import { DAILY_ARCHIVE_META } from "../pages/daily";
import { escapeHtml } from "../seo/meta";

/** langSwitchSlug 缺省时语言切换指向当前页的另一语言版本；
 *  404/500 等无真实页面的场景应显式传 "" 指向对方语言首页。 */
export function renderNav(lang: Lang, currentSlug: string, langSwitchSlug?: string): string {
  const navItems = navPages().map((p) => ({
    slug: p.slug,
    title: p.meta[lang].title,
  }));
  navItems.push({ slug: DAILY_ARCHIVE_META.slug, title: DAILY_ARCHIVE_META.title[lang] });
  const links = navItems
    .map((item) => {
      const active = item.slug === currentSlug ? ' class="active" aria-current="page"' : "";
      return `<a href="${pagePath(lang, item.slug)}"${active}>${escapeHtml(item.title)}</a>`;
    })
    .join("\n        ");

  const other = OTHER_LANG[lang];
  const switchLabel = other === "en" ? "English" : "中文";
  const siteName = lang === "zh" ? SITE_NAME : SITE_NAME_EN;

  return `<nav class="site-nav" aria-label="${lang === "zh" ? "主导航" : "Main navigation"}">
      <a class="site-brand" href="${pagePath(lang, "")}">
        <img class="brand-logo" src="/assets/logo.png" alt="${escapeHtml(siteName)}" width="36" height="36">
        <span class="brand-name">${escapeHtml(siteName)}</span>
      </a>
      <div class="nav-links">
        ${links}
      </div>
      <a class="lang-switch" href="${pagePath(other, langSwitchSlug ?? currentSlug)}">${switchLabel}</a>
    </nav>`;
}
