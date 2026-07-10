/**
 * A class that represents each benchmark task in Tinybench. It keeps track of the
 * results, name, the task function, the number times the task function has been executed, ...
 */
declare class Task extends EventTarget {
    /**
     * The task name
     */
    readonly name: string;
    /**
     * The result object
     */
    result: Readonly<TaskResult> | undefined;
    /**
     * The number of times the task function has been executed
     */
    runs: number;
    /**
     * The task synchronous status
     */
    private readonly async;
    /**
     * The Bench instance reference
     */
    private readonly bench;
    /**
     * The task function
     */
    private readonly fn;
    /**
     * The task function options
     */
    private readonly fnOpts;
    constructor(bench: Bench, name: string, fn: Fn, fnOpts?: FnOptions);
    addEventListener<K extends TaskEvents>(type: K, listener: TaskEventsMap[K], options?: AddEventListenerOptionsArgument): void;
    removeEventListener<K extends TaskEvents>(type: K, listener: TaskEventsMap[K], options?: RemoveEventListenerOptionsArgument): void;
    /**
     * reset the task to make the `Task.runs` a zero-value and remove the `Task.result` object property
     * @internal
     */
    reset(): void;
    /**
     * run the current task and write the results in `Task.result` object property
     * @returns the current task
     * @internal
     */
    run(): Promise<Task>;
    /**
     * run the current task and write the results in `Task.result` object property (sync version)
     * @returns the current task
     * @internal
     */
    runSync(): this;
    /**
     * warmup the current task
     * @internal
     */
    warmup(): Promise<void>;
    /**
     * warmup the current task (sync version)
     * @internal
     */
    warmupSync(): void;
    private benchmark;
    private benchmarkSync;
    /**
     * merge into the result object values
     * @param result - the task result object to merge with the current result object values
     */
    private mergeTaskResult;
    private postWarmup;
    private processRunResult;
}

/**
 * The JavaScript runtime environment.
 * @see https://runtime-keys.proposal.wintercg.org/
 */
declare enum JSRuntime {
    browser = "browser",
    bun = "bun",
    deno = "deno",
    'edge-light' = "edge-light",
    fastly = "fastly",
    hermes = "hermes",
    jsc = "jsc",
    lagon = "lagon",
    moddable = "moddable",
    netlify = "netlify",
    node = "node",
    'quickjs-ng' = "quickjs-ng",
    spidermonkey = "spidermonkey",
    v8 = "v8",
    workerd = "workerd"
}
/**
 * Converts nanoseconds to milliseconds.
 * @param ns - the nanoseconds to convert
 * @returns the milliseconds
 */
declare const nToMs: (ns: number) => number;
/**
 * Returns the current high resolution timestamp in milliseconds using `process.hrtime.bigint()`.
 * @returns the current high resolution timestamp in milliseconds
 */
declare const hrtimeNow: () => number;
declare const now: () => number;

type AddEventListenerOptionsArgument = Parameters<typeof EventTarget.prototype.addEventListener>[2];
/**
 * bench event
 */
type BenchEvent = Event & {
    error?: Error;
    task?: Task;
};
/**
 * Bench events
 */
type BenchEvents = 'abort' | 'add' | 'complete' | 'cycle' | 'error' | 'remove' | 'reset' | 'start' | 'warmup';
interface BenchEventsMap {
    abort: EventListener;
    add: EventListener;
    complete: EventListener;
    cycle: EventListener;
    error: EventListener;
    remove: EventListener;
    reset: EventListener;
    start: EventListener;
    warmup: EventListener;
}
/**
 * Both the `Task` and `Bench` objects extend the `EventTarget` object.
 * So you can attach a listeners to different types of events to each class instance
 * using the universal `addEventListener` and `removeEventListener` methods.
 */
/**
 * bench options
 */
interface BenchOptions {
    /**
     * number of times that a task should run if even the time option is finished @default 64
     */
    iterations?: number;
    /**
     * benchmark name
     */
    name?: string;
    /**
     * function to get the current timestamp in milliseconds
     */
    now?: () => number;
    /**
     * setup function to run before each benchmark task (cycle)
     */
    setup?: Hook;
    /**
     * An AbortSignal for aborting the benchmark
     */
    signal?: AbortSignal;
    /**
     * teardown function to run after each benchmark task (cycle)
     */
    teardown?: Hook;
    /**
     * Throws if a task fails @default false
     */
    throws?: boolean;
    /**
     * time needed for running a benchmark task (milliseconds) @default 1000
     */
    time?: number;
    /**
     * warmup benchmark @default true
     */
    warmup?: boolean;
    /**
     * warmup iterations @default 16
     */
    warmupIterations?: number;
    /**
     * warmup time (milliseconds) @default 250
     */
    warmupTime?: number;
}
/**
 * event listener
 */
