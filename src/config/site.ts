export type Lang = "zh" | "en";

/** 站点源（上线前改这一处即可全站生效） */
export const SITE_ORIGIN = "https://example.com";

export const SITE_NAME = "玄命阁";
export const SITE_NAME_EN = "Xuanming Pavilion";
export const SITE_SLOGAN = "命理 · 占卜 · 传统文化";
export const SITE_SLOGAN_EN = "Fortune · Divination · Tradition";

export const DEFAULT_LANG: Lang = "zh";
export const LANGS: readonly Lang[] = ["zh", "en"];
export const OTHER_LANG: Record<Lang, Lang> = { zh: "en", en: "zh" };
export const HREFLANG_CODE: Record<Lang, string> = { zh: "zh-CN", en: "en" };
export const OG_LOCALE: Record<Lang, string> = { zh: "zh_CN", en: "en_US" };
export const HTML_LANG: Record<Lang, string> = { zh: "zh-CN", en: "en" };

/** 页面规范路径：首页 /zh/，内容页 /zh/sample/ */
export function pagePath(lang: Lang, slug: string): string {
  return slug === "" ? `/${lang}/` : `/${lang}/${slug}/`;
}

export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}

/** 从 URL 路径推断语言，无 /en 前缀一律返回默认语言 */
export function langFromPath(path: string): Lang {
  return path === "/en" || path.startsWith("/en/") ? "en" : DEFAULT_LANG;
}
