import type { CalendarDay, DayPopupContent, GridHandle, GridOptions } from "../types";
import { createDate, dateKeyOf } from "../utils/date";
import { node, setRowVisibility } from "../utils/dom";
import { prefersReducedMotion, readCssDuration, readCssEasing } from "../utils/motion";
import { createDayCell, createDayMarks, setDay, setDayState, type DayMarks } from "./day";

/** 固定 6 行 × 7 列 */
const CELL_COUNT = 42;
const ROW_COUNT = 6;

interface RowMetrics {
  height: number;
  opacity: number;
  marginBottom: number;
}

/** 读取一行的视觉尺寸。 */
const readRowMetrics = function (row: HTMLElement): RowMetrics {
  const rect = row.getBoundingClientRect();
  const style = getComputedStyle(row);
  const margin = Number.parseFloat(style.marginBottom);
  return {
    height: rect.height,
    opacity: Number.parseFloat(style.opacity) || 0,
    marginBottom: Number.isFinite(margin) ? margin : 0,
  };
};

class CalendarGrid<TData = null> implements GridHandle<TData> {
  readonly el: HTMLElement;
  private readonly options: GridOptions<TData>;
  private readonly rowEls: HTMLElement[];
  private readonly cells: HTMLButtonElement[];
  private readonly marks: DayMarks;
  /** 每个格子最近一次渲染的日期 key（YYYYMMDD，0 表示没有数据） */
  private readonly keys = new Int32Array(CELL_COUNT);
  /** 每个格子的 adapter data 引用；day 对象不保留，点击时再组装 */
  private readonly data: (TData | null)[] = Array.from({ length: CELL_COUNT }, () => null);
  /** 每个格子的 popup 内容；打开弹层时按格子取，省掉再问一次内容回调 */
  private readonly popups: (DayPopupContent | null)[] = Array.from(
    { length: CELL_COUNT },
    () => null,
  );
  /** 单选模式下最近一次渲染的选中格；选中日期跨月后可能不在 42 格里 */
  private selectedIndex = -1;
  /** 上一次应用的行集合，重复渲染时直接跳过 */
  private visibleKey: string | null = null;
  private readonly rowAnimations = new Map<HTMLElement, Animation>();
  private readonly handleClick: (event: MouseEvent) => void;

  constructor(options: GridOptions<TData>) {
    this.options = options;
    this.el = node("div", "cui__grid");
    this.rowEls = Array.from({ length: ROW_COUNT }, () => node("div", "cui__week"));
    this.cells = Array.from({ length: CELL_COUNT }, () => createDayCell());
    this.marks = createDayMarks(CELL_COUNT, options.popupDialog);

    this.rowEls.forEach((row, index) => {
      row.append(...this.cells.slice(index * 7, index * 7 + 7));
    });
    this.el.append(...this.rowEls);

    this.handleClick = (event) => this.onClick(event);
    this.el.addEventListener("click", this.handleClick);
  }

  /** 换月：更新格子文本与状态（节点复用，不重新创建） */
  render(next: CalendarDay<TData>[]): void {
    this.selectedIndex = -1;
    for (let i = 0; i < CELL_COUNT; i++) {
      const day = next[i];
      const cell = this.cells[i];
      if (!day || !cell) {
        this.keys[i] = 0;
        this.data[i] = null;
        this.popups[i] = null;
        continue;
      }

      this.keys[i] = dateKeyOf(day.year, day.month, day.day);
      this.data[i] = day.data;
      this.popups[i] = day.popup;
      setDay(cell, day, this.marks, i);
      if (day.isSelected && this.selectedIndex < 0) this.selectedIndex = i;
    }
  }

  /** 取某个格子这一轮渲染出的 popup 内容；没有时返回 null */
  popupOf(cell: HTMLElement): DayPopupContent | null {
    const index = this.cells.indexOf(cell as HTMLButtonElement);
    return index < 0 ? null : (this.popups[index] ?? null);
  }

  /** 点选：按日期 key 找到格子，再走 selectAt */
  selectDay(key: number): CalendarDay<TData> | undefined {
    for (let i = 0; i < CELL_COUNT; i++) {
      if ((this.keys[i] ?? 0) === key) return this.selectAt(i);
    }
    return undefined;
  }

  /** 点选已知下标的格子：只更新旧选中 / 新选中的格子，并返回新选中格的完整数据 */
  selectAt(index: number): CalendarDay<TData> | undefined {
    // 先取新格子的状态；取不到（空格或已换月）就不动旧选中
    const next = this.readDay(index);
    if (!next) return undefined;

    if (this.selectedIndex !== index) {
      const previousIndex = this.selectedIndex;
      if (previousIndex >= 0) {
        const previous = this.readDay(previousIndex);
        const previousCell = this.cells[previousIndex];
        if (previous && previousCell) {
          setDayState(previousCell, { ...previous, isSelected: false }, this.marks, previousIndex);
        }
      }

      const nextCell = this.cells[index];
      if (!nextCell) return undefined;
      setDayState(nextCell, { ...next, isSelected: true }, this.marks, index);
      this.selectedIndex = index;

      // next 是写状态之前读的，选中位要跟着刚写入的状态
      return { ...next, isSelected: true };
    }

    return next;
  }

