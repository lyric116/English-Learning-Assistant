import test from 'node:test';
import assert from 'node:assert/strict';

process.env.AI_FALLBACK_PROVIDERS = JSON.stringify([
  {
    name: 'fallback-one',
    baseUrl: 'https://fallback-ai.example/v1',
    apiKey: 'sk-fallback',
    model: 'fallback-model',
    dailyQuota: 10,
  },
]);
process.env.ALLOW_PRIVATE_AI_HOSTS = '0';

const previousFetch = globalThis.fetch;
const serviceModule = await import('../../dist/services/ai-service.js');
const serviceExports = serviceModule.default?.testConnection ? serviceModule.default : serviceModule;
const { testConnection } = serviceExports;

test('provider fallback switches to fallback provider after primary failure', async () => {
  const requestedUrls: string[] = [];

  globalThis.fetch = (async (url: RequestInfo | URL) => {
    requestedUrls.push(String(url));
    if (String(url).includes('primary-ai.example')) {
      return new Response(JSON.stringify({ error: { message: 'primary down' } }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const result = await testConnection({
      apiKey: 'sk-primary',
      baseUrl: 'https://primary-ai.example/v1',
      model: 'primary-model',
    });

    assert.equal(result.success, true);
    assert.equal(result.model, 'fallback-model');
    assert.equal(requestedUrls.length, 2);
    assert.match(requestedUrls[0] || '', /primary-ai\.example/);
    assert.match(requestedUrls[1] || '', /fallback-ai\.example/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('provider policy rejects private base URLs when private hosts are disabled', async () => {
  await assert.rejects(
    () => testConnection({
      apiKey: 'sk-test',
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: 'local-model',
    }),
    /Base URL 不允许访问本地或内网地址/,
  );
});

test('provider policy rejects credentials embedded in Base URL', async () => {
  await assert.rejects(
    () => testConnection({
      apiKey: 'sk-test',
      baseUrl: 'https://user:pass@api.example.com/v1',
      model: 'model',
    }),
    /Base URL 不允许包含认证信息/,
  );
});
