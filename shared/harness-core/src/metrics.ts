import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { Project, SyntaxKind, type Node } from "ts-morph";
import { Bench } from "tinybench";

const require = createRequire(import.meta.url);

export interface LaneMetrics {
  testPassRate: number;
  diffLines: number;
  complexity: number;
  benchMedianMs: number;
}

interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

function exec(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });
}

export async function diffLines(
  worktreeDir: string,
  baseRef?: string,
): Promise<number> {
  const args = ["diff", "--numstat"];
  if (baseRef) args.push(baseRef);
  const r = await exec("git", args, path.resolve(worktreeDir));
  if (r.code !== 0) {
    throw new Error(`git diff failed: ${r.stderr || r.stdout}`);
  }
  let total = 0;
  for (const line of r.stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    const added = Number(parts[0]);
    const removed = Number(parts[1]);
    if (Number.isFinite(added)) total += added;
    if (Number.isFinite(removed)) total += removed;
  }
  return total;
}

const DECISION_KINDS = new Set<SyntaxKind>([
  SyntaxKind.IfStatement,
  SyntaxKind.ForStatement,
  SyntaxKind.ForInStatement,
  SyntaxKind.ForOfStatement,
  SyntaxKind.WhileStatement,
  SyntaxKind.DoStatement,
  SyntaxKind.CaseClause,
  SyntaxKind.CatchClause,
  SyntaxKind.ConditionalExpression,
]);

const FUNCTION_KINDS = new Set<SyntaxKind>([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.FunctionExpression,
  SyntaxKind.ArrowFunction,
  SyntaxKind.MethodDeclaration,
  SyntaxKind.Constructor,
  SyntaxKind.GetAccessor,
  SyntaxKind.SetAccessor,
]);

function countDecisionPoints(fn: Node): number {
  let count = 0;
  fn.forEachDescendant((node) => {
    const kind = node.getKind();
    if (DECISION_KINDS.has(kind)) {
      count += 1;
    } else if (kind === SyntaxKind.BinaryExpression) {
      const op = node
        .asKindOrThrow(SyntaxKind.BinaryExpression)
        .getOperatorToken()
        .getKind();
      if (
        op === SyntaxKind.AmpersandAmpersandToken ||
        op === SyntaxKind.BarBarToken ||
        op === SyntaxKind.QuestionQuestionToken
      ) {
        count += 1;
      }
    }
  });
  return count;
}

export function complexity(files: string[]): number {
  const project = new Project({
    useInMemoryFileSystem: false,
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: true },
  });
  let total = 0;
  for (const file of files) {
    const source = project.addSourceFileAtPath(path.resolve(file));
    source.forEachDescendant((node) => {
      if (FUNCTION_KINDS.has(node.getKind())) {
        total += 1 + countDecisionPoints(node);
      }
    });
  }
  return total;
}

export interface VitestSummary {
  passed: number;
  failed: number;
  total: number;
  passRate: number;
}

export async function runVitest(dir: string): Promise<VitestSummary> {
  const vitestPkg = require.resolve("vitest/package.json");
  const vitestBin = path.join(path.dirname(vitestPkg), "vitest.mjs");
  const r = await exec(
    process.execPath,
    [vitestBin, "run", "--reporter=json", "--passWithNoTests"],
    path.resolve(dir),
  );

  const parsed = extractJson(r.stdout);
  if (!parsed) {
    if (r.code === 0) {
      return { passed: 0, failed: 0, total: 0, passRate: 1 };
    }
    throw new Error(`vitest run failed: ${r.stderr || r.stdout}`);
  }

  const total =
    typeof parsed.numTotalTests === "number" ? parsed.numTotalTests : 0;
  const passed =
    typeof parsed.numPassedTests === "number" ? parsed.numPassedTests : 0;
  const failed =
    typeof parsed.numFailedTests === "number" ? parsed.numFailedTests : 0;
  const passRate = total === 0 ? 1 : passed / total;
  return { passed, failed, total, passRate };
}

interface VitestJson {
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
}

function extractJson(stdout: string): VitestJson | undefined {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return undefined;
  try {
    return JSON.parse(stdout.slice(start, end + 1)) as VitestJson;
  } catch {
    return undefined;
  }
}

export async function benchmarkMedianMs(fn: () => void): Promise<number> {
  const bench = new Bench({ time: 50, iterations: 10 });
  bench.add("target", fn);
  await bench.run();
  const task = bench.tasks[0];
  const latency = task?.result?.latency as
    | { p50?: number; mean?: number; median?: number }
    | undefined;
  if (latency) {
    if (typeof latency.p50 === "number") return latency.p50;
    if (typeof latency.median === "number") return latency.median;
    if (typeof latency.mean === "number") return latency.mean;
  }
  return 0;
}
