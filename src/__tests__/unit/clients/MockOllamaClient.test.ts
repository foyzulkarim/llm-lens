import { MockOllamaClient } from "../../../clients/MockOllamaClient";
import { ChatRequest } from "../../../interfaces/IOllamaClient";

const baseRequest: ChatRequest = {
  model: "llama3",
  messages: [{ role: "user", content: "hello" }],
};

describe("MockOllamaClient", () => {
  it("returns assistant response with model name", async () => {
    const client = new MockOllamaClient();

    const response = await client.chat({ ...baseRequest, model: "llama3" });

    expect(response.message.role).toBe("assistant");
    expect(response.message.content).toContain("llama3");
  });

  it("calculates prompt tokens from message lengths", async () => {
    const client = new MockOllamaClient();
    const messages: ChatRequest["messages"] = [{ role: "user", content: "a".repeat(100) }];

    const response = await client.chat({ model: "llama3", messages });

    expect(response.promptEvalCount).toBe(25);
  });

  it("uses default completion tokens", async () => {
    const client = new MockOllamaClient();

    const response = await client.chat(baseRequest);

    expect(response.evalCount).toBe(20);
  });

  it("allows configurable completion tokens", async () => {
    const client = new MockOllamaClient({ completionTokens: 50 });

    const response = await client.chat(baseRequest);

    expect(response.evalCount).toBe(50);
  });

  it("simulates latency", async () => {
    const client = new MockOllamaClient();
    const start = Date.now();

    await client.chat(baseRequest);

    expect(Date.now() - start).toBeGreaterThanOrEqual(50);
  });

  it("allows configurable latency", async () => {
    const client = new MockOllamaClient({ latencyMs: 100 });
    const start = Date.now();

    await client.chat(baseRequest);

    expect(Date.now() - start).toBeGreaterThanOrEqual(100);
  });

  it("calculates totalTokens", async () => {
    const client = new MockOllamaClient({ completionTokens: 20 });
    const messages: ChatRequest["messages"] = [{ role: "user", content: "a".repeat(80) }];

    const response = await client.chat({ model: "llama3", messages });

    const expectedPrompt = Math.floor(80 / 4);
    expect(response.promptEvalCount! + response.evalCount!).toBe(expectedPrompt + 20);
  });

  it("throws error for error-model", async () => {
    const client = new MockOllamaClient();

    await expect(client.chat({ ...baseRequest, model: "error-model" })).rejects.toThrow();
  });

  it("returns correct model in response", async () => {
    const client = new MockOllamaClient();

    const response = await client.chat({ ...baseRequest, model: "mistral" });

    expect(response.model).toBe("mistral");
  });
});
