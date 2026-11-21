// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  CalendarAdapter,
  CalendarDate,
  CalendarInstance,
  CalendarOptions,
  CalendarPopupOptions,
  DayContent,
  DayContentRenderer,
  DayPopupItem,
} from "../src/index.ts";
import { createCalendarUI, zhCN } from "../src/index.ts";
import { cellOf, hasDot, itemsOf, popupOf, toDecorate } from "./helpers.ts";

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.innerHTML = "";
});

type CreateOptions = Omit<CalendarOptions, "popup" | "contentDay"> & {
  /** false 表示完全不写 popup 选项 */
  popup?: CalendarPopupOptions | false;
  /** 需要字段级覆盖时用它，和第一个参数合并 */
  contentDay?: DayContentRenderer<null>;
};

const create = function (
  contentDay?: DayContentRenderer<null>,
  options: CreateOptions = {},
): CalendarInstance {
  const host = document.createElement("div");
  document.body.append(host);
  const instance = createCalendarUI(host, {
    initialDate: options.initialDate ?? "2026-10-01",
    ...options,
    popup: options.popup === false ? undefined : (options.popup ?? {}),
    contentDay: options.contentDay ?? contentDay,
  });
  cleanups.push(() => {
    instance.destroy();
    host.remove();
  });
  return instance;
};

const subtitleOf = function (root: HTMLElement, key: string): string {
  return cellOf(root, key).querySelector(".cui__day-sub")?.textContent ?? "";
};

const tagOf = function (root: HTMLElement, key: string): string {
  const tag = cellOf(root, key).querySelector<HTMLElement>(".cui__day-tag");
  return tag && !tag.hidden ? (tag.textContent ?? "") : "";
};

/** 只有 10 月 1 日、5 日有数据 */
const sharedRender = function (day: CalendarDate): readonly DayPopupItem[] {
  return day.month === 10 && (day.day === 1 || day.day === 5)
    ? [["全天", `${day.day} 号`, "内容"]]
    : [];
};

const sharedDecorate = toDecorate(sharedRender);

