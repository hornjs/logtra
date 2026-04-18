# logtra

[English](README.md)

`logtra` 是一个小型 CLI 日志库，用来组织终端输出。

它主要关注：
- 基础日志：`log`、`info`、`warn`、`error`、`debug`
- 结构化诊断：`issue`、`step`、`issuer`
- 动态终端输出：`overwrite`、`spin`
- 轻量级 message 颜色标签

## 安装

```bash
pnpm add logtra picocolors
```

`logtra` 不强绑定某一个颜色后端。你通过 `Options.colorizer` 传入一个 `Colorizer` 实现即可。

## 快速开始

```ts
import { Logger } from "logtra";
import { createPico } from "logtra/picocolors";

const logger = new Logger({
  colorizer: createPico(true),
});

logger.info("Ready");
logger.warn("Be careful");
logger.error("Something failed");
logger.log("<cyan>manual color</cyan>");
```

## 颜色后端

`logtra` 内部依赖一个很小的 `Colorizer` 接口：

```ts
type Colorizer = {
  wrap: (name: string, input: string | number | null | undefined) => string;
  is: (name: string) => boolean;
};
```

目前提供了几个适配入口：

```ts
import { createPico } from "logtra/picocolors";
import { createChalk } from "logtra/chalk";
import { createColorette } from "logtra/colorette";
import { createAnsiColors } from "logtra/ansi-colors";
import { createAnsiStyles } from "logtra/ansi-styles";
import { createYocto } from "logtra/yoctocolors";
```

## 基础用法

### Logger

```ts
const logger = new Logger({
  colorizer: createPico(true),
  debug: true,
});

logger.log("plain output");
logger.info("success");
logger.warn("warning");
logger.error("failure");
logger.debug("debug details");
```

### Issue 与 Step

```ts
const step = logger.step("Config");

step.issue({ type: "info", message: "Loaded config file" });
step.issue({ type: "warning", message: "Unused field: <yellow>foo</yellow>" });
step.done();

if (logger.issuer.hasWarnings) {
  logger.warn("Doctor finished with warnings");
}
```

如果一个 step 在结束前没有任何输出，`done()` 会直接渲染一条完成行：

```ts
step.done(); // <bold>Config</bold> <green>OK</green>
step.done("<yellow>SKIPPED</yellow>");
```

你也可以通过 `formatStep` 自定义 step 标题的渲染方式：

```ts
const logger = new Logger({
  colorizer: createPico(true),
  formatStep: (name) => `> ${name}:`,
});

logger.step("Config").done(); // > Config: <green>OK</green>
```

`done(message?)` 接收的是完整 message markup，不只是纯文本。

### Overwrite

```ts
const overwrite = logger.overwrite("Starting...");
overwrite.update("Downloading...\nrepo-a");
overwrite.update("Downloading...\nrepo-b");
overwrite.clear();
```

### Spinner

```ts
const spinner = logger.spin("Resolving repos...");
spinner.update("Cloning repo-a...");
spinner.done("Done");
```

`done()` 和 `fail()` 会先停止活动 spinner。在 TTY 模式下，它们还会先清掉之前渲染的 spinner 输出，再写最终稳定消息。

### Live Output 协调规则

`overwrite()` 和 `spin()` 都建立在同一套 live renderer 模型之上。

当一个 overwrite 区块结束，并且应该彻底退出 live-output 管理器时，可以调用 `dispose()`：

```ts
const overwrite = logger.overwrite("Starting...");
overwrite.dispose();
```

- 最近一次 `update()` 的 live renderer 会成为当前可见内容
- `log()`、`info()`、`warn()`、`error()`、`issue()` 这类稳定输出会先临时暂停当前 live renderer，写完后再恢复
- 当前可见的 live renderer 在结束或被 `dispose()` 后，管理器会回退到上一个仍然存活的 live renderer

这意味着你不需要在写普通日志前手动停止 spinner，logger 会自动协调这次切换。

## Message 颜色标签语法

`logtra` 支持在 message 里直接写轻量级颜色标签。

例如：

```ts
logger.log("<cyan>hello</cyan>");
logger.warn("Use <yellow>--force</yellow> with care");
```

最终由当前的 `Colorizer` 负责把这些标签渲染成终端样式。

### 为什么使用标签

标签语法的核心价值是让 message 本身不依赖具体颜色库。

同一条 message 可以在不同后端之间切换：
- `picocolors`
- `chalk`
- `colorette`
- `ansi-colors`
- `ansi-styles`
- `yoctocolors`

而不需要改 message 文本本身。

### 基本语法

最基本的写法是：

