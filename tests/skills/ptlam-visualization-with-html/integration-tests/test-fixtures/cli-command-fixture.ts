import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { onTestFinished } from "vitest";

export interface CommandOutputCapture {
  readonly stdout: string[];
  readonly stderr: string[];
  readonly options: {
    readonly stdout: (message: string) => void;
    readonly stderr: (message: string) => void;
  };
}

export function outputCapture(): CommandOutputCapture {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    options: {
      stdout: (message) => stdout.push(message),
      stderr: (message) => stderr.push(message),
    },
  };
}

export interface ProcessResult {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

export async function runTypeScriptProcess(
  script: string,
  args: readonly string[],
  cwd: string,
): Promise<ProcessResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--experimental-strip-types", script, ...args],
      { cwd, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (exitCode) => resolve({ exitCode, stdout, stderr }));
  });
}

export async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ptlam-html-cli-"));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
