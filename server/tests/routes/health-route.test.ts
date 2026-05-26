import test, { after } from 'node:test';
import assert from 'node:assert/strict';

import { createTestHttpClient } from '../helpers/http.ts';

const client = await createTestHttpClient('route-health');

after(async () => {
  await client.close();
});

test('GET /api/v1/health returns standardized ok status', async () => {
  const response = await client.get<{ success: boolean; code: string; data: { status: string } }>('/api/v1/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.code, 'OK');
  assert.equal(response.body.data.status, 'ok');
});

test('GET /api/v1 lists public API endpoints', async () => {
  const response = await client.get<{ data: { endpoints: string[] } }>('/api/v1');

  assert.equal(response.status, 200);
  assert.ok(response.body.data.endpoints.includes('POST /api/v1/reading/generate'));
  assert.ok(response.body.data.endpoints.includes('POST /api/v1/report/share'));
});

