export interface Settled<T> {
  label?: string;
  value?: T;
  error?: unknown;
}

interface Job<T> {
  fn: () => Promise<T>;
  label?: string;
}

export class AsyncTaskQueue<T> {
  private readonly concurrency: number;
  private readonly pending: Job<T>[] = [];
  private running = 0;
  private readonly results: Array<Settled<T>> = [];
  private readonly listeners: Array<(s: Settled<T>) => void> = [];
  private added = 0;
  private settledCount = 0;
  private drainResolvers: Array<() => void> = [];

  constructor(concurrency: number) {
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new RangeError("concurrency must be a positive integer");
    }
    this.concurrency = concurrency;
  }

  add(fn: () => Promise<T>, label?: string): void {
    this.added += 1;
    this.pending.push({ fn, label });
    this.pump();
  }

  onSettle(cb: (s: Settled<T>) => void): void {
    this.listeners.push(cb);
  }

  private pump(): void {
    while (this.running < this.concurrency && this.pending.length > 0) {
      const job = this.pending.shift()!;
      this.running += 1;
      void this.run(job);
    }
  }

  private async run(job: Job<T>): Promise<void> {
    let settled: Settled<T>;
    try {
      const value = await job.fn();
      settled = { label: job.label, value };
    } catch (error) {
      settled = { label: job.label, error };
    }
    this.running -= 1;
    this.settledCount += 1;
    this.results.push(settled);
    for (const l of this.listeners) l(settled);
    this.pump();
    this.maybeResolveDrain();
  }

  private maybeResolveDrain(): void {
    if (
      this.settledCount >= this.added &&
      this.running === 0 &&
      this.pending.length === 0
    ) {
      const resolvers = this.drainResolvers;
      this.drainResolvers = [];
      for (const r of resolvers) r();
    }
  }

  drain(): Promise<Array<Settled<T>>> {
    return new Promise((resolve) => {
      const check = () => resolve([...this.results]);
      if (
        this.settledCount >= this.added &&
        this.running === 0 &&
        this.pending.length === 0
      ) {
        check();
      } else {
        this.drainResolvers.push(check);
      }
    });
  }
}
