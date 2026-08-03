import { SITE_NAME, SITE_NAME_EN, SITE_SLOGAN, SITE_SLOGAN_EN, pagePath, type Lang } from "../config/site";
import { findPage } from "../pages/registry";
import { DAILY_ARCHIVE_META } from "../pages/daily";
import { escapeHtml } from "../seo/meta";

export function renderFooter(lang: Lang): string {
  const name = lang === "zh" ? SITE_NAME : SITE_NAME_EN;
  const slogan = lang === "zh" ? SITE_SLOGAN : SITE_SLOGAN_EN;
  const note = lang === "zh" ? "内容仅供娱乐参考" : "For entertainment purposes only";
  const desc =
    lang === "zh"
      ? "以传统术数与 AI 解读，在线提供八字排盘与六爻起卦。"
      : "Traditional Chinese divination with AI readings — BaZi charts and I Ching casting online.";
  const toolsLabel = lang === "zh" ? "工具" : "Tools";
  const aboutLabel = lang === "zh" ? "关于" : "About";

  // 链接标题一律取 registry 单一来源，避免双语两处维护
  const title = (slug: string): string => escapeHtml(findPage(slug)!.meta[lang].title);
  const toolLinks = ["bazi", "liuyao"]
    .map((slug) => `<a href="${pagePath(lang, slug)}">${title(slug)}</a>`)
    .join("\n          ");
  const homeLink = `<a href="${pagePath(lang, "")}">${title("")}</a>`;
  const dailyLink = `<a href="${pagePath(lang, DAILY_ARCHIVE_META.slug)}">${escapeHtml(DAILY_ARCHIVE_META.title[lang])}</a>`;
  const aboutLinks = [homeLink, dailyLink].join("\n          ");

  return `<footer class="site-footer">
      <div class="footer-main">
        <div class="footer-brand">
          <img class="brand-logo" src="/assets/logo.png" alt="${escapeHtml(name)}" width="40" height="40">
          <p class="footer-name">${escapeHtml(name)}</p>
          <p class="footer-slogan">${escapeHtml(slogan)}</p>
          <p class="footer-desc">${escapeHtml(desc)}</p>
        </div>
        <nav class="footer-col" aria-label="${toolsLabel}">
          <h2>${toolsLabel}</h2>
          ${toolLinks}
        </nav>
        <nav class="footer-col" aria-label="${aboutLabel}">
          <h2>${aboutLabel}</h2>
          ${aboutLinks}
        </nav>
      </div>
      <div class="footer-bottom">
        <p>© ${new Date().getFullYear()} ${escapeHtml(name)} · ${escapeHtml(note)}</p>
      </div>
    </footer>`;
}
