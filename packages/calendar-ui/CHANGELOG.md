# @sanguo-dev/calendar-ui

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
