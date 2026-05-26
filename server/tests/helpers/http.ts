import { Duplex } from 'node:stream';
import { IncomingMessage, ServerResponse } from 'node:http';

import { migrateTestDatabase } from './db.ts';

interface JsonRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  sessionId?: string;
}

export interface TestHttpClient {
  dbPath: string;
  get: <T = unknown>(path: string, options?: Omit<JsonRequestOptions, 'method' | 'body'>) => Promise<{
    status: number;
    body: T;
  }>;
  post: <T = unknown>(path: string, body?: unknown, options?: Omit<JsonRequestOptions, 'method' | 'body'>) => Promise<{
    status: number;
    body: T;
  }>;
  close: () => Promise<void>;
}

class MockSocket extends Duplex {
  remoteAddress = '127.0.0.1';

  _read() {
    // Request body is pushed directly into IncomingMessage.
  }

  _write(_chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    callback();
  }
}

export async function createTestHttpClient(prefix: string): Promise<TestHttpClient> {
  const dbPath = migrateTestDatabase(prefix);
  process.env.SQLITE_DB_PATH = dbPath;
  process.env.VERCEL = '1';
  process.env.ALLOW_PRIVATE_AI_HOSTS = '0';

  const appModule = await import('../../dist/index.js');
  const app = appModule.default?.default ?? appModule.default;

  async function request<T>(path: string, options: JsonRequestOptions = {}): Promise<{ status: number; body: T }> {
    const bodyText = options.body === undefined ? '' : JSON.stringify(options.body);
    const socket = new MockSocket();
    const req = new IncomingMessage(socket);
    req.method = options.method || 'GET';
    req.url = path;
    req.headers = {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(bodyText).toString(),
      'x-anonymous-session-id': options.sessionId || `${prefix}-owner`,
      ...(options.headers || {}),
    };
    req.push(bodyText);
    req.push(null);

    const res = new ServerResponse(req);
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      res.write = (chunk: unknown, encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void), callback?: (error?: Error | null) => void) => {
        const encoding = typeof encodingOrCallback === 'string' ? encodingOrCallback : undefined;
        const cb = typeof encodingOrCallback === 'function' ? encodingOrCallback : callback;
        if (chunk !== undefined) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding));
        }
        if (cb) cb();
        return true;
      };
      res.end = (chunk?: unknown, encodingOrCallback?: BufferEncoding | (() => void), callback?: () => void) => {
        const encoding = typeof encodingOrCallback === 'string' ? encodingOrCallback : undefined;
        const cb = typeof encodingOrCallback === 'function' ? encodingOrCallback : callback;
        if (chunk !== undefined) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding));
        }
        if (cb) cb();
        resolve();
        return res;
      };

      app.handle(req, res, (error: unknown) => {
        if (error) reject(error);
      });
    });

    return {
      status: res.statusCode,
      body: JSON.parse(Buffer.concat(chunks).toString('utf8')) as T,
    };
  }

  return {
    dbPath,
    get: (path, options) => request(path, { ...options, method: 'GET' }),
    post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
    close: async () => undefined,
  };
}