type EventListener = (evt: BenchEvent) => void;
/**
 * the task function
 */
type Fn = () => Promise<unknown> | unknown;
/**
 * the task function options
 */
interface FnOptions {
    /**
     * An optional function that is run after all iterations of this task end
     */
    afterAll?: (this: Task) => Promise<void> | void;
    /**
     * An optional function that is run after each iteration of this task
     */
    afterEach?: (this: Task) => Promise<void> | void;
    /**
     * An optional function that is run before iterations of this task begin
     */
    beforeAll?: (this: Task) => Promise<void> | void;
    /**
     * An optional function that is run before each iteration of this task
     */
    beforeEach?: (this: Task) => Promise<void> | void;
}
type Hook = (task: Task, mode: 'run' | 'warmup') => Promise<void> | void;
type RemoveEventListenerOptionsArgument = Parameters<typeof EventTarget.prototype.removeEventListener>[2];
/**
 * the statistics object
 */
interface Statistics {
    /**
     * mean/average absolute deviation
     */
    aad: number | undefined;
    /**
     * critical value
     */
    critical: number;
    /**
     * degrees of freedom
     */
    df: number;
    /**
     * median absolute deviation
     */
    mad: number | undefined;
    /**
     * the maximum value
     */
    max: number;
    /**
     * mean/average
     */
    mean: number;
    /**
     * the minimum value
     */
    min: number;
    /**
     * margin of error
     */
    moe: number;
    /**
     * p50/median percentile
     */
    p50: number | undefined;
    /**
     * p75 percentile
     */
    p75: number | undefined;
    /**
     * p99 percentile
     */
    p99: number | undefined;
    /**
     * p995 percentile
     */
    p995: number | undefined;
    /**
     * p999 percentile
     */
    p999: number | undefined;
    /**
     * relative margin of error
     */
    rme: number;
    /**
     * samples
     */
    samples: number[];
    /**
     * standard deviation
     */
    sd: number;
    /**
     * standard error of the mean/average (a.k.a. the standard deviation of the distribution of the sample mean/average)
     */
    sem: number;
    /**
     * variance
     */
    variance: number;
}
/**
 * task events
 */
type TaskEvents = 'abort' | 'complete' | 'cycle' | 'error' | 'reset' | 'start' | 'warmup';
interface TaskEventsMap {
    abort: EventListener;
    complete: EventListener;
    cycle: EventListener;
    error: EventListener;
    reset: EventListener;
    start: EventListener;
    warmup: EventListener;
}
/**
 * the task result object
 */
interface TaskResult {
    /**
     * the latency samples critical value
     * @deprecated use `.latency.critical` instead
     */
    critical: number;
    /**
     * the latency samples degrees of freedom
     * @deprecated use `.latency.df` instead
     */
    df: number;
    /**
     * the last task error that was thrown
     */
    error?: Error;
    /**
     * the number of operations per second
     * @deprecated use `.throughput.mean` instead
     */
    hz: number;
    /**
     * the task latency statistics
     */
    latency: Statistics;
    /**
     * the maximum latency samples value
     * @deprecated use `.latency.max` instead
     */
    max: number;
    /**
     * the latency samples mean/average
     * @deprecated use `.latency.mean` instead
     */
    mean: number;
    /**
     * the minimum latency samples value
     * @deprecated use `.latency.min` instead
     */
    min: number;
    /**
     * the latency samples margin of error
     * @deprecated use `.latency.moe` instead
     */
    moe: number;
    /**
     * the latency samples p75 percentile
     * @deprecated use `.latency.p75` instead
     */
    p75: number;
    /**
     * the latency samples p99 percentile
     * @deprecated use `.latency.p99` instead
     */
    p99: number;
    /**
     * the latency samples p995 percentile
     * @deprecated use `.latency.p995` instead
     */
    p995: number;
    /**
     * the latency samples p999 percentile
     * @deprecated use `.latency.p999` instead
     */
    p999: number;
    /**
     * how long each operation takes (ms)
     */
    period: number;
    /**
     * the latency samples relative margin of error
     * @deprecated use `.latency.rme` instead
     */
    rme: number;
    /**
     * the JavaScript runtime environment
     */
    runtime: 'unknown' | JSRuntime;
    /**
     * the JavaScript runtime version
     */
    runtimeVersion: string;
    /**
     * latency samples (ms)
     * @deprecated use `.latency.samples` instead
     */
    samples: number[];
    /**
     * the latency samples standard deviation
     * @deprecated use `.latency.sd` instead
     */
    sd: number;
    /**
     * the latency standard error of the mean (a.k.a. the standard deviation of the distribution of the sample mean/average)
     * @deprecated use `.latency.sem` instead
     */
    sem: number;
    /**
     * the task throughput statistics
     */
    throughput: Statistics;
    /**
     * the time to run the task benchmark cycle (ms)
     */
    totalTime: number;
    /**
     * the latency samples variance
     * @deprecated use `.latency.variance` instead
     */
    variance: number;
}

