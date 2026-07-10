import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

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
    child.on("close", (code) =>
      resolve({ code: code ?? 0, stdout, stderr }),
    );
  });
}

async function realpathSafe(p: string): Promise<string> {
  try {
    return await fs.realpath(p);
  } catch {
    return path.resolve(p);
  }
}

async function git(args: string[], cwd: string): Promise<string> {
  const r = await exec("git", args, cwd);
  if (r.code !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed (${r.code}): ${r.stderr || r.stdout}`
    );
  }
  return r.stdout.trim();
}

export class WorktreeManager {
  private readonly repoDir: string;
  private readonly worktreesRoot: string;

  constructor(repoDir: string, worktreesRoot: string) {
    this.repoDir = path.resolve(repoDir);
    this.worktreesRoot = path.resolve(worktreesRoot);
  }

  async create(name: string, baseRef = "HEAD"): Promise<string> {
    await fs.mkdir(this.worktreesRoot, { recursive: true });
    const dest = path.join(this.worktreesRoot, name);
    const branch = `wt/${name}`;
    await git(
      ["worktree", "add", "-b", branch, dest, baseRef],
      this.repoDir,
    );
    return dest;
  }

  async list(): Promise<string[]> {
    const out = await git(["worktree", "list", "--porcelain"], this.repoDir);
    const mainReal = await realpathSafe(this.repoDir);
    const paths: string[] = [];
    for (const line of out.split("\n")) {
      if (line.startsWith("worktree ")) {
        const p = line.slice("worktree ".length).trim();
        if ((await realpathSafe(p)) !== mainReal) paths.push(p);
      }
    }
    return paths;
  }

  async remove(name: string): Promise<void> {
    const dest = path.join(this.worktreesRoot, name);
    const branch = `wt/${name}`;
    await git(["worktree", "remove", "--force", dest], this.repoDir);
    try {
      await git(["branch", "-D", branch], this.repoDir);
    } catch {
      // ignore
    }
  }

  async removeAll(): Promise<void> {
    const names = await this.list();
    for (const p of names) {
      await git(["worktree", "remove", "--force", p], this.repoDir);
    }
    await git(["worktree", "prune"], this.repoDir);
  }
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(s, d);
    } else if (entry.isFile()) {
      await fs.copyFile(s, d);
    }
  }
}

export async function createSandboxRepo(
  sourceDir: string,
  destDir: string,
): Promise<string> {
  const dest = path.resolve(destDir);
  await copyDir(path.resolve(sourceDir), dest);
  await git(["init", "-b", "main"], dest);
  await git(["config", "user.email", "harness@aisprint.local"], dest);
  await git(["config", "user.name", "aisprint harness"], dest);
  await git(["add", "-A"], dest);
  await git(["commit", "-m", "initial sandbox commit"], dest);
  return dest;
}