  setVisibleRows(rows: readonly number[] | null, animate = true): void {
    const visible = rows === null ? null : new Set(rows);
    const key = visible === null ? "*" : [...visible].sort((a, b) => a - b).join(",");

    // 翻月等场景要求瞬时切换：即使行集合没变，也要把进行中的动画收掉
    if (!animate) {
      // 没有折叠变化、也没有动画在跑时，什么都不用做
      if (key === this.visibleKey && this.rowAnimations.size === 0) return;
      this.cancelRowAnimations();
      this.applyInstant(visible);
      this.visibleKey = key;
      return;
    }

    if (key === this.visibleKey) return;
    this.visibleKey = key;

    this.animateRows(visible);
  }

  destroy(): void {
    this.cancelRowAnimations();
    this.el.removeEventListener("click", this.handleClick);
  }

  /** 从格子当前的 DOM 状态组装 CalendarDay；只在点击 / 回调时调用 */
  private readDay(index: number): CalendarDay<TData> | undefined {
    const cell = this.cells[index];
    const key = this.keys[index] ?? 0;
    if (!cell || key === 0) return undefined;

    const year = Math.floor(key / 10000);
    const month = Math.floor(key / 100) % 100;
    const date = key % 100;
    const tag = cell.children[0] as HTMLElement | undefined;
    const sub = cell.children[2] as HTMLElement | undefined;
    const badgeText = tag?.textContent ?? "";
    const tone = tag?.dataset.tone;
    const badge: CalendarDay<TData>["badge"] =
      tag !== undefined && !tag.hidden
        ? tone === undefined
          ? { text: badgeText }
          : { text: badgeText, tone }
        : null;

    return {
      year,
      month,
      day: date,
      date: createDate(year, month, date),
      inCurrentMonth: !cell.classList.contains("is-outside"),
      isToday: cell.classList.contains("is-today"),
      isSelected: cell.classList.contains("is-selected"),
      isDisabled: cell.disabled,
      isRangeStart: cell.classList.contains("is-range-start"),
      isRangeEnd: cell.classList.contains("is-range-end"),
      isInRange: cell.classList.contains("is-in-range"),
      subtitle: sub?.textContent ?? "",
      badge,
      data: this.data[index] ?? null,
      popup: this.popups[index] ?? null,
      ariaLabel: cell.getAttribute("aria-label") ?? "",
    };
  }

  private onClick(event: MouseEvent): void {
    const cell = (event.target as HTMLElement).closest<HTMLElement>(".cui__day");
    if (!cell) return;

    // 点击很少发生，直接数组查找即可；省掉一个「格子 → 下标」的 WeakMap
    const index = this.cells.indexOf(cell as HTMLButtonElement);
    if (index < 0) return;

    const picked = this.readDay(index);
    if (picked && !picked.isDisabled) this.options.onSelect(picked, index);
  }

  private cancelRowAnimations(): void {
    this.rowAnimations.forEach((animation) => {
      try {
        animation.cancel();
      } catch {
        // 动画已经被浏览器回收
      }
    });
    this.rowAnimations.clear();
  }

  private applyInstant(visible: ReadonlySet<number> | null): void {
    this.rowEls.forEach((row, index) => {
      setRowVisibility(row, visible === null || visible.has(index));
    });
  }

  private animateRows(visible: ReadonlySet<number> | null): void {
    const firstRow = this.rowEls[0] as HTMLElement;
    const gridStyle = getComputedStyle(this.el);
    const duration = readCssDuration(gridStyle, "--cui-collapse-duration", 200);
    const easing = readCssEasing(gridStyle, "--cui-collapse-easing", "ease");

    if (typeof firstRow.animate !== "function" || prefersReducedMotion() || duration === 0) {
      this.cancelRowAnimations();
      this.applyInstant(visible);
      return;
    }

    // 先读当前视觉高度（可能正被上一段动画驱动），再取消动画、落到最终状态
    const before = this.rowEls.map(readRowMetrics);
    this.cancelRowAnimations();
    this.applyInstant(visible);
    const after = this.rowEls.map(readRowMetrics);

    this.rowEls.forEach((row, index) => {
      const from = before[index] as RowMetrics;
      const to = after[index] as RowMetrics;
      if (Math.abs(from.height - to.height) < 0.5) return;

      const animation = row.animate(
        [
          {
            height: `${from.height}px`,
            opacity: from.opacity,
            marginBottom: `${from.marginBottom}px`,
          },
          {
            height: `${to.height}px`,
            opacity: to.opacity,
            marginBottom: `${to.marginBottom}px`,
          },
        ],
        { duration, easing, fill: "none" },
      );

      this.rowAnimations.set(row, animation);
      animation.finished
        .then(() => {
          if (this.rowAnimations.get(row) === animation) this.rowAnimations.delete(row);
        })
        .catch(() => {
          // cancel 会 reject finished，无需处理
        });
    });
  }
}

/** 创建日期网格。 */
export const createGrid = function <TData = null>(options: GridOptions<TData>): GridHandle<TData> {
  return new CalendarGrid<TData>(options);
};
