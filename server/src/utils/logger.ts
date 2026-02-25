type LogLevel = 'info' | 'warn' | 'error';

interface LogPayload {
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, payload: LogPayload = {}): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
    return;
  }
  console.log(line);
}

export const logger = {
  info: (message: string, payload?: LogPayload) => write('info', message, payload),
  warn: (message: string, payload?: LogPayload) => write('warn', message, payload),
  error: (message: string, payload?: LogPayload) => write('error', message, payload),
};
