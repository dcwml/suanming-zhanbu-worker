import { OTHER_LANG, SITE_NAME, SITE_NAME_EN, pagePath, type Lang } from "../config/site";
import { findPage, navPages } from "../pages/registry";
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

/** 「命理」下拉菜单：标签直接取 registry 页面标题（单一来源），不重复维护文案；标题链接命理总览页（同「占卜」下拉） */
export const MINGLI_NAV_LABEL: Record<Lang, string> = { zh: "命理", en: "Destiny" };

export const MINGLI_NAV_ITEMS: readonly { slug: string; label: Record<Lang, string> }[] = [
  "bazi",
  "ziwei",
  "hehun",
].map((slug) => ({ slug, label: { zh: findPage(slug)!.meta.zh.title, en: findPage(slug)!.meta.en.title } }));

/** 「占卜」下拉菜单：标签直接取 registry 页面标题（单一来源），不重复维护文案 */
export const DIVINATION_NAV_LABEL: Record<Lang, string> = { zh: "占卜", en: "Divination" };

export const DIVINATION_NAV_ITEMS: readonly { slug: string; label: Record<Lang, string> }[] = [
  "liuyao",
  "meihua",
  "xiaoliuren",
].map((slug) => ({ slug, label: { zh: findPage(slug)!.meta.zh.title, en: findPage(slug)!.meta.en.title } }));

const FORTUNE_SLUGS = FORTUNE_NAV_ITEMS.map((item) => item.slug);
const DIVINATION_SLUGS = DIVINATION_NAV_ITEMS.map((item) => item.slug);

function renderDropdown(
  lang: Lang,
  currentSlug: string,
  label: Record<Lang, string>,
  items: readonly { slug: string; label: Record<Lang, string> }[],
  overviewSlug?: string,
): string {
  const inside = items.some((item) => item.slug === currentSlug);
  // overviewSlug 存在时标题是可点击链接（指向总览页），否则为纯展开按钮（「运势」下拉）
  const overviewActive = overviewSlug !== undefined && currentSlug === overviewSlug;
  const toggleClass = `nav-dropdown-toggle${inside || overviewActive ? " active" : ""}`;
  const toggleInner = `${escapeHtml(label[lang])}<span class="nav-caret" aria-hidden="true">▾</span>`;
  const toggle =
    overviewSlug !== undefined
      ? `<a class="${toggleClass}" href="${pagePath(lang, overviewSlug)}"${overviewActive ? ' aria-current="page"' : ""}>${toggleInner}</a>`
      : `<button type="button" class="${toggleClass}" aria-haspopup="true" aria-expanded="false">${toggleInner}</button>`;
  const links = items
    .map((item) => {
      const active = item.slug === currentSlug ? ' class="active" aria-current="page"' : "";
      return `<a href="${pagePath(lang, item.slug)}"${active}>${escapeHtml(item.label[lang])}</a>`;
    })
    .join("\n          ");
  return `<div class="nav-dropdown">
          ${toggle}
          <div class="nav-dropdown-menu">
          ${links}
          </div>
        </div>`;
}

/** langSwitchSlug 缺省时语言切换指向当前页的另一语言版本；
 *  404/500 等无真实页面的场景应显式传 "" 指向对方语言首页。 */
export function renderNav(lang: Lang, currentSlug: string, langSwitchSlug?: string): string {
  // 导航顺序（单一来源）：首页 · [命理 ▾] · [占卜 ▾] · 择吉日 · [运势 ▾]
  // 「命理」下拉占八字原平铺位置（首页之后），标题链接 mingli 总览页；八字/紫微/合婚均 inNav: false
  const chunks: string[] = [];
  for (const p of navPages()) {
    const active = p.slug === currentSlug ? ' class="active" aria-current="page"' : "";
    chunks.push(`<a href="${pagePath(lang, p.slug)}"${active}>${escapeHtml(p.meta[lang].title)}</a>`);
    if (p.slug === "") {
      chunks.push(renderDropdown(lang, currentSlug, MINGLI_NAV_LABEL, MINGLI_NAV_ITEMS, "mingli"));
      chunks.push(renderDropdown(lang, currentSlug, DIVINATION_NAV_LABEL, DIVINATION_NAV_ITEMS, "divination"));
    }
  }
  chunks.push(renderDropdown(lang, currentSlug, FORTUNE_NAV_LABEL, FORTUNE_NAV_ITEMS));
  const links = chunks.join("\n        ");

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
