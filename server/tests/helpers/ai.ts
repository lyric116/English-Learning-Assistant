export const TEST_AI_CONFIG = {
  apiKey: 'sk-test-route-key',
  baseUrl: 'https://mock-ai.example/v1',
  model: 'mock-chat',
};

export function chatCompletionResponse(content: string, status = 200): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export function mockAiJson(payload: unknown): () => void {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => chatCompletionResponse(JSON.stringify(payload))) as typeof fetch;

  return () => {
    globalThis.fetch = previousFetch;
  };
}

