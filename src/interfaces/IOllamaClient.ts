export interface ChatRequest {
  model: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  stream?: boolean;
}

export interface ChatResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  promptEvalCount?: number;
  evalCount?: number;
}

export interface IOllamaClient {
  chat(request: ChatRequest): Promise<ChatResponse>;
}
