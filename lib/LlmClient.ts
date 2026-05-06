/**
 * Tiny Ollama client. No SDK, just fetch.
 * Always non-streaming, JSON mode optional.
 */
export interface LlmGenerateOptions {
  json?: boolean;
  timeoutMs?: number;
  temperature?: number;
}

export interface LlmClientLike {
  generate(model: string, prompt: string, opts?: LlmGenerateOptions): Promise<string>;
}

export class LlmClient implements LlmClientLike {
  constructor(
    private readonly baseUrl: string = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    private readonly defaultTimeoutMs: number = parseTimeoutSeconds(process.env.LLM_TIMEOUT) * 1000,
  ) {}

  async generate(model: string, prompt: string, opts: LlmGenerateOptions = {}): Promise<string> {
    const controller = new AbortController();
    const timeoutMs = opts.timeoutMs ?? this.defaultTimeoutMs;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          format: opts.json ? 'json' : undefined,
          options: opts.temperature !== undefined ? { temperature: opts.temperature } : undefined,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Ollama returned HTTP ${res.status}`);
      }
      const body = (await res.json()) as { response?: string };
      return (body.response ?? '').trim();
    } finally {
      clearTimeout(timer);
    }
  }

  /** Fast probe: returns true if Ollama is reachable. */
  async isAlive(timeoutMs = 3000): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}

function parseTimeoutSeconds(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
}
