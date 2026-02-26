import { Router, Request, Response, NextFunction } from 'express';
import { generateLearningReport } from '../services/ai-service';
import { validateReportGeneratePayload } from '../utils/request-validator';
import { learningDataRepository } from '../repositories/learning-data-repository';
import { sendError, sendSuccess } from '../utils/response';

export const reportRouter = Router();

function parseLimit(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return fallback;
  return Math.max(1, Math.min(parsed, 200));
}

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] || '').trim();
  return (value || '').trim();
}

reportRouter.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportType, learningData, aiConfig } = validateReportGeneratePayload(req.body);
    const result = await generateLearningReport(reportType, learningData, aiConfig);
    learningDataRepository.persistLearningReport(
      req.header('x-anonymous-session-id') || undefined,
      reportType,
      result as Record<string, unknown>,
    );
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

reportRouter.get('/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseLimit(req.query.limit, 20);
    const result = learningDataRepository.getReportHistory(req.header('x-anonymous-session-id') || undefined, limit);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

reportRouter.post('/share', (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      sendError(res, 400, 'BAD_REQUEST', '分享请求体必须是对象');
      return;
    }

    const report = (body as Record<string, unknown>).report;
    if (!report || typeof report !== 'object' || Array.isArray(report)) {
      sendError(res, 400, 'BAD_REQUEST', '请提供可分享的 report 数据');
      return;
    }

    const created = learningDataRepository.createSharedReport(
      req.header('x-anonymous-session-id') || undefined,
      report as Record<string, unknown>,
    );

    if (!created) {
      sendError(res, 500, 'INTERNAL_ERROR', '创建分享链接失败，请稍后重试');
      return;
    }

    sendSuccess(res, {
      shareId: created.shareId,
      sharePath: `/share/${created.shareId}`,
    });
  } catch (err) {
    next(err);
  }
});

reportRouter.get('/share/:shareId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const shareId = readParam(req.params.shareId);
    if (!shareId) {
      sendError(res, 400, 'BAD_REQUEST', 'shareId 不能为空');
      return;
    }

    const result = learningDataRepository.getSharedReport(shareId);
    if (!result) {
      sendError(res, 404, 'NOT_FOUND', '分享内容不存在或已失效');
      return;
    }

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

reportRouter.post('/share/:shareId/events', (req: Request, res: Response, next: NextFunction) => {
  try {
    const shareId = readParam(req.params.shareId);
    if (!shareId) {
      sendError(res, 400, 'BAD_REQUEST', 'shareId 不能为空');
      return;
    }

    const eventType = (req.body as { eventType?: string } | undefined)?.eventType;
    if (eventType !== 'visit' && eventType !== 'convert') {
      sendError(res, 400, 'BAD_REQUEST', 'eventType 仅支持 visit 或 convert');
      return;
    }

    const ok = learningDataRepository.trackSharedReportEvent(shareId, eventType);
    if (!ok) {
      sendError(res, 500, 'INTERNAL_ERROR', '埋点记录失败');
      return;
    }

    sendSuccess(res, { ok: true });
  } catch (err) {
    next(err);
  }
});
