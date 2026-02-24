const AI_USAGE_KEY = 'ai-usage-daily';
export const AI_DAILY_LIMIT = 50;

interface DailyUsage {
  date: string;
  count: number;
}

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readUsage(): DailyUsage {
  const today = getLocalDateKey();

  try {
    const raw = localStorage.getItem(AI_USAGE_KEY);
    if (!raw) return { date: today, count: 0 };

    const parsed = JSON.parse(raw) as DailyUsage;
    if (typeof parsed.date !== 'string' || typeof parsed.count !== 'number') {
      return { date: today, count: 0 };
    }

    if (parsed.date !== today) {
      return { date: today, count: 0 };
    }

    return { date: parsed.date, count: Math.max(0, Math.floor(parsed.count)) };
  } catch {
    return { date: today, count: 0 };
  }
}

function writeUsage(usage: DailyUsage): void {
  localStorage.setItem(AI_USAGE_KEY, JSON.stringify(usage));
}

export function getDailyAiUsage(limit = AI_DAILY_LIMIT): { used: number; remaining: number; limit: number } {
  const usage = readUsage();
  return {
    used: usage.count,
    remaining: Math.max(0, limit - usage.count),
    limit,
  };
}

export function recordAiCall(): { used: number; remaining: number; limit: number } {
  const usage = readUsage();
  const next = { ...usage, count: usage.count + 1 };
  writeUsage(next);
  return getDailyAiUsage();
}

export function shouldAllowCallOverLimit(limit = AI_DAILY_LIMIT): boolean {
  const usage = readUsage();
  if (usage.count < limit) {
    return true;
  }

  return window.confirm(
    `你今天已发起 ${usage.count} 次 AI 调用（建议上限 ${limit} 次）。是否继续本次调用？`,
  );
}
