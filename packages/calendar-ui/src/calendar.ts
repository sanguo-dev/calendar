import { createHeader } from "./components/header";
import { createPicker } from "./components/picker";
import { goTo, selectDay } from "./core/actions";
import {
  clampStartMonth,
  createBounds,
  isMonthOutOfRange,
  isYearOutOfRange,
  navDisabled,
  resolveMonthCount,
} from "./core/bounds";
import { createCollapse } from "./core/collapse";
import { createDayPopup } from "./core/day-popup";
import { createInstance } from "./core/instance";
import { createHeaderLabel } from "./core/labels";
import { createPanels, createRoot, mountCalendar } from "./core/layout";
import { createMonthSlide } from "./core/month-slide";
import { resolveOptions } from "./core/options";
import { createPickerLayer } from "./core/picker-layer";
import { createDayBuilder, createRenderer, updateNav } from "./core/render";
import { createState } from "./core/state";
import type {
  ActionContext,
  CalendarDay,
  CalendarInstance,
  CalendarOptions,
  DayPopupHandle,
} from "./types";

/** 在容器中创建并返回一个日历实例。 */
export function createCalendarUI<TData = null>(
  container: HTMLElement,
  options: CalendarOptions<TData> = {},
): CalendarInstance {
  const { config, minDate, maxDate, disabledDates, initial } = resolveOptions(options);
  const state = createState(initial);

  const monthCount = resolveMonthCount(config.mode, config.requestedMonths, minDate, maxDate);
  const bounds = createBounds(minDate, maxDate, disabledDates, monthCount);

  // 双视图如果右边界不足两个月，起始月要先往前收一档
  const first = clampStartMonth(bounds, state.year, state.month);
  state.year = first.year;
  state.month = first.month;

  const root = createRoot(config, monthCount);
  const panels = createPanels(config, monthCount, handleSelect);
  const slide = createMonthSlide(panels);
  const collapse = createCollapse({
    config,
    state,
    panels,
    monthCount,
    onApply: () => render(),
  });
  const currentDays = createDayBuilder(config, bounds, state);

  // header: false 时头部和选择层都不创建，避免在 DOM 里留下 hidden 的空节点
  const picker = config.showHeader
    ? createPicker({
        locale: config.locale,
        getYear: () => state.year,
        getMonth: () => state.month,
        isMonthDisabled: (year, month) => isMonthOutOfRange(bounds, year, month),
        isYearDisabled: (year) => isYearOutOfRange(bounds, year),
        onPickMonth: (year, month) => {
          pickerLayer?.close();
          goToMonth(year, month);
        },
        onPickYear: (year) => {
          pickerLayer?.close();
          goToMonth(year, state.month);
        },
      })
    : null;

  const header = config.showHeader
    ? createHeader({
        year: state.year,
        month: state.month,
        locale: config.locale,
        label: createHeaderLabel(config.locale, monthCount),
        onYearClick: () => pickerLayer?.toggle("year"),
        onMonthClick: () => pickerLayer?.toggle("month"),
        onPrev: () => pickerLayer?.step(-1),
        onNext: () => pickerLayer?.step(1),
        getNavDisabled: () => {
          if (picker !== null && picker.mode() === "year") {
            return { prev: !picker.canPage(-1), next: !picker.canPage(1) };
          }
          return navDisabled(bounds, state.year, state.month);
        },
        getPickerMode: () => picker?.mode() ?? null,
        renderer: config.renderHeader,
      })
    : null;
  header?.setTitleExpanded(false);

  const panelEls = mountCalendar({
    root,
    headerEl: header?.el ?? null,
    pickerEl: picker?.el ?? null,
    collapseButton: collapse.button,
    panels,
    monthCount,
  });

  // popup 只负责「怎么打开」；「这一天有什么」由 buildDays 产出的内容决定。
  // 懒创建：内容里第一次出现 popup 时才建，不用 popup 的实例一分钱不付。
  let popup: DayPopupHandle | null = null;
  const ensurePopup = (): DayPopupHandle =>
    (popup ??= createDayPopup({
      root,
      popup: config.popup,
      locale: config.locale,
      getContent: (cell) => {
        for (const panel of panels) {
          if (panel.grid.el.contains(cell)) return panel.grid.popupOf(cell);
        }
        return null;
      },
    }));

  /** 每轮渲染后同步：有内容才建；已经建过的每轮都要 sync，打开中的弹层才能随换月关闭 */
  const syncPopup = (days: readonly (readonly CalendarDay<TData>[])[]): void => {
    if (popup === null && days.some((list) => list.some((day) => day.popup !== null))) {
      ensurePopup();
    }
    popup?.sync();
  };

  const render = createRenderer({
    root,
    config,
    state,
    bounds,
    header,
    panels,
    panelEls,
    collapse,
    syncPopup,
    currentDays,
  });

  const actionContext: ActionContext<TData> = {
    config,
    state,
    bounds,
    root,
    panels,
    collapse,
    slide,
    render,
    currentDays,
  };

  const pickerLayer =
    header !== null && picker !== null
      ? createPickerLayer({
          root,
          header,
          picker,
          getMonth: () => ({ year: state.year, month: state.month }),
          updateNav: () => updateNav(header, bounds, state),
          onGoTo: (year, month) => goToMonth(year, month),
        })
      : null;

  /** 翻到指定年月。 */
  function goToMonth(year: number, month: number): void {
    goTo(actionContext, year, month);
  }

  /** 处理日期格选中。 */
  function handleSelect(day: CalendarDay<TData>, index: number): void {
    selectDay(actionContext, day, index);
  }

  root.classList.add("cui--no-animation");
  container.appendChild(root);
  // 首次渲染不播折叠动画
  render(false);
  root.classList.remove("cui--no-animation");

  return createInstance({
    ...actionContext,
    header,
    picker,
    pickerLayer,
    getPopup: () => popup,
    goTo: goToMonth,
  });
}
