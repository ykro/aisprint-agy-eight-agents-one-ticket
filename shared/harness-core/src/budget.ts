import type { AgentProvider, AgentTask, AgentResult } from "./agents.js";

export class TokenMeter {
  private readonly budget: number;
  private _total = 0;

  constructor(budget: number) {
    if (!Number.isFinite(budget) || budget < 0) {
      throw new RangeError("budget must be a non-negative number");
    }
    this.budget = budget;
  }

  add(tokens: number): void {
    if (!Number.isFinite(tokens) || tokens < 0) {
      throw new RangeError("tokens must be a non-negative number");
    }
    this._total += tokens;
  }

  get total(): number {
    return this._total;
  }

  get remaining(): number {
    return this.budget - this._total;
  }

  get exceeded(): boolean {
    return this._total > this.budget;
  }
}

export class BudgetExceededError extends Error {
  constructor(message = "token budget exceeded") {
    super(message);
    this.name = "BudgetExceededError";
  }
}

export function withBudget(
  provider: AgentProvider,
  meter: TokenMeter,
): AgentProvider {
  return {
    async runAgent(task: AgentTask): Promise<AgentResult> {
      const result = await provider.runAgent(task);
      meter.add(result.tokensUsed);
      if (meter.exceeded) {
        throw new BudgetExceededError(
          `token budget exceeded: used ${meter.total}`
        );
      }
      return result;
    },
  };
}
