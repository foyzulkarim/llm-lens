import { IOllamaClient, ChatRequest, ChatResponse } from "../interfaces/IOllamaClient";
import { OllamaConnectionError, OllamaResponseError } from "../errors";

export class RealOllamaClient implements IOllamaClient {
  private baseUrl: string;
  private signal: AbortSignal;

  constructor(baseUrl: string, timeoutMs = 30000) {
    this.baseUrl = baseUrl;
    this.signal = AbortSignal.timeout(timeoutMs);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    let res: Response;

    try {
      res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, stream: false }),
        signal: this.signal,
      });
    } catch (err) {
      throw new OllamaConnectionError("Failed to connect to Ollama", err as Error);
    }

    if (!res.ok) {
      throw new OllamaResponseError(`Ollama returned status ${res.status}`);
    }

    let data: any;
    try {
      data = await res.json();
    } catch (err) {
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
