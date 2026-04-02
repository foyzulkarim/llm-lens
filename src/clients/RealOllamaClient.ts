import { IOllamaClient, ChatRequest, ChatResponse } from "../interfaces/IOllamaClient";
import { OllamaConnectionError, OllamaResponseError } from "../errors";

interface OllamaChatResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class RealOllamaClient implements IOllamaClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl: string, timeoutMs = 30000) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    let res: Response;

    try {
      res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, stream: false }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: unknown) {
      const cause = err instanceof Error ? err : new Error(String(err));
      throw new OllamaConnectionError("Failed to connect to Ollama", cause);
    }

    if (!res.ok) {
      throw new OllamaResponseError(`Ollama returned status ${res.status}`);
    }

    let data: OllamaChatResponse;
    try {
      data = (await res.json()) as OllamaChatResponse;
    } catch (_err) {
      throw new OllamaResponseError("Ollama returned non-JSON response");
    }

    return {
      model: data.model,
      message: data.message,
      done: data.done,
      promptEvalCount: data.prompt_eval_count,
      evalCount: data.eval_count,
    };
  }
}
