import { Router, Request, Response, NextFunction } from 'express';
import { authRepository } from '../repositories/auth-repository';
import { readBearerToken, validateLoginPayload, validateRegisterPayload } from '../utils/auth';
import { sendError, sendSuccess } from '../utils/response';

export const authRouter = Router();

function unavailable(res: Response): boolean {
  if (authRepository.isAvailable()) return false;
  sendError(res, 503, 'AUTH_UNAVAILABLE', '账号服务暂不可用，请稍后重试');
  return true;
}

authRouter.post('/register', (req: Request, res: Response, next: NextFunction) => {
  try {
    if (unavailable(res)) return;

    const payload = validateRegisterPayload(req.body);
    const result = authRepository.register(payload.email, payload.password, payload.displayName);
    if (!result) {
      sendError(res, 409, 'EMAIL_EXISTS', '该邮箱已注册，请直接登录');
      return;
    }

    sendSuccess(res, result, { status: 201, code: 'REGISTERED', message: 'registered' });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', (req: Request, res: Response, next: NextFunction) => {
  try {
    if (unavailable(res)) return;

    const payload = validateLoginPayload(req.body);
    const result = authRepository.login(payload.email, payload.password);
    if (!result) {
      sendError(res, 401, 'INVALID_CREDENTIALS', '邮箱或密码不正确');
      return;
    }

    sendSuccess(res, result, { code: 'LOGGED_IN', message: 'logged in' });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', (req: Request, res: Response, next: NextFunction) => {
  try {
    if (unavailable(res)) return;

    const token = readBearerToken(req.header('authorization'));
    if (!token) {
      sendError(res, 401, 'UNAUTHORIZED', '请先登录');
      return;
    }

    const result = authRepository.findSessionByToken(token);
    if (!result) {
      sendError(res, 401, 'UNAUTHORIZED', '登录状态已失效，请重新登录');
      return;
    }

    sendSuccess(res, {
      user: result.user,
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  try {
    if (unavailable(res)) return;

    const token = readBearerToken(req.header('authorization'));
    if (!token) {
      sendError(res, 401, 'UNAUTHORIZED', '请先登录');
      return;
    }

    authRepository.revokeSessionByToken(token);
    sendSuccess(res, { ok: true });
  } catch (err) {
    next(err);
  }
});
