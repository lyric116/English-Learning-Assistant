export interface SharedReportDisplayPayload {
  title?: unknown;
  summary?: unknown;
  report?: Record<string, unknown> | null;
}

export function asReportText(value: unknown, fallback = ''): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export function getSharedReportDisplayFields(payload: SharedReportDisplayPayload | null): {
  reportTitle: string;
  period: string;
  summary: string;
  averageScore: string;
  readingCount: string;
} {
  const report = payload?.report ?? {};

  return {
    reportTitle: asReportText(payload?.title, asReportText(report.title, '学习报告')),
    period: asReportText(report.period, '近期学习'),
    summary: asReportText(payload?.summary, asReportText(report.summary, '保持学习节奏，持续进步。')),
    averageScore: asReportText((report.tests as { averageScore?: unknown } | undefined)?.averageScore, '-'),
    readingCount: asReportText((report.reading as { articles?: unknown } | undefined)?.articles, '-'),
  };
}

