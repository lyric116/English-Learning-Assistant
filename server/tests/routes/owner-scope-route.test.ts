import test, { after } from 'node:test';
import assert from 'node:assert/strict';

import { createTestHttpClient } from '../helpers/http.ts';

const client = await createTestHttpClient('route-owner-scope');

after(async () => {
  await client.close();
});

async function register(email: string): Promise<string> {
  const response = await client.post<{
    data: { token: string };
  }>('/api/v1/auth/register', {
    email,
    password: 'strong-pass-1',
  });

  assert.equal(response.status, 201);
  return response.body.data.token;
}

function readingPayload(title: string) {
  return {
    readingHistory: [{
      title,
      english: `${title} English text.`,
      chinese: `${title} 中文内容。`,
      vocabulary: [],
      timestamp: Date.now(),
      generationConfig: { language: 'en', topic: 'education', difficulty: 'easy', length: 'short' },
    }],
  };
}

test('learning data uses authenticated user owner before anonymous session owner', async () => {
  const sharedSessionId = 'shared-browser-session';

  const anonymousBackfill = await client.post<{ data: { synced: Record<string, number> } }>(
    '/api/v1/migration/backfill',
    readingPayload('Anonymous Reading'),
    { sessionId: sharedSessionId },
  );
  assert.equal(anonymousBackfill.status, 200);
  assert.equal(anonymousBackfill.body.data.synced.readingHistory, 1);

  const token = await register('owner-scope-a@example.com');
  const userBackfill = await client.post<{ data: { synced: Record<string, number> } }>(
    '/api/v1/migration/backfill',
    readingPayload('User Reading'),
    {
      sessionId: sharedSessionId,
      headers: { authorization: `Bearer ${token}` },
    },
  );
  assert.equal(userBackfill.status, 200);
  assert.equal(userBackfill.body.data.synced.readingHistory, 1);

  const anonymousHistory = await client.get<{ data: Array<{ title?: string }> }>('/api/v1/reading/history', {
    sessionId: sharedSessionId,
  });
  assert.equal(anonymousHistory.status, 200);
  assert.deepEqual(anonymousHistory.body.data.map(item => item.title), ['Anonymous Reading']);

  const userHistory = await client.get<{ data: Array<{ title?: string }> }>('/api/v1/reading/history', {
    sessionId: sharedSessionId,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(userHistory.status, 200);
  assert.deepEqual(userHistory.body.data.map(item => item.title), ['User Reading']);
});

test('learning data rejects invalid bearer tokens instead of falling back to anonymous data', async () => {
  const response = await client.get<{ success: boolean; code: string }>('/api/v1/reading/history', {
    sessionId: 'shared-browser-session',
    headers: { authorization: 'Bearer invalid-token' },
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.code, 'UNAUTHORIZED');
});

test('learning data is isolated between authenticated users', async () => {
  const firstToken = await register('owner-scope-b@example.com');
  const secondToken = await register('owner-scope-c@example.com');

  await client.post('/api/v1/migration/backfill', readingPayload('First User Reading'), {
    sessionId: 'same-browser-session',
    headers: { authorization: `Bearer ${firstToken}` },
  });

  const firstHistory = await client.get<{ data: Array<{ title?: string }> }>('/api/v1/reading/history', {
    sessionId: 'same-browser-session',
    headers: { authorization: `Bearer ${firstToken}` },
  });
  const secondHistory = await client.get<{ data: Array<{ title?: string }> }>('/api/v1/reading/history', {
    sessionId: 'same-browser-session',
    headers: { authorization: `Bearer ${secondToken}` },
  });

  assert.deepEqual(firstHistory.body.data.map(item => item.title), ['First User Reading']);
  assert.deepEqual(secondHistory.body.data, []);
});
