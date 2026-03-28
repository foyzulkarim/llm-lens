import { IOllamaClient, ChatRequest, ChatResponse } from "../interfaces/IOllamaClient";

interface MockOllamaClientOptions {
  completionTokens?: number;
  latencyMs?: number;
}

export class MockOllamaClient implements IOllamaClient {
  private completionTokens: number;
  private latencyMs: number;

  constructor(options: MockOllamaClientOptions = {}) {
    this.completionTokens = options.completionTokens ?? 20;
    this.latencyMs = options.latencyMs ?? 50;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (request.model === "error-model") {
      throw new Error("Mock error for error-model");
    }

    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));

    const promptTokens = Math.floor(
      request.messages.reduce((sum, m) => sum + m.content.length, 0) / 4
    );
    const totalTokens = promptTokens + this.completionTokens;

    return {
      model: request.model,
      message: {
        role: "assistant",
        content: `Mock response from ${request.model}`,
      },
      done: true,
      promptEvalCount: promptTokens,
      evalCount: this.completionTokens,
    };
  }
}
