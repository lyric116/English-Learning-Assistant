import { Router, Request, Response, NextFunction } from 'express';
import { generateLearningReport } from '../services/ai-service';
import { validateReportGeneratePayload } from '../utils/request-validator';

export const reportRouter = Router();

reportRouter.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportType, learningData, aiConfig } = validateReportGeneratePayload(req.body);
    const result = await generateLearningReport(reportType, learningData, aiConfig);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
