import { describe, expect, it } from "vite-plus/test";
import { formatDate, tryParseDate } from "../src/index.ts";
import { monthFromIndex, normalizeMonth } from "../src/utils/date.ts";

describe("月份整数运算", () => {
  it("monthFromIndex 对负索引返回合法月份", () => {
    expect(monthFromIndex(-1)).toEqual({ year: -1, month: 12 });
    expect(monthFromIndex(-12)).toEqual({ year: -1, month: 1 });
  });

  it("normalizeMonth 支持 0-99 年且能跨年进位", () => {
    expect(normalizeMonth(50, 1)).toEqual({ year: 50, month: 1 });
    expect(normalizeMonth(2026, 13)).toEqual({ year: 2027, month: 1 });
    expect(normalizeMonth(2026, 0)).toEqual({ year: 2025, month: 12 });
  });
});

describe("formatDate", () => {
  it("默认格式补零成 YYYY-MM-DD", () => {
    expect(formatDate(new Date(2026, 9, 1))).toBe("2026-10-01");
    expect(formatDate("2026/10/1")).toBe("2026-10-01");
    expect(formatDate("2026-10-01")).toBe("2026-10-01");
  });

  it("支持自定义格式串", () => {
    expect(formatDate("2026-10-01", "YYYY年M月D日")).toBe("2026年10月1日");
    expect(formatDate("2026-10-01", "YY/M/D")).toBe("26/10/1");
    expect(formatDate("2026-10-01", "DD.MM.YYYY")).toBe("01.10.2026");
  });

  it("接受日历格那样的年月日对象", () => {
    expect(formatDate({ year: 2026, month: 10, day: 1 })).toBe("2026-10-01");
  });

  it("丢弃时分秒", () => {
    expect(formatDate(new Date(2026, 9, 1, 13, 45, 30, 500))).toBe("2026-10-01");
  });

  it("非法输入抛错而不是返回空串", () => {
    expect(() => formatDate("not a date")).toThrow(TypeError);
    expect(() => formatDate("2026-13-01")).toThrow(RangeError);
    expect(() => formatDate("2026-02-30")).toThrow(RangeError);
  });
});

describe("tryParseDate", () => {
  it("解析合法输入，只保留年月日", () => {
    expect(tryParseDate("2026/10/1")).toEqual(new Date(2026, 9, 1));
    expect(tryParseDate("2026-10-01")).toEqual(new Date(2026, 9, 1));
    expect(tryParseDate(new Date(2026, 9, 1, 13, 45))).toEqual(new Date(2026, 9, 1));
    expect(tryParseDate({ year: 2026, month: 10, day: 1 })).toEqual(new Date(2026, 9, 1));
  });

  it("非法输入返回 null，不抛错", () => {
    expect(tryParseDate("")).toBeNull();
    expect(tryParseDate("   ")).toBeNull();
    expect(tryParseDate("abc")).toBeNull();
    expect(tryParseDate("2026-13-01")).toBeNull();
    expect(tryParseDate("2026-02-30")).toBeNull();
    expect(tryParseDate(null)).toBeNull();
    expect(tryParseDate(undefined)).toBeNull();
  });
});
