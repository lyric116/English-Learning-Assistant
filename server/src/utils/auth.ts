import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { ValidationError } from './request-validator';

export interface RegisterPayload {
  email: string;
  password: string;
  displayName?: string;
  anonymousSessionId?: string;
  importAnonymousData: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
  anonymousSessionId?: string;
  importAnonymousData: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_EMAIL_LENGTH = 254;
const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_SESSION_ID_LENGTH = 160;
const PASSWORD_HASH_BYTES = 64;

function ensureObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('请求体必须是 JSON 对象');
  }
  return value as Record<string, unknown>;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function readEmail(obj: Record<string, unknown>): string {
  const value = obj.email;
  if (typeof value !== 'string') {
    throw new ValidationError('邮箱必须是字符串');
  }

  const email = normalizeEmail(value);
  if (!email) {
    throw new ValidationError('邮箱不能为空');
  }
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    throw new ValidationError('邮箱格式无效');
  }
  return email;
}

function readPassword(obj: Record<string, unknown>): string {
  const value = obj.password;
  if (typeof value !== 'string') {
    throw new ValidationError('密码必须是字符串');
  }

  if (value.length < MIN_PASSWORD_LENGTH || value.length > MAX_PASSWORD_LENGTH) {
    throw new ValidationError(`密码长度必须在 ${MIN_PASSWORD_LENGTH} 到 ${MAX_PASSWORD_LENGTH} 个字符之间`);
  }
  return value;
}

function readDisplayName(obj: Record<string, unknown>): string | undefined {
  const value = obj.displayName;
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new ValidationError('昵称必须是字符串');
  }

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new ValidationError(`昵称长度不能超过 ${MAX_DISPLAY_NAME_LENGTH} 个字符`);
  }
  return trimmed;
}

function readAnonymousSessionId(obj: Record<string, unknown>): string | undefined {
  const value = obj.anonymousSessionId;
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new ValidationError('匿名会话 ID 必须是字符串');
  }

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_SESSION_ID_LENGTH) {
    throw new ValidationError(`匿名会话 ID 长度不能超过 ${MAX_SESSION_ID_LENGTH} 个字符`);
  }
  return trimmed;
}

function readImportAnonymousData(obj: Record<string, unknown>): boolean {
  const value = obj.importAnonymousData;
  if (value === undefined) return false;
  if (typeof value !== 'boolean') {
    throw new ValidationError('匿名数据导入选项必须是布尔值');
  }
  return value;
}

export function validateRegisterPayload(body: unknown): RegisterPayload {
  const obj = ensureObject(body);
  return {
    email: readEmail(obj),
    password: readPassword(obj),
    displayName: readDisplayName(obj),
    anonymousSessionId: readAnonymousSessionId(obj),
    importAnonymousData: readImportAnonymousData(obj),
  };
}

export function validateLoginPayload(body: unknown): LoginPayload {
  const obj = ensureObject(body);
  return {
    email: readEmail(obj),
    password: readPassword(obj),
    anonymousSessionId: readAnonymousSessionId(obj),
    importAnonymousData: readImportAnonymousData(obj),
  };
}

export function generatePasswordSalt(): string {
  return randomBytes(16).toString('hex');
}

export function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, PASSWORD_HASH_BYTES).toString('hex');
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function readBearerToken(headerValue: unknown): string | undefined {
  if (typeof headerValue !== 'string') return undefined;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || undefined;
}
