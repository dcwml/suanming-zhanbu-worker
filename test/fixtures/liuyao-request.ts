import type { InterpretRequest } from "../../src/liuyao/types";

/**
 * 合法的六爻解读请求体夹具。
 * lines [7,9,8,6,7,8] → 本卦「雷水解」(40)，动爻在第 2、4 爻 → 变卦「雷风恒」(32)。
 * 每次调用返回全新对象，测试可安全修改。
 */
export function validRequest(): InterpretRequest {
  return {
    lang: "zh",
    question: "近期事业是否有转机",
    lines: [7, 9, 8, 6, 7, 8],
    now: { solar: "2026-08-01" },
    primary: {
      name: "雷水解",
      statement: "解：利西南；无所往，其来复吉；有攸往，夙吉。",
    },
    changed: {
      name: "雷风恒",
      statement: "恒：亨，无咎，利贞，利有攸往。",
    },
    moving: [
      { position: 2, text: "九二：田获三狐，得黄矢，贞吉。" },
      { position: 4, text: "九四：解而拇，朋至斯孚。" },
    ],
  };
}

/** 0 动爻请求体（lines 全静爻） */
export function staticRequest(): InterpretRequest {
  return {
    lang: "zh",
    question: "考试能否顺利通过",
    lines: [7, 7, 8, 8, 7, 8],
    now: { solar: "2026-08-01" },
    primary: {
      name: "雷水解",
      statement: "解：利西南；无所往，其来复吉；有攸往，夙吉。",
    },
  };
}
