import { SITE_NAME, SITE_NAME_EN, type Lang } from "../config/site";
import { escapeHtml } from "../seo/meta";

export function renderFooter(lang: Lang): string {
  const name = lang === "zh" ? SITE_NAME : SITE_NAME_EN;
  const note = lang === "zh" ? "内容仅供娱乐参考" : "For entertainment purposes only";
  return `<footer class="site-footer">
      <p>© ${new Date().getFullYear()} ${escapeHtml(name)} · ${escapeHtml(note)}</p>
    </footer>`;
}
