import test from "node:test";
import assert from "node:assert/strict";
import { cursor, erase } from "sisteransi";
import { Logger } from "../../src/index.ts";
import { createBufferStream, createStubColorizer } from "./_helpers.ts";

test("empty steps render a single OK line", () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();
  const logger = new Logger({
    stdout,
    stderr,
    colorizer: createStubColorizer(),
  });

  logger.step("build").done();

  assert.equal(stdout.output, "[dim:[build]] [green:OK]\n");
  assert.equal(stderr.output, "");
});

test("empty steps can customize the completion message", () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();
  const logger = new Logger({
    stdout,
    stderr,
    colorizer: createStubColorizer(),
  });

  logger.step("build").done("<yellow>SKIPPED</yellow>");

  assert.equal(stdout.output, "[dim:[build]] [yellow:SKIPPED]\n");
  assert.equal(stderr.output, "");
});

test("empty steps do not append a trailing space when completion message is empty", () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();
  const logger = new Logger({
    stdout,
    stderr,
    colorizer: createStubColorizer(),
  });

  logger.step("build").done("");

  assert.equal(stdout.output, "[dim:[build]]\n");
  assert.equal(stderr.output, "");
});

test("step issues flush the step header and are grouped on the parent issuer", () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();
  const logger = new Logger({
    stdout,
    stderr,
    colorizer: createStubColorizer(),
  });

  const step = logger.step("doctor");
  step.issue({ type: "warning", message: "needs attention" });
  step.done();

  assert.equal(stdout.output, "[dim:[doctor]]\n  [yellow:▲] needs attention\n");
  assert.equal(stderr.output, "");
  assert.deepEqual(logger.issuer.issues, [
    {
      step: "doctor",
      issues: [
        { type: "warning", message: "needs attention" },
      ],
    },
  ]);
  assert.equal(logger.issuer.hasWarnings, true);
  assert.equal(logger.issuer.hasErrors, false);
});

test("logger.error writes to stderr and tracks errors", () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();
  const logger = new Logger({
    stdout,
    stderr,
    colorizer: createStubColorizer(),
  });

  logger.issue({ type: "error", message: "broken" });

  assert.equal(stdout.output, "");
  assert.equal(stderr.output, "[red:■] broken\n");
  assert.equal(logger.issuer.hasErrors, true);
});

test("write respects stripColorTags and stderr routing", () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();
  const logger = new Logger({
    stdout,
    stderr,
    colorizer: createStubColorizer(),
  });

  logger.write({
    message: "<unknown>Hello</unknown>",
    stderr: true,
    stripColorTags: true,
  });

  assert.equal(stdout.output, "");
  assert.equal(stderr.output, "Hello\n");
});

test("logger output temporarily yields active overwrite output and then restores it", () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();
  const logger = new Logger({
    stdout,
    stderr,
    colorizer: createStubColorizer(),
  });

  const overwrite = logger.overwrite("live");
  logger.log("plain");
  overwrite.update("next");

  assert.equal(
    stdout.output,
    "live"
      + cursor.to(0) + erase.line
      + "plain\n"
      + "live"
      + cursor.to(0) + erase.line
      + "next",
  );
  assert.equal(stderr.output, "");
});

test("logger output temporarily yields active spinner output and then restores it", () => {
  const stdout = createBufferStream(true);
  const stderr = createBufferStream();
  const logger = new Logger({
    stdout,
    stderr,
    colorizer: createStubColorizer(),
  });

  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  let renderFrame = () => {};

  globalThis.setInterval = ((callback: (...args: unknown[]) => void) => {
    renderFrame = callback;
    return 1 as unknown as NodeJS.Timeout;
  }) as typeof setInterval;
  globalThis.clearInterval = (() => {}) as typeof clearInterval;

  try {
    const spinner = logger.spin("busy");
    renderFrame();
    logger.log("plain");
    spinner.done("done");

    assert.equal(
      stdout.output,
      "[cyan:⠋] busy"
        + cursor.to(0) + erase.line
        + "plain\n"
        + "[cyan:⠋] busy"
        + cursor.to(0) + erase.line
        + "[green:done]\n",
    );
    assert.equal(stderr.output, "");
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});

test("logger suspends and resumes multiple active live renderers", () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();
  const logger = new Logger({
    stdout,
    stderr,
    colorizer: createStubColorizer(),
  });

  const first = logger.overwrite("first");
  const second = logger.overwrite("second");
  logger.log("plain");
  first.update("first-next");
  second.update("second-next");

  assert.equal(
    stdout.output,
    "first"
      + cursor.to(0) + erase.line
      + "second"
      + cursor.to(0) + erase.line
      + "plain\n"
      + "second"
      + cursor.to(0) + erase.line
      + "first-next"
      + cursor.to(0) + erase.line
      + "second-next",
  );
  assert.equal(stderr.output, "");
});

test("disposing the active overwrite falls back to the previous live renderer", () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();
  const logger = new Logger({
    stdout,
    stderr,
    colorizer: createStubColorizer(),
  });

  const first = logger.overwrite("first");
  const second = logger.overwrite("second");
  second.dispose();

  assert.equal(
    stdout.output,
    "first"
      + cursor.to(0) + erase.line
      + "second"
      + cursor.to(0) + erase.line
      + "first",
  );
  assert.equal(stderr.output, "");
  first.update("first-next");
  assert.match(stdout.output, /first-next$/);
});

test("clearing the active overwrite falls back to the previous visible live renderer", () => {
  const stdout = createBufferStream();
  const stderr = createBufferStream();
  const logger = new Logger({
    stdout,
    stderr,
    colorizer: createStubColorizer(),
  });

  const first = logger.overwrite("first");
  const second = logger.overwrite("second");
  second.clear();

  assert.equal(
    stdout.output,
    "first"
      + cursor.to(0) + erase.line
      + "second"
      + cursor.to(0) + erase.line
      + "first",
  );
  assert.equal(stderr.output, "");
  first.update("first-next");
  assert.match(stdout.output, /first-next$/);
});
