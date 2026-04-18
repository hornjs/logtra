import { BaseLogger } from "./base.ts";
import { Issuer } from "./issuer.ts";
import type { LiveRendererManager } from "./live.ts";
import type { State } from "./state.ts";
import type { CollectedIssue, Issue, IssueGroup } from "./types.ts";

export class StepperHandle extends BaseLogger<Issue> {
  readonly issuer: Issuer<Issue>;
  private readonly parentState: State<CollectedIssue>;
  private readonly name: string;

  constructor(
    parentState: State<CollectedIssue>,
    parentLive: LiveRendererManager,
    name: string,
  ) {
    super({}, {
      options: parentState.options,
      stdout: parentState.stdout,
      stderr: parentState.stderr,
      colorizer: parentState.colorizer,
      issues: [],
      currentStep: name,
      pendingStepHeader: (parentState.options.formatStep ?? ((stepName) => `<bold>${stepName}</bold>`))(name),
      stepHadOutput: false,
    }, parentLive);
    this.parentState = parentState;
    this.name = name;
    this.issuer = new Issuer(this.state);
  }

  override get indent(): string {
    return super.indent;
  }

  done(message = "<green>OK</green>"): void {
    const issues = [...this.issuer.issues];
    this.finishStep(this.name, message);
    if (issues.length > 0) {
      // Parent loggers collect step issues as grouped diagnostics instead of flattening them.
      const group: IssueGroup = { step: this.name, issues };
      this.parentState.issues.push(group);
    }
  }
}
