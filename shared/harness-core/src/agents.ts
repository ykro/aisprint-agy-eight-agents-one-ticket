export interface AgentTask {
  id: string;
  role: string;
  prompt: string;
  systemPrompt?: string;
  worktreeDir?: string;
  budgetTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentResult {
  taskId: string;
  success: boolean;
  output: string;
  tokensUsed: number;
  reasoning?: string;
  error?: string;
}

export interface AgentProvider {
  runAgent(task: AgentTask): Promise<AgentResult>;
}

export type MockHandlerReturn = {
  output: string;
  tokensUsed: number;
  success?: boolean;
  reasoning?: string;
};

export type MockHandler = (
  task: AgentTask,
) => Promise<MockHandlerReturn> | MockHandlerReturn;

export class MockAgentProvider implements AgentProvider {
  private readonly handler: MockHandler;

  constructor(handler: MockHandler) {
    this.handler = handler;
  }

  async runAgent(task: AgentTask): Promise<AgentResult> {
    try {
      const r = await this.handler(task);
      return {
        taskId: task.id,
        success: r.success ?? true,
        output: r.output,
        tokensUsed: r.tokensUsed,
        reasoning: r.reasoning,
      };
    } catch (err) {
      return {
        taskId: task.id,
        success: false,
        output: "",
        tokensUsed: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
