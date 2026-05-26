import test, { after } from 'node:test';
import assert from 'node:assert/strict';

import { createTestHttpClient } from '../helpers/http.ts';

interface AuthResponse {
  success: boolean;
  code: string;
  message?: string;
  data: {
    token: string;
    expiresAt: string;
    user: {
      id: string;
      email: string;
      displayName?: string;
      status: string;
    };
  };
}

const client = await createTestHttpClient('route-auth');

after(async () => {
  await client.close();
});

test('POST /api/v1/auth/register creates an account and session token', async () => {
  const response = await client.post<AuthResponse>('/api/v1/auth/register', {
    email: 'Learner@Example.COM',
    password: 'strong-pass-1',
    displayName: 'Learner',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.code, 'REGISTERED');
  assert.equal(response.body.data.user.email, 'learner@example.com');
  assert.equal(response.body.data.user.displayName, 'Learner');
  assert.equal(response.body.data.user.status, 'active');
  assert.ok(response.body.data.user.id);
  assert.ok(response.body.data.token);
  assert.ok(response.body.data.expiresAt);
});

test('POST /api/v1/auth/register rejects duplicate email', async () => {
  const response = await client.post<{ success: boolean; code: string }>('/api/v1/auth/register', {
    email: 'learner@example.com',
    password: 'strong-pass-1',
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.success, false);
  assert.equal(response.body.code, 'EMAIL_EXISTS');
});

test('POST /api/v1/auth/login validates credentials and GET /me reads session', async () => {
  const login = await client.post<AuthResponse>('/api/v1/auth/login', {
    email: 'learner@example.com',
    password: 'strong-pass-1',
  });

  assert.equal(login.status, 200);
  assert.equal(login.body.code, 'LOGGED_IN');
  assert.ok(login.body.data.token);

  const me = await client.get<{
    success: boolean;
    data: { user: { email: string }; expiresAt: string };
  }>('/api/v1/auth/me', {
    headers: { authorization: `Bearer ${login.body.data.token}` },
  });

  assert.equal(me.status, 200);
  assert.equal(me.body.success, true);
  assert.equal(me.body.data.user.email, 'learner@example.com');
  assert.ok(me.body.data.expiresAt);
});

test('POST /api/v1/auth/login rejects invalid password', async () => {
  const response = await client.post<{ success: boolean; code: string }>('/api/v1/auth/login', {
    email: 'learner@example.com',
    password: 'wrong-pass-1',
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.code, 'INVALID_CREDENTIALS');
});

test('POST /api/v1/auth/logout revokes the current session token', async () => {
  const login = await client.post<AuthResponse>('/api/v1/auth/login', {
    email: 'learner@example.com',
    password: 'strong-pass-1',
  });
  const token = login.body.data.token;

  const logout = await client.post<{ success: boolean; data: { ok: boolean } }>('/api/v1/auth/logout', {}, {
    headers: { authorization: `Bearer ${token}` },
  });

  assert.equal(logout.status, 200);
  assert.equal(logout.body.data.ok, true);

  const me = await client.get<{ success: boolean; code: string }>('/api/v1/auth/me', {
    headers: { authorization: `Bearer ${token}` },
  });

  assert.equal(me.status, 401);
  assert.equal(me.body.success, false);
  assert.equal(me.body.code, 'UNAUTHORIZED');
});

test('POST /api/v1/auth/register validates email and password', async () => {
  const invalidEmail = await client.post<{ code: string }>('/api/v1/auth/register', {
    email: 'not-an-email',
    password: 'strong-pass-1',
  });
  assert.equal(invalidEmail.status, 400);
  assert.equal(invalidEmail.body.code, 'VALIDATION_ERROR');

  const weakPassword = await client.post<{ code: string }>('/api/v1/auth/register', {
    email: 'new@example.com',
    password: 'short',
  });
  assert.equal(weakPassword.status, 400);
  assert.equal(weakPassword.body.code, 'VALIDATION_ERROR');
});
