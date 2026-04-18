# logtra

[中文](README.zh-CN.md)

`logtra` is a small CLI logging library for structured terminal output.

It focuses on:
- plain logs: `log`, `info`, `warn`, `error`, `debug`
- structured diagnostics: `issue`, `step`, `issuer`
- live terminal output: `overwrite`, `spin`
- lightweight message color tags

## Install

```bash
pnpm add logtra picocolors
```

`logtra` does not force a specific color backend. You pass a `Colorizer` implementation through `Options.colorizer`.

## Quick Start

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

## Color Backend

`logtra` uses a small `Colorizer` interface internally:

```ts
type Colorizer = {
  wrap: (name: string, input: string | number | null | undefined) => string;
  is: (name: string) => boolean;
};
```

Adapters are provided for several libraries:

```ts
import { createPico } from "logtra/picocolors";
import { createChalk } from "logtra/chalk";
import { createColorette } from "logtra/colorette";
import { createAnsiColors } from "logtra/ansi-colors";
import { createAnsiStyles } from "logtra/ansi-styles";
import { createYocto } from "logtra/yoctocolors";
```

## Basic Usage

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

### Issue And Step

```ts
const step = logger.step("Config");

step.issue({ type: "info", message: "Loaded config file" });
step.issue({ type: "warning", message: "Unused field: <yellow>foo</yellow>" });
step.done();

if (logger.issuer.hasWarnings) {
  logger.warn("Doctor finished with warnings");
}
```

If a step finishes without any output, `done()` renders a single completion line:

```ts
step.done(); // <bold>Config</bold> <green>OK</green>
step.done("<yellow>SKIPPED</yellow>");
```

You can customize the rendered step title with `formatStep`:

```ts
const logger = new Logger({
  colorizer: createPico(true),
  formatStep: (name) => `> ${name}:`,
});

logger.step("Config").done(); // > Config: <green>OK</green>
```

`done(message?)` accepts full message markup, not just plain text.

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

`done()` and `fail()` stop the active spinner first. In TTY mode they also clear the previously rendered spinner output before writing the final stable message.

### Live Output Coordination

`overwrite()` and `spin()` are both built on top of the same live renderer model.

Use `dispose()` when an overwrite block is finished and should leave the live-output manager entirely:

```ts
const overwrite = logger.overwrite("Starting...");
overwrite.dispose();
```

- the most recently updated live renderer becomes visible
- stable logger output such as `log()`, `info()`, `warn()`, `error()`, and `issue()` temporarily suspends the current live renderer and restores it afterwards
- when an active live renderer is disposed or completed, the manager falls back to the previous live renderer that is still alive

This means you do not need to manually stop a spinner before writing normal logger output. The logger coordinates that transition automatically.

## Message Color Tags

`logtra` supports lightweight inline color tags inside messages.

This means you can write:

```ts
logger.log("<cyan>hello</cyan>");
logger.warn("Use <yellow>--force</yellow> with care");
```

and let the current `Colorizer` render the final terminal styles.

### Why tags exist

Tags keep log messages backend-agnostic.

Your message can stay the same while the actual rendering backend changes between:
- `picocolors`
- `chalk`
- `colorette`
- `ansi-colors`
- `ansi-styles`
- `yoctocolors`

### Basic syntax

A simple tag looks like this:

```txt
<red>Hello</red>
```

Nested tags are supported:

```txt
<red>Error: <bold>failed</bold></red>
```

If the current color backend supports both tags, both styles are applied.

### Supported tag names

Supported tag names depend on the current `Colorizer`.

Common names usually include:
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
- background variants such as `bgRed`

When `Options.styleTagAliases` is enabled, these HTML-like aliases are also supported:
- `<b>` / `<strong>` -> `bold`
- `<i>` / `<em>` -> `italic`
- `<u>` -> `underline`
- `<s>` / `<del>` -> `strikethrough`
- `<span ...>` -> attribute-only style container

If a tag name is not supported by the current backend:
- it is kept as raw text by default
- or removed when `stripColorTags` is enabled

### Attribute syntax

`logtra` also supports a small attribute-based syntax.

Examples:

```txt
<span color="red">Hello</span>
<span bold>Bold text</span>
<span underline color="cyan">Link</span>
```

Supported attributes currently map to style names:
- `bold`
- `italic`
- `inverse`
- `underline`
- `strikethrough`
- `color="..."`

For example:

```ts
logger.log('<span bold color="yellow">Warning</span>');
```

works like applying `bold` and `yellow` in sequence.

`color="..."` can also contain multiple whitespace-separated style tokens:

```ts
logger.log('<span color="cyan bold">Link</span>');
logger.log('<span color="yellow underline">Warning</span>');
```

Each token is checked independently against the current `Colorizer`. Supported tokens are applied in sequence, and unknown tokens are ignored.

Attribute-only tags and HTML-like aliases are disabled by default. Enable them explicitly:

```ts
const logger = new Logger({
  colorizer: createPico(true),
  styleTagAliases: true,
});
```

Then these become valid:

```ts
logger.log("<b>Bold</b>");
logger.log("<u>Underline</u>");
logger.log('<span underline color="cyan">Link</span>');
```

### Unknown tags

By default, unknown tags are preserved:

```ts
logger.log("<foo>hello</foo>");
```

If `foo` is not supported by the current backend, the original markup remains visible.

This is intentional. It prevents accidental data loss when:
- a message contains unsupported tags
- color output is disabled
- a backend exposes fewer styles than another backend

### `stripColorTags`

`stripColorTags` controls what happens when tags cannot be rendered.

When `stripColorTags` is `false`:
- unsupported tags stay in the output

When `stripColorTags` is `true`:
- unsupported tags are removed
- only the inner text remains

Example:

```ts
logger.write({
  message: "<foo>Hello</foo>",
  stripColorTags: true,
});
```

Output:

```txt
Hello
```

### Default log coloring vs inline tags

`info`, `warn`, and `error` apply default colors automatically.

For example:

```ts
logger.info("Done");
```

behaves like:

```txt
<green>Done</green>
```

If you want to disable that automatic wrapping for one message:

```ts
logger.error("<yellow>manual color</yellow>", {
  colorable: false,
});
```

This keeps your inline tags intact and skips the default `error` color.

### Formatting without writing

You can also format tags directly:

```ts
const text = logger.format("<red>hello</red>");
process.stdout.write(text);
```

Or strip unsupported tags while formatting:

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

Formats one message string with the current colorizer.

### `logger.issue(issue)`

```ts
type Issue = {
  type: "error" | "warning" | "info";
  message: string;
};
```

### `logger.issuer`

Read-only issue view:
- `issues`
- `hasErrors`
- `hasWarnings`

## License

MIT
