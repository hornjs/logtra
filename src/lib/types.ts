import type { Colorizer } from "./color.ts";

export type StepFormatter = (name: string) => string;

export type Issue = {
  type: "error" | "warning" | "info";
  message: string;
};

export type IssueGroup = {
  step: string;
  issues: Issue[];
};

export type LogLevel = "error" | "warning" | "info";
export type CollectedIssue = Issue | IssueGroup;
export type WriteStream = Pick<NodeJS.WriteStream, "write"> & Partial<Pick<NodeJS.WriteStream, "isTTY">>;

export type Options = {
  stdout?: WriteStream;
  stderr?: WriteStream;
  colorizer?: Colorizer;
  debug?: boolean;
  stripColorTags?: boolean;
  styleTagAliases?: boolean;
  formatStep?: StepFormatter;
};
