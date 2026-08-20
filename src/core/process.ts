import { execFile, spawn } from "node:child_process";
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

export function runFileInput(
  file: string,
  args: string[],
  input: string,
  options: { cwd?: string; timeout?: number; env?: NodeJS.ProcessEnv; maxBuffer?: number } = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { cwd: options.cwd, env: options.env ?? process.env, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const maxBuffer = options.maxBuffer ?? 20 * 1024 * 1024;
    const timeout = setTimeout(() => { child.kill("SIGTERM"); reject(new Error("process_timeout")); }, options.timeout ?? 60_000);
    const append = (current: string, chunk: Buffer): string => {
      const next = current + chunk.toString("utf8");
      if (Buffer.byteLength(next) > maxBuffer) throw new Error("process_output_limit");
      return next;
    };
    child.stdout.on("data", (chunk: Buffer) => { try { stdout = append(stdout, chunk); } catch (error) { child.kill("SIGTERM"); reject(error); } });
    child.stderr.on("data", (chunk: Buffer) => { try { stderr = append(stderr, chunk); } catch (error) { child.kill("SIGTERM"); reject(error); } });
    child.on("error", (error) => { clearTimeout(timeout); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`process_exit_${code ?? "unknown"}`));
    });
    child.stdin.end(input);
  });
}
