import type { ZejiInterpretRequest } from "../../src/zeji/types";

/**
 * 合法的择吉解读请求体夹具。
 * 生肖模式：persons 只传 yearBranch。每次调用返回全新对象，测试可安全修改。
 */
export function validZejiRequest(): ZejiInterpretRequest {
  return {
    lang: "zh",
    matter: "嫁娶",
    candidate: {
      solar: "2026-08-15", lunar: "七月初二", dayGanZhi: "甲子",
      zhiXing: "成", tianShenLuck: "吉", xiu: "参",
      jiShen: ["天德合", "天马"], xiongSha: ["四耗", "白虎"],
      chongShengXiao: "马", shaDirection: "南",
    },
    persons: [{ yearBranch: "午" }],
  };
}
