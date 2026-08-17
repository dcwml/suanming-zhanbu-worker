import type { InterpretRequest } from "../../src/xiaoliuren/types";

/**
 * 合法的时间起课请求体夹具。
 * 课例自洽：丙午年七月初三午时 —— 月上起月（七月自大安数七位落大安）、
 * 日上起日（自大安数三位落速喜）、时上起时（午时自速喜数七位仍落速喜）。
 * 后端不重算课式，只校验形状与组提示词。
 * 每次调用返回全新对象，测试可安全修改。
 */
export function validRequest(): InterpretRequest {
  return {
    lang: "zh",
    question: "这次出差谈的客户能不能签下来",
    method: "time",
    solar: "2026-08-16 12:30",
    lunar: "丙午年七月初三午时",
    monthPalace: "大安",
    dayPalace: "速喜",
    resultPalace: "速喜",
  };
}

/** 数字起课请求体夹具：报数 3、5、7 → 速喜、大安、大安。 */
export function numberRequest(): InterpretRequest {
  return {
    lang: "zh",
    question: "今天去谈判顺不顺利",
    method: "number",
    numbers: [3, 5, 7],
    monthPalace: "速喜",
    dayPalace: "大安",
    resultPalace: "大安",
  };
}
