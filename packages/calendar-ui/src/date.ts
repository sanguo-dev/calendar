import type { CalendarDateInput, CalendarDateValue } from "./types";
import { dateFromParts, parseDateInput } from "./utils/date";

/** 格式串里的占位符：按长度优先，YYYY 不会被拆成两个 YY */
const FORMAT_TOKEN = /YYYY|YY|MM|M|DD|D/g;

/** 补零到两位 */
const pad2 = function (value: number): string {
  return String(value).padStart(2, "0");
};

/** 把任意日期形态解析成本地 Date；非法时抛 TypeError / RangeError */
const resolveDate = function (value: CalendarDateValue, path: string): Date {
  if (value instanceof Date || typeof value === "string") return parseDateInput(value, path);

  if (typeof value === "object" && value !== null) {
    const { year, month, day } = value;
    return dateFromParts(year, month, day, path);
  }

  // 其余类型交给 parseDateInput 抛统一错误
  return parseDateInput(value as CalendarDateInput, path);
};

/**
 * 把日期格式化成字符串
 *
 * 默认 `YYYY-MM-DD`；格式串支持 `YYYY`、`YY`、`MM`、`M`、`DD`、`D` 六个占位符，
 * 其余字符原样保留。只处理年月日，时分秒会被丢弃，按本地时区取值。
 *
 * @example
 * formatDate("2026/10/1"); // "2026-10-01"
 * formatDate(day, "YYYY年M月D日"); // "2026年10月1日"
 */
export const formatDate = function (value: CalendarDateValue, pattern = "YYYY-MM-DD"): string {
  const date = resolveDate(value, "formatDate(value)");
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return pattern.replace(FORMAT_TOKEN, (token) => {
    switch (token) {
      case "YYYY":
        return String(year);
      case "YY":
        return pad2(year % 100);
      case "MM":
        return pad2(month);
      case "M":
        return String(month);
      case "DD":
        return pad2(day);
      case "D":
        return String(day);
      default:
        return token;
    }
  });
};

/**
 * 解析日期，非法输入返回 `null`
 *
 * 规则和 `CalendarDateInput` 一致：接受 `Date`、`YYYY-M-D` / `YYYY/M/D` 字符串，
 * 或带 `year` / `month` / `day` 的对象；不存在日期、格式错误、`null` / `undefined`
 * 一律返回 `null`，不抛错。
 *
 * @example
 * tryParseDate(input.value); // 输入法没打完时返回 null，不打断输入
 */
export const tryParseDate = function (value: CalendarDateValue | null | undefined): Date | null {
  if (value === null || value === undefined) return null;

  try {
    return resolveDate(value, "tryParseDate(value)");
  } catch {
    return null;
  }
};
