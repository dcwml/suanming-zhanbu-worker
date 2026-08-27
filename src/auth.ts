/** 自用数据/生成端点的共享鉴权（生产 wrangler secret put SITE_API_KEY / 本地 .dev.vars） */
export interface SiteAuthEnv {
  SITE_API_KEY?: string;
}

/** 鉴权：未配置 secret → 503（防忘配裸奔）；key 缺失/不匹配 → 401 */
export function authProblem(
  env: SiteAuthEnv | undefined,
  apiKeyHeader: string | undefined,
): { code: string; message: string; status: 503 | 401 } | null {
  const expected = env?.SITE_API_KEY;
  if (!expected) return { code: "not_configured", message: "Site API is not configured.", status: 503 };
  if (apiKeyHeader !== expected) return { code: "unauthorized", message: "Invalid or missing x-api-key header.", status: 401 };
  return null;
}
