import { spawn } from "node:child_process";

export class ProcessError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ProcessError";
    this.details = details;
  }
}

export const runProcess = (
  command,
  args,
  { cwd, env = process.env, timeoutMs = 300_000, onStderr } = {},
) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      onStderr?.(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new ProcessError(`failed to start ${command}: ${error.message}`));
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(
          new ProcessError(`${command} timed out after ${timeoutMs}ms`, {
            code,
            signal,
            stderr,
            stdout,
          }),
        );
      } else if (code !== 0) {
        reject(
          new ProcessError(`${command} exited with code ${code}`, {
            code,
            signal,
            stderr,
            stdout,
          }),
        );
      } else {
        resolve({ code, stderr, stdout });
      }
    });
  });