describe("日期格 popup", () => {
  it("内容里带 popup 的日期显示绿点", () => {
    const contentDay = vi.fn(sharedDecorate);
    const instance = create(contentDay);

    expect(hasDot(instance.el, "2026-10-1")).toBe(true);
    expect(hasDot(instance.el, "2026-10-5")).toBe(true);
    expect(hasDot(instance.el, "2026-10-2")).toBe(false);
    expect(hasDot(instance.el, "2026-10-31")).toBe(false);

    // 42 个格子都会问一次，绿点由返回值是否为空决定
    expect(contentDay).toHaveBeenCalledTimes(42);
    expect(contentDay.mock.calls[0]?.[0]).toMatchObject({ year: 2026, month: 9, day: 28 });
  });

  it("点击打开，头部显示日期和条数，内容按数组顺序渲染", () => {
    const instance = create(
      toDecorate((day) =>
        day.month === 10 && day.day === 1
          ? [
              ["全天", "国庆节", "10 月 1 日 - 7 日放假"],
              ["10:00", "升旗仪式", "广场集合，提前 10 分钟到场"],
            ]
          : [],
      ),
    );

    cellOf(instance.el, "2026-10-1").click();

    const popup = popupOf();
    expect(popup.hidden).toBe(false);
    expect(popup.querySelector(".cui__popup-head")?.textContent).toBe("10 月 1 日 · 2 条");
    expect(itemsOf()).toEqual([
      "全天国庆节10 月 1 日 - 7 日放假",
      "10:00升旗仪式广场集合，提前 10 分钟到场",
    ]);
    expect(popup.getAttribute("role")).toBe("dialog");
    expect(cellOf(instance.el, "2026-10-1").getAttribute("aria-expanded")).toBe("true");
  });

  it("[time, title, detail] 生成默认 title / detail 结构", () => {
    const instance = create(
      toDecorate((day) =>
        day.month === 10 && day.day === 1 ? [["全天", "国庆节", "10 月 1 日 - 7 日放假"]] : [],
      ),
    );

    cellOf(instance.el, "2026-10-1").click();

    expect(popupOf().querySelector(".cui__popup-head")?.textContent).toBe("10 月 1 日 · 1 条");
    expect(popupOf().querySelector(".cui__popup-time")?.textContent).toBe("全天");
    expect(popupOf().querySelector(".cui__popup-name")?.textContent).toBe("国庆节");
    expect(popupOf().querySelector(".cui__popup-detail")?.textContent).toBe(
      "10 月 1 日 - 7 日放假",
    );
  });

  it("省略字段时不渲染对应 UI", () => {
    const instance = create(
      toDecorate((day) =>
        day.month === 10 && day.day === 1
          ? [
              ["全天", "国庆节"],
              [undefined, "只有标题", "只有详情"],
            ]
          : [],
      ),
    );

    cellOf(instance.el, "2026-10-1").click();

    const items = popupOf().querySelectorAll(".cui__popup-item");
    expect(items).toHaveLength(2);
    expect(items[0]?.querySelector(".cui__popup-detail")).toBeNull();
    expect(items[1]?.querySelector(".cui__popup-time")).toBeNull();
    expect(items[1]?.querySelector(".cui__popup-detail")?.textContent).toBe("只有详情");
  });

  it("有 popup 对象就算有内容，全空三元组只是没有内容项", () => {
    const instance = create(() => ({ popup: { items: [["", "", ""]] } }));

    expect(hasDot(instance.el, "2026-10-1")).toBe(true);

    cellOf(instance.el, "2026-10-1").click();
    expect(popupOf().hidden).toBe(false);
    expect(popupOf().querySelector(".cui__popup-head")?.textContent).toBe("10 月 1 日 · 0 条");
    expect(itemsOf()).toEqual([]);
  });

  it("三元组和 Node 可以混合，Node 原样挂载", () => {
    const node = document.createElement("div");
    node.textContent = "节点内容";
    const instance = create(
      toDecorate((day) =>
        day.month === 10 && day.day === 1 ? [["全天", "国庆节", "放假"], node] : [],
      ),
    );

    cellOf(instance.el, "2026-10-1").click();

    expect(popupOf().querySelector(".cui__popup-head")?.textContent).toBe("10 月 1 日 · 2 条");
    expect(itemsOf()).toEqual(["全天国庆节放假", "节点内容"]);
    expect(popupOf().contains(node)).toBe(true);
  });

  it("字段按纯文本挂载，不解析 HTML", () => {
    const instance = create(
      toDecorate((day) =>
        day.month === 10 && day.day === 1
          ? [["<b>全天</b>", "<b>不是标签</b>", "<b>详情</b>"]]
          : [],
      ),
    );

    cellOf(instance.el, "2026-10-1").click();

    expect(popupOf().querySelector(".cui__popup-time")?.textContent).toBe("<b>全天</b>");
    expect(popupOf().querySelector(".cui__popup-name")?.textContent).toBe("<b>不是标签</b>");
    expect(popupOf().querySelector(".cui__popup-item b")).toBeNull();
  });

  it("内容在渲染期按格子调用，打开时不再调用（内容来自渲染结果）", () => {
    const contentDay = vi.fn((day: CalendarDate): DayContent<null> | null =>
      day.month === 10 && day.day === 1 ? { popup: { items: [["全天", "内容", "详情"]] } } : null,
    );
    const instance = create(contentDay);
    const callsForDayOne = (): number =>
      contentDay.mock.calls.filter(([day]) => day.month === 10 && day.day === 1).length;

    expect(contentDay).toHaveBeenCalledTimes(42);
    expect(callsForDayOne()).toBe(1);

    cellOf(instance.el, "2026-10-1").click();

    expect(callsForDayOne()).toBe(1);
    expect(itemsOf()).toEqual(["全天内容详情"]);
  });

  it("items 传函数时，渲染期不物化，打开时才调用", () => {
    const build = vi.fn(() => [["全天", "懒加载", "详情"]] as const);
    const instance = create((day) =>
      day.month === 10 && day.day === 1 ? { popup: { items: build } } : null,
    );

    expect(hasDot(instance.el, "2026-10-1")).toBe(true);
    expect(build).toHaveBeenCalledTimes(0);

    cellOf(instance.el, "2026-10-1").click();

    expect(build).toHaveBeenCalledTimes(1);
    expect(itemsOf()).toEqual(["全天懒加载详情"]);
  });

  it("popup.title 覆盖头部文案，优先于 locale.popupTitle", () => {
    const instance = create(
      (day) =>
        day.month === 10 && day.day === 1
          ? { popup: { title: "10 月 1 日 · 自定义", items: [["全天", "内容"]] } }
          : null,
      { locale: { ...zhCN, popupTitle: () => "不该出现" } },
    );

    cellOf(instance.el, "2026-10-1").click();

    expect(popupOf().querySelector(".cui__popup-head")?.textContent).toBe("10 月 1 日 · 自定义");
  });

  it("返回 null 的日期没有绿点，也不会创建弹层", () => {
    const instance = create(() => null);

    expect(hasDot(instance.el, "2026-10-1")).toBe(false);
    expect(document.querySelector(".cui__popup")).toBeNull();

    cellOf(instance.el, "2026-10-1").click();
    expect(document.querySelector(".cui__popup")).toBeNull();
  });

  it("内容里第一次出现 popup 时才创建弹层", () => {
    let hasContent = false;
    const instance = create((day) =>
      hasContent && day.day === 1 ? { popup: { items: [["全天", "内容"]] } } : null,
    );

    // 还没有任何一天有内容：连弹层节点都不建
    expect(document.querySelector(".cui__popup")).toBeNull();

    hasContent = true;
    instance.nextMonth();

    expect(document.querySelector(".cui__popup")).not.toBeNull();
    expect(hasDot(instance.el, "2026-11-1")).toBe(true);
    cellOf(instance.el, "2026-11-1").click();
    expect(itemsOf()).toEqual(["全天内容"]);
  });

  it("hover 触发用 tooltip 语义", () => {
    const instance = create(
      toDecorate((day) => (day.month === 10 && day.day === 1 ? [["全天", "悬浮", "详情"]] : [])),
      { popup: { trigger: "hover" } },
    );

    cellOf(instance.el, "2026-10-1").dispatchEvent(
      new MouseEvent("pointerover", { bubbles: true }),
    );

    const popup = popupOf();
    expect(popup.hidden).toBe(false);
    expect(popup.getAttribute("role")).toBe("tooltip");
    expect(cellOf(instance.el, "2026-10-1").getAttribute("aria-describedby")).toBe(popup.id);
  });

  it("点击外部和 Esc 都能关闭", () => {
    const instance = create(sharedDecorate);
    const cell = cellOf(instance.el, "2026-10-1");

    cell.click();
    document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(popupOf().hidden).toBe(true);

    cell.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(popupOf().hidden).toBe(true);
  });

  it("换月后关闭", () => {
    const instance = create(sharedDecorate);
    cellOf(instance.el, "2026-10-1").click();
    expect(popupOf().hidden).toBe(false);

    instance.nextMonth();

    expect(popupOf().hidden).toBe(true);
  });

  it("contentDay 返回值不合法时抛 TypeError", () => {
    expect(() => create(() => "不是对象" as never)).toThrow(TypeError);
  });

  it("销毁实例时移除 popup", () => {
    const instance = create(sharedDecorate);
    cellOf(instance.el, "2026-10-1").click();

    instance.destroy();
    cleanups.pop();

    expect(document.querySelector(".cui__popup")).toBeNull();
  });

  it("同一批日期再次重绘时不重写绿点", () => {
    const instance = create(sharedDecorate);
    const cell = cellOf(instance.el, "2026-10-2");

    let writes = 0;
    const observer = new MutationObserver((records) => {
      writes += records.length;
    });
    observer.observe(cell, { attributes: true });

    // select() 会整块重绘，42 个格子的日期都没变，绿点一个都不该动
    instance.select("2026-10-20");
    writes += observer.takeRecords().length;
    observer.disconnect();

    expect(writes).toBe(0);
    expect(hasDot(instance.el, "2026-10-2")).toBe(false);
  });

  it("contentDay 只覆盖写了的字段，adapter 的其余内容保留", () => {
    const adapter: CalendarAdapter<null> = {
      id: "test-adapter",
      contentMonth: ({ days }) =>
        days.map((date) =>
          date.month === 10 && date.day === 1
            ? { subtitle: "adapter 副标题", badge: { text: "休", tone: "rest" } }
            : null,
        ),
    };
    const instance = create(
      (day) => (day.month === 10 && day.day === 1 ? { subtitle: "contentDay 副标题" } : null),
      { adapter, popup: false },
    );

    // 只换副标题，adapter 的 badge 从同名字段继承
    expect(subtitleOf(instance.el, "2026-10-1")).toBe("contentDay 副标题");
    expect(tagOf(instance.el, "2026-10-1")).toBe("休");
  });

  it("contentDay 返回 null 时回退到 adapter", () => {
    const adapter: CalendarAdapter<null> = {
      id: "test-adapter",
      contentMonth: ({ days }) =>
        days.map((date) =>
          date.month === 10 && date.day === 1
            ? { subtitle: "adapter 副标题", badge: { text: "休" } }
            : null,
        ),
    };
    const instance = create(() => null, { adapter, popup: false });

    expect(subtitleOf(instance.el, "2026-10-1")).toBe("adapter 副标题");
    expect(tagOf(instance.el, "2026-10-1")).toBe("休");
  });

  it("contentDay 只覆盖写了的字段，adapter 的 popup 保留", () => {
    const adapter: CalendarAdapter<null> = {
      id: "test-adapter",
      contentMonth: ({ days }) =>
        days.map((date) =>
          date.month === 10 && date.day === 1
            ? { subtitle: "基础", popup: { items: [["全天", "内容"]] } }
            : null,
        ),
    };
    const instance = create(
      (day) => (day.month === 10 && day.day === 1 ? { subtitle: "覆盖" } : null),
      { adapter },
    );

    expect(subtitleOf(instance.el, "2026-10-1")).toBe("覆盖");
    expect(hasDot(instance.el, "2026-10-1")).toBe(true);

    cellOf(instance.el, "2026-10-1").click();
    expect(itemsOf()).toEqual(["全天内容"]);
  });

  it("不传 popup 选项也按默认交互生效（click + dialog）", () => {
    const instance = create(
      (day) =>
        day.month === 10 && day.day === 1
          ? { popup: { items: [["全天", "内容"]] }, subtitle: "有内容" }
          : null,
      { popup: false },
    );

    // 内容照样生效，弹层和绿点也不需要额外配置
    expect(subtitleOf(instance.el, "2026-10-1")).toBe("有内容");
    expect(hasDot(instance.el, "2026-10-1")).toBe(true);

    cellOf(instance.el, "2026-10-1").click();
    expect(popupOf().hidden).toBe(false);
    expect(popupOf().getAttribute("role")).toBe("dialog");
    expect(cellOf(instance.el, "2026-10-1").getAttribute("aria-haspopup")).toBe("dialog");
  });
});
