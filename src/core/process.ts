import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runFile(
  file: string,
  args: string[],
  options: { cwd?: string; timeout?: number; env?: NodeJS.ProcessEnv } = {}
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync(file, args, {
    cwd: options.cwd,
    timeout: options.timeout ?? 60_000,
    maxBuffer: 20 * 1024 * 1024,
    env: options.env ?? process.env
  });
  return { stdout: result.stdout, stderr: result.stderr };
}
