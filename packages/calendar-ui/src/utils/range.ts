import { compareDay, sameDay } from "./date";

/** 一个日期在范围里的四个状态 */
export interface RangeFields {
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isInRange: boolean;
  isSelected: boolean;
}

/** 计算日期在范围里的状态。 */
export const rangeFields = function (
  date: Date,
  start: Date | null,
  end: Date | null,
): RangeFields {
  const isRangeStart = start !== null && sameDay(date, start);
  const isRangeEnd = end !== null && sameDay(date, end);

  return {
    isRangeStart,
    isRangeEnd,
    isInRange:
      start !== null && end !== null && compareDay(date, start) >= 0 && compareDay(date, end) <= 0,
    isSelected: isRangeStart || isRangeEnd,
  };
};
