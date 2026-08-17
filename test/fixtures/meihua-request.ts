import type { InterpretRequest } from "../../src/meihua/types";

/**
 * 合法的时间起卦请求体夹具。
 * 卦例自洽：火天大有（上离下乾）二爻动 → 动爻在下卦，用卦乾金、体卦离火；
 * 互卦泽天夬，变卦离为火。后端不重算卦象，只校验形状与组提示词。
 * 每次调用返回全新对象，测试可安全修改。
 */
export function validRequest(): InterpretRequest {
  return {
    lang: "zh",
    question: "近期洽谈的合作能否谈成",
    method: "time",
    solar: "2026-08-18 14:30",
    lunar: "丙午年七月初五未时",
    primary: { name: "火天大有", statement: "大有：元，亨。", upper: "离", lower: "乾" },
    mutual: { name: "泽天夬", statement: "夬：扬于王庭，孚号有厉。告自邑，不利即戎，利有攸往。", upper: "兑", lower: "乾" },
    changed: { name: "离为火", statement: "离：利贞，亨。畜牝牛，吉。", upper: "离", lower: "离" },
    movingLine: 2,
    body: { trigram: "离", element: "火" },
    application: { trigram: "乾", element: "金" },
  };
}

/** 数字起卦请求体夹具：报数 5、10 → 上巽下兑风泽中孚，三爻动，互山雷颐、变天泽履。 */
export function numberRequest(): InterpretRequest {
  return {
    lang: "zh",
    question: "这次出行是否顺利",
    method: "number",
    numbers: [5, 10],
    primary: { name: "风泽中孚", statement: "中孚：豚鱼吉，利涉大川，利贞。", upper: "巽", lower: "兑" },
    mutual: { name: "山雷颐", statement: "颐：贞吉。观颐，自求口实。", upper: "艮", lower: "震" },
    changed: { name: "天泽履", statement: "履虎尾，不咥人，亨。", upper: "乾", lower: "兑" },
    movingLine: 3,
    body: { trigram: "巽", element: "木" },
    application: { trigram: "兑", element: "金" },
  };
}
