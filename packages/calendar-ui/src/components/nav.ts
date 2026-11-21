import type { NavHandle, NavOptions } from "../types";
import { createArrowIcon, node } from "../utils/dom";

/** 创建头部左右切换按钮。 */
export const createNav = function (options: NavOptions): NavHandle {
  const el = node("button", "cui__nav");
  el.type = "button";
  el.dataset.direction = options.direction;
  el.setAttribute("aria-label", options.ariaLabel);
  el.append(createArrowIcon());
  el.addEventListener("click", options.onClick);

  /** 上次写入的禁用状态；每次重绘都写一遍没有必要 */
  let disabledState = false;
  /** 上次写入的无障碍名称；年份层翻页时的文案和月份层不同 */
  let labelState = options.ariaLabel;

  return {
    el,
    setLabel: (label: string) => {
      if (labelState === label) return;
      labelState = label;
      el.setAttribute("aria-label", label);
    },
    setDisabled: (disabled: boolean) => {
      if (disabledState === disabled) return;
      disabledState = disabled;

      el.disabled = disabled;
      if (disabled) el.setAttribute("aria-disabled", "true");
      else el.removeAttribute("aria-disabled");
    },
    destroy: () => el.removeEventListener("click", options.onClick),
  };
};
