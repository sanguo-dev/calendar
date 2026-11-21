/** 各测试文件共用的 DOM 查询助手：都按 data-date 定位格子 */

import type { CalendarDate, DayContentRenderer, DayPopupItem } from "../src/index.ts";

/** 把「返回数组」的写法包成单天内容：空数组表示这一天没有 popup */
export const toDecorate = function (
  render: (day: CalendarDate) => readonly DayPopupItem[],
): DayContentRenderer<null> {
  return (day) => {
    const items = render(day);
    return items.length > 0 ? { popup: { items } } : null;
  };
};

/** 取某一天的格子；找不到直接抛错，避免测试里出现 undefined 断言 */
export const cellOf = function (root: HTMLElement, key: string): HTMLButtonElement {
  const cell = root.querySelector<HTMLButtonElement>(`.cui__day[data-date="${key}"]`);
  if (!cell) throw new Error(`missing cell ${key}`);
  return cell;
};

/** 某一天是否显示绿点：绿点是 .is-dot 的 ::after，不在 DOM 里 */
export const hasDot = function (root: HTMLElement, key: string): boolean {
  return cellOf(root, key).classList.contains("is-dot");
};

/** 取挂在 body 上的 popup 根节点 */
export const popupOf = function (): HTMLElement {
  const popup = document.querySelector<HTMLElement>(".cui__popup");
  if (!popup) throw new Error("missing popup");
  return popup;
};

/** popup 里每一项的文本，用来断言顺序和内容 */
export const itemsOf = function (): string[] {
  return [...popupOf().querySelectorAll(".cui__popup-item")].map((item) => item.textContent ?? "");
};
