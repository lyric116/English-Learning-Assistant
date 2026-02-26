import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContextStore {
  traceId: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContextStore>();

export function runWithRequestContext<T>(traceId: string, callback: () => T): T {
  return requestContextStorage.run({ traceId }, callback);
}

export function getTraceId(): string | undefined {
  return requestContextStorage.getStore()?.traceId;
}
