/** 各测试文件共用的 DOM 查询助手：都按 data-date 定位格子 */

/** 取某一天的格子；找不到直接抛错，避免测试里出现 undefined 断言 */
export const cellOf = function (root: HTMLElement, key: string): HTMLButtonElement {
  const cell = root.querySelector<HTMLButtonElement>(`.cui__day[data-date="${key}"]`);
  if (!cell) throw new Error(`missing cell ${key}`);
  return cell;
};

/** 取某一天格子右上角的绿点 */
export const dotOf = function (root: HTMLElement, key: string): HTMLElement {
  const dot = cellOf(root, key).querySelector<HTMLElement>(".cui__day-dot");
  if (!dot) throw new Error(`missing dot ${key}`);
  return dot;
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
