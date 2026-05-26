import test from 'node:test';
import assert from 'node:assert/strict';

import { validateBaseUrl } from '../src/lib/base-url.ts';

test('validateBaseUrl accepts HTTPS API endpoints and trims trailing slashes', () => {
  const result = validateBaseUrl('https://api.example.com/v1///');

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.normalized, 'https://api.example.com/v1');
  }
});

test('validateBaseUrl rejects localhost and private network endpoints', () => {
  const localhost = validateBaseUrl('http://localhost:11434/v1');
  const privateIp = validateBaseUrl('http://192.168.1.5/v1');

  assert.equal(localhost.ok, false);
  assert.equal(privateIp.ok, false);
});

test('validateBaseUrl rejects unsupported protocols and embedded credentials', () => {
  const ftp = validateBaseUrl('ftp://api.example.com/v1');
  const credentials = validateBaseUrl('https://user:pass@api.example.com/v1');

  assert.equal(ftp.ok, false);
  assert.equal(credentials.ok, false);
});