/**
 * The Bench class keeps track of the benchmark tasks and controls them.
 */
declare class Bench extends EventTarget {
    /**
     * Executes tasks concurrently based on the specified concurrency mode.
     *
     * - When `mode` is set to `null` (default), concurrency is disabled.
     * - When `mode` is set to 'task', each task's iterations (calls of a task function) run concurrently.
     * - When `mode` is set to 'bench', different tasks within the bench run concurrently. Concurrent cycles.
     */
    concurrency: 'bench' | 'task' | null;
    /**
     * The benchmark name.
     */
    readonly name?: string;
    /**
     * The options.
     */
    readonly opts: Readonly<BenchOptions>;
    /**
     * The JavaScript runtime environment.
     */
    readonly runtime: 'unknown' | JSRuntime;
    /**
     * The JavaScript runtime version.
     */
    readonly runtimeVersion: string;
    /**
     * The maximum number of concurrent tasks to run @default Number.POSITIVE_INFINITY
     */
    threshold: number;
    /**
     * tasks results as an array
     * @returns the tasks results as an array
     */
    get results(): (Readonly<TaskResult> | undefined)[];
    /**
     * tasks as an array
     * @returns the tasks as an array
     */
    get tasks(): Task[];
    /**
     * the task map
     */
    private readonly _tasks;
    constructor(options?: BenchOptions);
    /**
     * add a benchmark task to the task map
     * @param name - the task name
     * @param fn - the task function
     * @param fnOpts - the task function options
     * @returns the Bench instance
     * @throws if the task already exists
     */
    add(name: string, fn: Fn, fnOpts?: FnOptions): this;
    addEventListener<K extends BenchEvents>(type: K, listener: BenchEventsMap[K], options?: AddEventListenerOptionsArgument): void;
    /**
     * get a task based on the task name
     * @param name - the task name
     * @returns the Task instance
     */
    getTask(name: string): Task | undefined;
    /**
     * remove a benchmark task from the task map
     * @param name - the task name
     * @returns the Bench instance
     */
    remove(name: string): this;
    removeEventListener<K extends BenchEvents>(type: K, listener: BenchEventsMap[K], options?: RemoveEventListenerOptionsArgument): void;
    /**
     * reset tasks and remove their result
     */
    reset(): void;
    /**
     * run the added tasks that were registered using the {@link add} method
     * @returns the tasks array
     */
    run(): Promise<Task[]>;
    /**
     * run the added tasks that were registered using the {@link add} method (sync version)
     * @returns the tasks array
     */
    runSync(): Task[];
    /**
     * table of the tasks results
     * @param convert - an optional callback to convert the task result to a table record
     * @returns the tasks results as an array of table records
     */
    table(convert?: (task: Task) => Record<string, number | string | undefined>): (null | Record<string, number | string | undefined>)[];
    /**
     * warmup the benchmark tasks.
     */
    private warmupTasks;
    /**
     * warmup the benchmark tasks (sync version)
     */
    private warmupTasksSync;
}

export { Bench, type BenchEvent, type BenchEvents, type BenchEventsMap, type BenchOptions, type EventListener, type Fn, type FnOptions, type Hook, JSRuntime, type Statistics, Task, type TaskEvents, type TaskEventsMap, type TaskResult, hrtimeNow, nToMs, now };
