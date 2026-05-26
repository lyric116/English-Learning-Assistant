import { NextFunction, Request, Response } from 'express';
import { authRepository, type PublicUser } from '../repositories/auth-repository';
import { readBearerToken } from '../utils/auth';
import { type DataOwner, normalizeOwnerId } from '../utils/owner';
import { sendError } from '../utils/response';

interface OwnerScopedRequest extends Request {
  dataOwner?: DataOwner;
  authenticatedUser?: PublicUser;
}

export function getRequestOwner(req: Request): DataOwner {
  const scoped = req as OwnerScopedRequest;
  if (scoped.dataOwner) return scoped.dataOwner;

  return {
    ownerType: 'anonymous',
    ownerId: normalizeOwnerId(req.header('x-anonymous-session-id') || undefined),
  };
}

export function requestOwnerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const scoped = req as OwnerScopedRequest;
  const token = readBearerToken(req.header('authorization'));

  if (!token) {
    scoped.dataOwner = {
      ownerType: 'anonymous',
      ownerId: normalizeOwnerId(req.header('x-anonymous-session-id') || undefined),
    };
    next();
    return;
  }

  if (!authRepository.isAvailable()) {
    sendError(res, 503, 'AUTH_UNAVAILABLE', '账号服务暂不可用，请稍后重试');
    return;
  }

  const session = authRepository.findSessionByToken(token);
  if (!session) {
    sendError(res, 401, 'UNAUTHORIZED', '登录状态已失效，请重新登录');
    return;
  }

  scoped.dataOwner = {
    ownerType: 'user',
    ownerId: session.user.id,
  };
  scoped.authenticatedUser = session.user;
  next();
}
