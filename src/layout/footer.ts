import { SITE_NAME, SITE_NAME_EN, SITE_SLOGAN, SITE_SLOGAN_EN, pagePath, type Lang } from "../config/site";
import { findPage } from "../pages/registry";
import { FORTUNE_NAV_ITEMS, FORTUNE_NAV_LABEL } from "./nav";
import { escapeHtml } from "../seo/meta";

export function renderFooter(lang: Lang): string {
  const name = lang === "zh" ? SITE_NAME : SITE_NAME_EN;
  const slogan = lang === "zh" ? SITE_SLOGAN : SITE_SLOGAN_EN;
  const note =
    lang === "zh"
      ? "内容侧重传统术数解读，具体应用请结合自身情况"
      : "Content is grounded in traditional divination arts — please apply it in light of your own circumstances.";
  const desc =
    lang === "zh"
      ? "以传统术数为本，在线提供八字排盘、六爻起卦与命理详解。"
      : "Traditional Chinese divination with in-depth readings — BaZi charts and I Ching casting online.";
  const toolsLabel = lang === "zh" ? "工具" : "Tools";
  const fortuneLabel = FORTUNE_NAV_LABEL[lang];
  const aboutLabel = lang === "zh" ? "关于" : "About";

  // 链接标题一律取 registry 单一来源，避免双语两处维护
  const title = (slug: string): string => escapeHtml(findPage(slug)!.meta[lang].title);
  const toolLinks = ["bazi", "ziwei", "hehun", "liuyao", "meihua", "xiaoliuren", "huangdaxian", "guanyin", "yuelao"]
    .map((slug) => `<a href="${pagePath(lang, slug)}">${title(slug)}</a>`)
    .join("\n          ");
  const fortuneLinks = FORTUNE_NAV_ITEMS.map(
    (item) => `<a href="${pagePath(lang, item.slug)}">${escapeHtml(item.label[lang])}</a>`,
  ).join("\n          ");
  const aboutLinks = ["", "about", "methodology"]
    .map((slug) => `<a href="${pagePath(lang, slug)}">${title(slug)}</a>`)
    .join("\n          ");

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
        <nav class="footer-col" aria-label="${escapeHtml(fortuneLabel)}">
          <h2>${escapeHtml(fortuneLabel)}</h2>
          ${fortuneLinks}
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
