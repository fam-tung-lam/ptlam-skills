import { spawnSync } from "node:child_process";

export interface CommandOptions {
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
}

export interface CommandResult {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface CommandRunner {
  run(
    command: string,
    args: readonly string[],
    options?: CommandOptions,
  ): CommandResult;
}

/** Execute child processes without a shell so arguments retain literal meaning. */
export class SystemCommandRunner implements CommandRunner {
  run(
    command: string,
    args: readonly string[],
    options: CommandOptions = {},
  ): CommandResult {
    const result = spawnSync(command, args, {
      cwd: options.cwd,
      encoding: "utf8",
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.error) throw result.error;
    return Object.freeze({
      status: result.status ?? 1,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  }
}

/** Execute a text command and surface its best available diagnostic on failure. */
export function requireCommand(
  runner: CommandRunner,
  command: string,
  args: readonly string[],
  options?: CommandOptions,
): string {
  const result = runner.run(command, args, options);
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim();
    throw new Error(
      detail
        ? `${command} ${args.join(" ")} failed: ${detail}`
        : `${command} ${args.join(" ")} failed with status ${result.status}`,
    );
  }
  return result.stdout.trim();
}

/** Execute an archive-producing command without decoding its stdout bytes. */
export function requireBinaryCommand(
  command: string,
  args: readonly string[],
  options: CommandOptions = {},
): Buffer {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "buffer",
    env: options.env,
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = result.stderr.toString("utf8").trim();
    throw new Error(
      detail
        ? `${command} ${args.join(" ")} failed: ${detail}`
        : `${command} ${args.join(" ")} failed with status ${result.status}`,
    );
  }
  return result.stdout;
}
