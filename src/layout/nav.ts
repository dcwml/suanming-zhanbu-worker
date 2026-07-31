import { OTHER_LANG, pagePath, type Lang } from "../config/site";
import { navPages } from "../pages/registry";
import { escapeHtml } from "../seo/meta";

/** 顶部导航：链接由注册表生成，含语言切换 */
export function renderNav(lang: Lang, currentSlug: string): string {
  const links = navPages()
    .map((p) => {
      const active = p.slug === currentSlug ? ' class="active" aria-current="page"' : "";
      return `<a href="${pagePath(lang, p.slug)}"${active}>${escapeHtml(p.meta[lang].title)}</a>`;
    })
    .join("\n        ");

  const other = OTHER_LANG[lang];
  const switchLabel = other === "en" ? "English" : "中文";

  return `<nav class="site-nav" aria-label="${lang === "zh" ? "主导航" : "Main navigation"}">
      <div class="nav-links">
        ${links}
      </div>
      <a class="lang-switch" href="${pagePath(other, currentSlug)}">${switchLabel}</a>
    </nav>`;
}
