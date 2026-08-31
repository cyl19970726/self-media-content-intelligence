import { ProxyAgent, fetch as undiciFetch } from "undici";

export type RedFoxFetch = typeof fetch;

export type RedFoxErrorKind = "configuration" | "authentication" | "rate_limit" | "unavailable" | "invalid_response";

export class RedFoxError extends Error {
  constructor(readonly kind: RedFoxErrorKind, message: string, readonly status: number | null = null) {
    super(message);
    this.name = "RedFoxError";
  }
}

export type RedFoxClientOptions = {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: RedFoxFetch;
};

export function resolveRedFoxProxyUrl(environment: NodeJS.ProcessEnv = process.env): string | null {
  return environment.HTTPS_PROXY
    ?? environment.https_proxy
    ?? environment.HTTP_PROXY
    ?? environment.http_proxy
    ?? null;
}

export class RedFoxClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: RedFoxFetch;
  private readonly proxyAgent: ProxyAgent | null;
  private usage = new Map<string, number>();

  constructor(options: RedFoxClientOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.REDFOX_API_KEY ?? "";
    this.baseUrl = (options.baseUrl ?? process.env.REDFOX_BASE_URL ?? "https://redfox.hk").replace(/\/+$/, "");
    const configuredTimeout = options.timeoutMs ?? Number(process.env.REDFOX_REQUEST_TIMEOUT_MS ?? "60000");
    this.timeoutMs = Number.isFinite(configuredTimeout) ? Math.max(1_000, Math.trunc(configuredTimeout)) : 60_000;
    const proxyUrl = resolveRedFoxProxyUrl();
    this.proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : null;
    this.fetchImpl = options.fetchImpl ?? (async (input, init) => {
      const requestInit = {
        ...init,
        dispatcher: this.proxyAgent ?? undefined
      } as unknown as Parameters<typeof undiciFetch>[1];
      const response = await undiciFetch(input instanceof Request ? input.url : input, requestInit);
      return response as unknown as Response;
    });
  }

  requestCount(): number {
    return [...this.usage.values()].reduce((sum, value) => sum + value, 0);
  }

  usageSnapshot(): Record<string, number> {
    return Object.fromEntries(this.usage);
  }

  async post(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
    if (!this.apiKey) throw new RedFoxError("configuration", "红狐 API 尚未配置；请在本机 .env 设置 REDFOX_API_KEY。");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", REDFOX_API_KEY: this.apiKey },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      throw new RedFoxError("unavailable", timedOut ? "红狐请求超过时间预算。" : "红狐服务当前不可连接。");
    } finally {
      clearTimeout(timer);
    }
    if (response.status === 401 || response.status === 403) {
      throw new RedFoxError("authentication", "红狐凭证无效或当前账户无权调用此接口。", response.status);
    }
    if (response.status === 429) throw new RedFoxError("rate_limit", "红狐接口达到调用频率限制。", response.status);
    if (!response.ok) throw new RedFoxError("unavailable", `红狐接口返回 HTTP ${response.status}。`, response.status);
    let value: unknown;
    try {
      value = await response.json();
    } catch {
      throw new RedFoxError("invalid_response", "红狐接口返回了无法解析的 JSON。", response.status);
    }
    if (isRecord(value) && typeof value.code === "number" && ![0, 200, 2000].includes(value.code)) {
      const message = typeof value.msg === "string" ? value.msg : "红狐接口返回业务错误。";
      if (/key|鉴权|凭证|权限|余额/i.test(message)) throw new RedFoxError("authentication", message, response.status);
      if (/频率|限流|rate/i.test(message)) throw new RedFoxError("rate_limit", message, response.status);
      throw new RedFoxError("unavailable", message, response.status);
    }
    this.usage.set(endpoint, (this.usage.get(endpoint) ?? 0) + 1);
    return value;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function unwrapRedFoxData(value: unknown): unknown {
  return isRecord(value) && "data" in value ? value.data : value;
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function asNonnegativeInteger(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : null;
}

export function recordArray(value: unknown, keys: string[] = []): Array<Record<string, unknown>> {
  const unwrapped = unwrapRedFoxData(value);
  if (Array.isArray(unwrapped)) return unwrapped.filter(isRecord);
  if (!isRecord(unwrapped)) return [];
  for (const key of keys) {
    const candidate = unwrapped[key];
    if (Array.isArray(candidate)) return candidate.filter(isRecord);
  }
  return [];
}

export function firstRecord(value: unknown, keys: string[] = []): Record<string, unknown> | null {
  const unwrapped = unwrapRedFoxData(value);
  if (isRecord(unwrapped)) {
    for (const key of keys) {
      const candidate = unwrapped[key];
      if (isRecord(candidate)) return candidate;
      if (Array.isArray(candidate)) return candidate.find(isRecord) ?? null;
    }
    return unwrapped;
  }
  return Array.isArray(unwrapped) ? unwrapped.find(isRecord) ?? null : null;
}
