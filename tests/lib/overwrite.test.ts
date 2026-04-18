import test from "node:test";
import assert from "node:assert/strict";
import { cursor, erase } from "sisteransi";
import { OverwriteHandle } from "../../src/index.ts";
import { createBufferStream, createStubColorizer } from "./_helpers.ts";

test("overwrite rewrites previously rendered multiline content", () => {
  const stream = createBufferStream();
  const overwrite = new OverwriteHandle({
    stream,
    colorizer: createStubColorizer(),
    firstPrefix: "> ",
    continuationPrefix: "| ",
  });

  overwrite.update("<green>first</green>\n<yellow>second</yellow>");
  overwrite.update("<red>next</red>");

  assert.equal(
    stream.output,
    "> [green:first]\n| [yellow:second]"
      + cursor.to(0) + erase.line
      + cursor.up(1)
      + cursor.to(0) + erase.line
      + "> [red:next]",
  );
});

test("overwrite clear removes the last rendered block", () => {
  const stream = createBufferStream();
  const overwrite = new OverwriteHandle({
    stream,
    firstPrefix: "> ",
  });

  overwrite.update("one\ntwo");
  overwrite.clear();

  assert.equal(
    stream.output,
    "> one\n> two"
      + cursor.to(0) + erase.line
      + cursor.up(1)
      + cursor.to(0) + erase.line,
  );
});

test("overwrite dispose clears the live block and ignores further updates", () => {
  const stream = createBufferStream();
  const overwrite = new OverwriteHandle({
    stream,
    firstPrefix: "> ",
  });

  overwrite.update("one");
  overwrite.dispose();
  overwrite.update("two");

  assert.equal(
    stream.output,
    "> one"
      + cursor.to(0) + erase.line,
  );
});
