export type Lang = "zh" | "en";

/** 站点源（上线前改这一处即可全站生效） */
export const SITE_ORIGIN = "https://suanming-zhanbu.com";

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
export const OG_IMAGE_PATH = "/assets/og-default.png";

/** 文章封面图 R2 源（自定义域名绑定在桶 suanming-zhanbu-workers 上，前缀 covers/） */
export const COVERS_ORIGIN = "https://r2.suanming-zhanbu.com";

/** 封面完整 URL（cover 存仓库内相对路径，如 "/covers/daily/2026-09-16.jpg"） */
export function coverUrl(path: string): string {
  return `${COVERS_ORIGIN}${path}`;
}

/** 归档页缩略图路径约定：同前缀下 <name>.thumb.webp（由 npm run cover 同步生成） */
export function coverThumbPath(path: string): string {
  return path.replace(/\.[a-z0-9]+$/i, ".thumb.webp");
}

/** 页面规范路径：首页 /zh/，内容页 /zh/bazi/ */
export function pagePath(lang: Lang, slug: string): string {
  return slug === "" ? `/${lang}/` : `/${lang}/${slug}/`;
}

export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}

/** 从 URL 路径推断语言，无 /en 前缀一律返回默认语言。
 *  注意："/en"（无尾斜杠）也视为英文，仅为兼容手输 URL；
 *  路由层会统一 301 到带尾斜杠的规范路径。 */
export function langFromPath(path: string): Lang {
  return path === "/en" || path.startsWith("/en/") ? "en" : DEFAULT_LANG;
}
