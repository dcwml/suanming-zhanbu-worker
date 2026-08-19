import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    // 按包名解析 pool 时，内置 resolver 可能越过本目录的 node_modules
    // 向上找到父级 checkout 的副本（git worktree 嵌套在主仓库内时），
    // 导致 Text 规则模块（content/*.html）加载失败；固定指向本地副本。
    // vitest 的 pool 支持任意模块路径，但官方类型只声明包名字面量，故断言。
    pool: "./node_modules/@cloudflare/vitest-pool-workers/dist/pool/index.mjs" as "@cloudflare/vitest-pool-workers",
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
      },
    },
  },
});
