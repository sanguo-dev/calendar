import type { CalendarCloseOptions, CalendarInstance, CalendarRuntime } from "../types";
import { readDate } from "../utils/date";
import { applyBounds, clearRangeValue, selectDate, setRangeValue } from "./actions";
import { copyRange } from "./state";

/** 判断是否是元素节点：跨文档创建时也不依赖全局构造函数 */
const isElement = function (value: unknown): value is HTMLElement {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Node).nodeType === 1 &&
    typeof (value as HTMLElement).focus === "function"
  );
};

/** 创建对外的日历实例 API。 */
export const createInstance = function <TData = null>(
  runtime: CalendarRuntime<TData>,
): CalendarInstance {
  const {
    config,
    state,
    bounds,
    root,
    header,
    picker,
    pickerLayer,
    collapse,
    slide,
    panels,
    popup,
  } = runtime;
  const doc = root.ownerDocument;
  /** 最近一次由隐藏变为可见时的焦点元素，关闭时还回去 */
  let lastFocus: HTMLElement | null = null;

  /** 打开日历；从关闭变为打开时记下触发它的焦点元素 */
  const open = function (): void {
    if (root.hidden) {
      const active = doc.activeElement;
      lastFocus =
        isElement(active) && active !== doc.body && !root.contains(active) ? active : null;
    }
    root.hidden = false;
  };

  /** 关闭日历：先收子层，再隐藏根节点，最后处理焦点 */
  const close = function (options: CalendarCloseOptions = {}): void {
    const { restoreFocus } = options;
    const hadFocus = root.contains(doc.activeElement);

    // 年月选择层自己带外部点击 / Esc 监听和 inert，必须走它自己的 close
    pickerLayer?.close();
    // 让 popup 先把焦点还给日期格，再统一还给触发元素
    popup?.close(true);

    // 关选择层会把焦点移到头部标题，这里一并算作「焦点原本就在日历里」
    const focusedInside = root.contains(doc.activeElement);
    root.hidden = true;

    const target = restoreFocus === false ? null : (restoreFocus ?? lastFocus);
    lastFocus = null;

    const shouldRestore =
      restoreFocus !== false && (restoreFocus !== undefined || hadFocus || focusedInside);
    if (target !== null && shouldRestore && target.isConnected) {
      target.focus({ preventScroll: true });
    }
  };

  return {
    el: root,
    setMonth: (year, month) => runtime.goTo(year, month),
    getMonth: () => ({ year: state.year, month: state.month }),
    prevMonth: () => runtime.goTo(state.year, state.month - 1),
    nextMonth: () => runtime.goTo(state.year, state.month + 1),
    select: (date) => selectDate(runtime, date),
    getSelected: () => {
      if (config.mode === "range") {
        return state.rangeStart === null ? null : new Date(state.rangeStart);
      }
      return new Date(state.selected);
    },
    getRange: () => copyRange(state),
    setRange: (start, end) => setRangeValue(runtime, start, end),
    clearRange: () => clearRangeValue(runtime),
    open,
    close,
    toggle: () => {
      if (root.hidden) open();
      else close();
    },
    isOpen: () => !root.hidden,
    getMinDate: () => (bounds.minDate === null ? null : new Date(bounds.minDate)),
    setMinDate: (date) => {
      applyBounds(runtime, readDate(date, "setMinDate(date)"), bounds.maxDate);
    },
    getMaxDate: () => (bounds.maxDate === null ? null : new Date(bounds.maxDate)),
    setMaxDate: (date) => {
      applyBounds(runtime, bounds.minDate, readDate(date, "setMaxDate(date)"));
    },
    getTheme: () => config.theme,
    setTheme: (next) => {
      config.theme = next;
      root.dataset.theme = next;
      popup?.refreshTheme();
    },
    destroy: () => {
      popup?.destroy();
      slide.stop();
      pickerLayer?.destroy();
      picker?.destroy();
      collapse.destroy();
      header?.destroy();
      panels.forEach((panel) => panel.grid.destroy());
      root.remove();
      lastFocus = null;
    },
  };
};
