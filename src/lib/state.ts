import { formatColorTags, type Colorizer } from "./color.ts";
import type {
  CollectedIssue,
  Options,
  WriteStream,
} from "./types.ts";

export type State<T extends CollectedIssue> = {
  options: Options;
  stdout: WriteStream;
  stderr: WriteStream;
  colorizer: Colorizer | undefined;
  issues: T[];
  currentStep?: string;
  pendingStepHeader?: string;
  stepHadOutput: boolean;
};

export function createState<T extends CollectedIssue>(options: Options = {}): State<T> {
  return {
    options,
    stdout: options.stdout ?? process.stdout,
    stderr: options.stderr ?? process.stderr,
    colorizer: options.colorizer,
    issues: [],
    stepHadOutput: false,
  };
}

export function flushStepHeader<T extends CollectedIssue>(state: State<T>): void {
  if (state.pendingStepHeader) {
    // Step headers are deferred so the formatted step title and completion status
    // can stay on one line when nothing else is printed.
    state.stdout.write(`${formatColorTags({
      colorizer: state.colorizer,
      message: state.pendingStepHeader,
      stripColorTags: state.options.stripColorTags ?? false,
      styleTagAliases: state.options.styleTagAliases ?? false,
    })}\n`);
    state.pendingStepHeader = undefined;
  }
}
