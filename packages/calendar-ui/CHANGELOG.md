# @sanguo-dev/calendar-ui

## 0.4.0

### Minor Changes

### 破坏性变更

- 类型改名：`DayDecoration` → `DayContent`，`DayDecorator` → `DayContentRenderer`。
- 适配器方法改名：`CalendarAdapter.decorateMonth(input)` → `contentMonth(input)`，返回值仍是按索引对齐的 `(DayContent | null)[]`。
- `CalendarOptions.decorate` → `contentDay`；它和 `contentMonth` 共用同一份 `DayContent` 契约：`contentDay` 负责某一天，返回对象时整块覆盖 adapter 给的那一天，返回 `null` 时回退到 adapter。
- popup 不再有独立的内容入口：`CalendarPopupOptions.render`（以及中间的 `content`）删除，内容改由 `DayContent.popup` 提供。
  ```ts
  // 之前
  popup: { render: (day) => DayPopupItem[] }
  // 现在
  contentDay: (day) => ({ popup: { items: DayPopupItem[] } } | null)
  ```
- CalendarPopupOptions 只剩交互配置（trigger / placement / role / ariaLabel），并且整个选项可以省略：装饰里有 popup 就按默认交互（click + dialog + auto 定位）生效。
- 绿点的 CSS 钩子从 .cui__day-dot 改为 .cui__day.is-dot::after（伪元素，DOM 里没有节点）。原来覆盖 .cui__day-dot 的皮肤需要改成覆盖 [class~="is-dot"]::after。
- DayPopupHandle 是内部类型：sync(days) 改回 sync()。

### 新特性

- 新增 DayContent.popup：装饰里带上它就表示这一天有弹层，也自动显示绿点；popup.items 可以是数组，也可以是 () => DayPopupItem[]，后者把内容物化推迟到打开弹层那一刻。
- 新增 DayPopupContent.title：单天覆盖弹层头部「日期 · 条数」文案，优先于 locale.popupTitle。
  CalendarDay 新增 popup: DayPopupContent | null，onSelect 里能直接拿到这一天的弹层内容。
- 新增导出 DayContentRenderer；DayContent / DayPopupContent 均可从包入口按类型导入。
  绿点改为渲染管线的状态位（setDayState 的 STATE_POPUP），同时驱动 aria-haspopup，不再由 popup 模块单独扫描 42 格。

### 修复与性能

- 修复：contentDay 的内容不再常驻——删除了按日期缓存内容的 Map，之前访问过的月份会一直留在内存里（约 2 KB/月）且数据更新后不会刷新；现在内容随每次渲染产出，下一次渲染就换新。
- 修复：多实例同时 setTheme() 时不再各自强制一次全文档样式重算。refreshTheme() 只在弹层打开时才同步 CSS 变量，30 个实例同时切主题从 9.1 ms 降到 0.07 ms。
- 修复：年份选择层翻页时，头部左右按钮的 aria-label 改用 prevYearPage / nextYearPage（之前一直念「上个月 / 下个月」，翻的却是 12 年）。
- 性能：绿点改用 ::after 伪元素，每个实例少 42 个 DOM 节点（默认变体 237 → 195，范围双月 466 → 382）。
- 性能：弹层改为懒创建——装饰里第一次出现 popup 时才建控制器；不用 popup 的实例零额外成本（节点数与内存回到改动前）。
- 内存：适配器变体单实例 JS 堆 17.4 KB → 13.3 KB。
- 内部：buildDays 一次遍历产出全部格子数据（badge / subtitle / data / ariaLabel / popup），popup 模块不再回 DOM 反推日期；grid.popupOf(cell) 让打开弹层时直接拿到渲染期算好的内容。
- 内部：抽出 dateKeyOf / parseStringKey，去掉手写的日期 key 编码；GridHandle.selectAt(index) 省掉点击时的 42 格扫描；删除 addDays、rangeFields 的 out 参数、ActionContext.monthCount 等死代码。
- 内部：深色主题的两段重复变量合并；MountPanel 改为 Pick<CalendarPanel, …>；测试共用助手收拢到 tests/helpers.ts。

## 0.3.2

### Patch Changes

- 同步更新

## 0.3.1

### Patch Changes

- 性能：翻月、点选只写入状态发生变化的格子，未启用折叠时跳过重复的行可见性同步。
- 性能：点选复用当前网格，不再每次点击重建整月 42 个日期对象。
- 内存：渲染后不再长期保留 42 个 CalendarDay / Date，点击时按需从 DOM 和 adapter data 组装；单实例 JS 堆约从 17.6 KB 降到 8.8 KB。
- 内存：年月选择层改为第一次打开时创建；没打开过的实例少 13 个 DOM 节点（单月 250 → 237，双月 479 → 466）。
- 内存：格子状态标记和网格索引改用数组，移除 WeakMap；范围双月 JS 堆约从 29.5 KB 降到 14.0 KB。
- 内部：CalendarInstance / CalendarGrid 改为原型方法，减少每实例闭包；空 disabledDates 共享同一个 Set。
- 修复：范围端点移动时正确清理旧端点的 is-selected / aria-pressed。

## 0.3.0

### Minor Changes

- 新增 formatDate() / tryParseDate()：前者按 YYYY-MM-DD 或自定义格式串输出，后者是 CalendarDateInput 的不抛错版本，便于直接接输入框。
  实例新增
- close(options?)：统一关闭年月选择层与日期格 popup、隐藏根节点，并可把焦点还给触发元素。hide() 与隐藏方向的 toggle() 现在走同一条关闭路径，不再遗留选择层的 inert 与外部点击监听。

- open() / close() / close() isOpen 代替 show(), hide(), isVisible()

## 0.2.0

### Minor Changes

- 优化性能
- 移除日历 header api ，show\hide 等，只保留 是否渲染的参数。
- 添加测试案例

## 0.1.0

### Minor Changes

- 新增：popup 页面。功能修改。

## 0.0.5

### Patch Changes

- 优化内部函数
- 修改日历 样式，fill 模板 day cell 改为长方体，以美化。
- 添加文档api

## 0.0.4

### Patch Changes

- 新增 年月选择器。
- 优化 代码结构，代码功能，html生成，css

## 0.0.3

### Patch Changes

- 迁移：github和npm 都迁移到新的组织 sanguogege -> sanguo-dev

## 0.0.2

### Patch Changes

- add: color in weekend