```txt
<red>Hello</red>
```

支持嵌套：

```txt
<red>Error: <bold>failed</bold></red>
```

如果当前颜色后端同时支持这两个标签，就会按嵌套顺序应用。

### 支持哪些标签

支持的标签名取决于当前 `Colorizer`。

常见可用名称通常包括：
- `red`
- `green`
- `yellow`
- `blue`
- `magenta`
- `cyan`
- `white`
- `gray`
- `bold`
- `dim`
- `italic`
- `underline`
- `inverse`
- `strikethrough`
- 类似 `bgRed` 这样的背景色

当开启 `Options.styleTagAliases` 时，还会额外支持这些 HTML 风格别名：
- `<b>` / `<strong>` -> `bold`
- `<i>` / `<em>` -> `italic`
- `<u>` -> `underline`
- `<s>` / `<del>` -> `strikethrough`
- `<span ...>` -> 仅作为属性容器

如果当前后端不支持某个标签：
- 默认会保留原始标签文本
- 当启用 `stripColorTags` 时则会移除该标签

### 属性语法

`logtra` 也支持一小部分基于属性的语法。

例如：

```txt
<span color="red">Hello</span>
<span bold>Bold text</span>
<span underline color="cyan">Link</span>
```

目前支持映射到样式的属性有：
- `bold`
- `italic`
- `inverse`
- `underline`
- `strikethrough`
- `color="..."`

比如：

```ts
logger.log('<span bold color="yellow">Warning</span>');
```

等价于依次应用 `bold` 和 `yellow`。

`color="..."` 也可以包含多个以空白分隔的样式 token：

```ts
logger.log('<span color="cyan bold">Link</span>');
logger.log('<span color="yellow underline">Warning</span>');
```

这些 token 会逐个交给当前 `Colorizer` 检查。支持的 token 会按顺序应用，不支持的 token 会被忽略。

属性容器标签和 HTML 风格别名默认关闭，需要显式开启：

```ts
const logger = new Logger({
  colorizer: createPico(true),
  styleTagAliases: true,
});
```

开启后，这些写法才有效：

```ts
logger.log("<b>Bold</b>");
logger.log("<u>Underline</u>");
logger.log('<span underline color="cyan">Link</span>');
```

### 未知标签

默认情况下，未知标签会被保留：

```ts
logger.log("<foo>hello</foo>");
```

如果 `foo` 不被当前后端支持，原始 markup 会继续出现在输出里。

这样做是有意的，目的是避免这些场景里意外丢失信息：
- message 里写了当前后端不支持的标签
- 颜色输出被关闭
- 不同颜色库支持的样式集合不同

### `stripColorTags`

`stripColorTags` 用来控制“标签无法渲染时怎么办”。

当 `stripColorTags` 为 `false` 时：
- 不支持的标签会保留在输出中

当 `stripColorTags` 为 `true` 时：
- 不支持的标签会被移除
- 只保留内部纯文本

示例：

```ts
logger.write({
  message: "<foo>Hello</foo>",
  stripColorTags: true,
});
```

输出：

```txt
Hello
```

### 默认日志颜色与内联标签

`info`、`warn`、`error` 会自动加默认颜色。

例如：

```ts
logger.info("Done");
```

它的行为等价于：

```txt
<green>Done</green>
```

如果你想对某一条消息关闭这个自动包装：

```ts
logger.error("<yellow>manual color</yellow>", {
  colorable: false,
});
```

这样会保留你自己写的标签，同时跳过 `error` 默认的颜色包装。

### 只格式化，不直接输出

你也可以单独格式化 message：

```ts
const text = logger.format("<red>hello</red>");
process.stdout.write(text);
```

或者在格式化时移除不支持的标签：

```ts
const text = logger.format('<foo>Hello</foo>', true);
```

## API

### `new Logger(options?)`

```ts
type Options = {
  stdout?: WriteStream;
  stderr?: WriteStream;
  colorizer?: Colorizer;
  debug?: boolean;
  stripColorTags?: boolean;
  styleTagAliases?: boolean;
};
```

### `logger.write(options)`

```ts
type WriteOptions = {
  message: string;
  stderr?: boolean;
  firstPrefix?: string;
  continuationPrefix?: string;
  stripColorTags?: boolean;
};
```

### `logger.format(message, stripColorTags?)`

使用当前 colorizer 对单条 message 进行格式化。

### `logger.issue(issue)`

```ts
type Issue = {
  type: "error" | "warning" | "info";
  message: string;
};
```

### `logger.issuer`

只读 issue 视图：
- `issues`
- `hasErrors`
- `hasWarnings`

## License

MIT
