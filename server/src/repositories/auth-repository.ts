import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger';
import {
  generatePasswordSalt,
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  verifyPassword,
} from '../utils/auth';
import { SqliteClient } from './sqlite-client';

export interface PublicUser {
  id: string;
  email: string;
  displayName?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AuthSessionResult {
  user: PublicUser;
  token: string;
  expiresAt: string;
}

export interface AuthLookupResult {
  user: PublicUser;
  sessionId: string;
  expiresAt: string;
}

interface UserRow {
  id: string;
  email: string;
  displayName?: string | null;
  status: string;
  passwordHash?: string | null;
  passwordSalt?: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

interface SessionUserRow extends UserRow {
  sessionId: string;
  expiresAt: string;
}

export class AuthRepository {
  private readonly sqlite = new SqliteClient();
  private readonly enabled = process.env.ENABLE_DB_PERSISTENCE !== '0';
  private available = false;

  constructor() {
    if (!this.enabled) {
      logger.warn('auth_repository.disabled', { reason: 'ENABLE_DB_PERSISTENCE=0' });
      return;
    }

    try {
      this.sqlite.execute('SELECT 1;');
      this.available = true;
      logger.info('auth_repository.ready', { dbPath: this.sqlite.getDatabasePath() });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('auth_repository.unavailable', {
        dbPath: this.sqlite.getDatabasePath(),
        error: message,
      });
    }
  }

  isAvailable(): boolean {
    return this.enabled && this.available;
  }

  private ensureAvailable(): void {
    if (!this.isAvailable()) {
      throw new Error('账号服务暂不可用，请稍后重试');
    }
  }

  private execute(action: string, script: string): void {
    this.ensureAvailable();
    try {
      this.sqlite.execute(script);
      logger.info('auth_repository.write.ok', { action });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('auth_repository.write.failed', { action, error: message });
      throw err;
    }
  }

  private query<T>(action: string, statement: string): T[] {
    this.ensureAvailable();
    try {
      const result = this.sqlite.queryJson<T>(statement);
      logger.info('auth_repository.read.ok', { action, rows: result.length });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('auth_repository.read.failed', { action, error: message });
      throw err;
    }
  }

  private toPublicUser(row: UserRow): PublicUser {
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName || undefined,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastLoginAt: row.lastLoginAt || undefined,
    };
  }

  findUserByEmail(emailRaw: string): UserRow | null {
    const email = normalizeEmail(emailRaw);
    const rows = this.query<UserRow>('find_user_by_email', `
      SELECT
        id,
        email,
        display_name AS displayName,
        status,
        password_hash AS passwordHash,
        password_salt AS passwordSalt,
        datetime(created_at) AS createdAt,
        datetime(updated_at) AS updatedAt,
        datetime(last_login_at) AS lastLoginAt
      FROM users
      WHERE email = ${SqliteClient.sqlLiteral(email)}
      LIMIT 1;
    `);
    return rows[0] || null;
  }

  register(emailRaw: string, password: string, displayName?: string): AuthSessionResult | null {
    this.ensureAvailable();
    const email = normalizeEmail(emailRaw);
    const existing = this.findUserByEmail(email);
    if (existing) return null;

    const userId = randomUUID();
    const salt = generatePasswordSalt();
    const passwordHash = hashPassword(password, salt);

    this.execute('insert_user', `
      INSERT INTO users (
        id, email, display_name, status, password_hash, password_salt, password_algorithm,
        created_at, updated_at
      ) VALUES (
        ${SqliteClient.sqlLiteral(userId)},
        ${SqliteClient.sqlLiteral(email)},
        ${SqliteClient.sqlLiteral(displayName || null)},
        'active',
        ${SqliteClient.sqlLiteral(passwordHash)},
        ${SqliteClient.sqlLiteral(salt)},
        'scrypt',
        datetime('now'),
        datetime('now')
      );
    `);

    const user = this.findUserByEmail(email);
    if (!user) {
      throw new Error('账号创建失败，请稍后重试');
    }
    return this.createSession(this.toPublicUser(user));
  }

  login(emailRaw: string, password: string): AuthSessionResult | null {
    this.ensureAvailable();
    const user = this.findUserByEmail(emailRaw);
    if (!user || user.status !== 'active' || !user.passwordHash || !user.passwordSalt) {
      return null;
    }

    if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return null;
    }

    this.execute('update_last_login', `
      UPDATE users
      SET last_login_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ${SqliteClient.sqlLiteral(user.id)};
    `);

    const refreshed = this.findUserByEmail(user.email) || user;
    return this.createSession(this.toPublicUser(refreshed));
  }

  createSession(user: PublicUser): AuthSessionResult {
    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

    this.execute('insert_session', `
      INSERT INTO sessions (
        id, user_id, device_id, refresh_token_hash, expires_at, revoked_at, created_at, last_seen_at
      ) VALUES (
        ${SqliteClient.sqlLiteral(sessionId)},
        ${SqliteClient.sqlLiteral(user.id)},
        NULL,
        ${SqliteClient.sqlLiteral(tokenHash)},
        ${SqliteClient.sqlLiteral(expiresAt)},
        NULL,
        datetime('now'),
        datetime('now')
      );
    `);

    return { user, token, expiresAt };
  }

  findSessionByToken(token: string): AuthLookupResult | null {
    if (!token.trim()) return null;
    const tokenHash = hashSessionToken(token.trim());
    const rows = this.query<SessionUserRow>('find_session_by_token', `
      SELECT
        sessions.id AS sessionId,
        datetime(sessions.expires_at) AS expiresAt,
        users.id AS id,
        users.email AS email,
        users.display_name AS displayName,
        users.status AS status,
        users.password_hash AS passwordHash,
        users.password_salt AS passwordSalt,
        datetime(users.created_at) AS createdAt,
        datetime(users.updated_at) AS updatedAt,
        datetime(users.last_login_at) AS lastLoginAt
      FROM sessions
      INNER JOIN users ON users.id = sessions.user_id
      WHERE sessions.refresh_token_hash = ${SqliteClient.sqlLiteral(tokenHash)}
        AND sessions.revoked_at IS NULL
        AND datetime(sessions.expires_at) > datetime('now')
        AND users.status = 'active'
      LIMIT 1;
    `);

    const row = rows[0];
    if (!row) return null;

    this.execute('touch_session', `
      UPDATE sessions
      SET last_seen_at = datetime('now')
      WHERE id = ${SqliteClient.sqlLiteral(row.sessionId)};
    `);

    return {
      user: this.toPublicUser(row),
      sessionId: row.sessionId,
      expiresAt: row.expiresAt,
    };
  }

  revokeSessionByToken(token: string): boolean {
    if (!token.trim()) return false;
    const tokenHash = hashSessionToken(token.trim());
    this.execute('revoke_session', `
      UPDATE sessions
      SET revoked_at = datetime('now')
      WHERE refresh_token_hash = ${SqliteClient.sqlLiteral(tokenHash)}
        AND revoked_at IS NULL;
    `);
    return true;
  }
}

export const authRepository = new AuthRepository();
