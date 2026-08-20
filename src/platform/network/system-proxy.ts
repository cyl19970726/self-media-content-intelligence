import { runFile } from "../../core/process.js";

export async function systemHttpsProxy(): Promise<string | null> {
  try {
    const { stdout } = await runFile("scutil", ["--proxy"], { timeout: 5_000 });
    const enabled = /HTTPSEnable\s*:\s*1/.test(stdout);
    const host = stdout.match(/HTTPSProxy\s*:\s*([^\s]+)/)?.[1];
    const port = stdout.match(/HTTPSPort\s*:\s*(\d+)/)?.[1];
    if (!enabled || !host || !port || !/^\d+$/.test(port)) return null;
    return `http://${host}:${port}`;
  } catch { return null; }
}

export async function withSystemProxy(environment: NodeJS.ProcessEnv = process.env): Promise<NodeJS.ProcessEnv> {
  if (environment.HTTPS_PROXY || environment.https_proxy) return { ...environment };
  const proxy = await systemHttpsProxy();
  return proxy ? { ...environment, HTTP_PROXY: proxy, HTTPS_PROXY: proxy, ALL_PROXY: proxy } : { ...environment };
}
