import { RealOllamaClient } from "../../../clients/RealOllamaClient";
import { OllamaConnectionError, OllamaResponseError } from "../../../errors";
import { ChatRequest } from "../../../interfaces/IOllamaClient";

const baseRequest: ChatRequest = {
  model: "llama3",
  messages: [{ role: "user", content: "hello" }],
};

const validOllamaResponse = {
  model: "llama3",
  message: { role: "assistant", content: "Hi there" },
  done: true,
  prompt_eval_count: 10,
  eval_count: 20,
};

function mockFetchSuccess(body: object, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  });
}

function mockFetchNetworkError(error: Error) {
  global.fetch = jest.fn().mockRejectedValue(error);
}

describe("RealOllamaClient", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sends POST to Ollama API", async () => {
    mockFetchSuccess(validOllamaResponse);
    const client = new RealOllamaClient("http://localhost:11434");

    await client.chat(baseRequest);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:11434/api/chat",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"stream":false'),
      })
    );
  });

  it("maps Ollama response to ChatResponse", async () => {
    mockFetchSuccess(validOllamaResponse);
    const client = new RealOllamaClient("http://localhost:11434");

    const response = await client.chat(baseRequest);

    expect(response.model).toBe("llama3");
    expect(response.message.role).toBe("assistant");
    expect(response.message.content).toBe("Hi there");
    expect(response.done).toBe(true);
  });

  it("throws OllamaConnectionError on network failure", async () => {
    mockFetchNetworkError(new Error("ECONNREFUSED"));
    const client = new RealOllamaClient("http://localhost:11434");

    await expect(client.chat(baseRequest)).rejects.toThrow(OllamaConnectionError);
  });

  it("throws OllamaResponseError on non-200", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: jest.fn().mockResolvedValue("Not found"),
    });
    const client = new RealOllamaClient("http://localhost:11434");

    await expect(client.chat(baseRequest)).rejects.toThrow(OllamaResponseError);
  });

  it("throws OllamaResponseError on non-JSON response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
    });
    const client = new RealOllamaClient("http://localhost:11434");

    await expect(client.chat(baseRequest)).rejects.toThrow(OllamaResponseError);
  });

  it("respects timeout (30s default)", () => {
    const spy = jest.spyOn(AbortSignal, "timeout");
    new RealOllamaClient("http://localhost:11434");

    expect(spy).toHaveBeenCalledWith(30000);
  });

  it("sends messages array in request body", async () => {
    mockFetchSuccess(validOllamaResponse);
    const client = new RealOllamaClient("http://localhost:11434");
    const messages: ChatRequest["messages"] = [
      { role: "system", content: "You are helpful" },
      { role: "user", content: "hello" },
    ];

    await client.chat({ model: "llama3", messages });

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.messages).toEqual(messages);
  });
});
