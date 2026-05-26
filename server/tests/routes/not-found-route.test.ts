import test, { after } from 'node:test';
import assert from 'node:assert/strict';

import { createTestHttpClient } from '../helpers/http.ts';

const client = await createTestHttpClient('route-not-found');

after(async () => {
  await client.close();
});

test('unknown API route returns unified NOT_FOUND envelope', async () => {
  const response = await client.get<{ success: boolean; code: string; message: string }>('/api/v1/unknown-route');

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.equal(response.body.code, 'NOT_FOUND');
  assert.match(response.body.message, /不存在/);
});

