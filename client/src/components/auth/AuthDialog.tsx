import { useState, type FormEvent } from 'react';
import { LogIn, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/toast-context';
import { api } from '@/lib/api';
import { clearLocalLearningCache, saveAuthSession } from '@/lib/auth-session';
import { getAnonymousSessionId } from '@/lib/session';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'register';

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

function countImportedItems(imported: unknown): number {
  if (!imported || typeof imported !== 'object') return 0;
  return Object.values(imported as Record<string, unknown>)
    .reduce<number>((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
}

export function AuthDialog({ open, onClose }: AuthDialogProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [importAnonymousData, setImportAnonymousData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!open) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      const anonymousSessionId = getAnonymousSessionId();
      const payload = {
        email,
        password,
        displayName: mode === 'register' ? displayName : undefined,
        anonymousSessionId,
        importAnonymousData,
      };
      const session = mode === 'register'
        ? await api.auth.register(payload)
        : await api.auth.login(payload);
      saveAuthSession(session);
      clearLocalLearningCache();
      const importedCount = countImportedItems(session.importedAnonymousData);
      toast(importedCount > 0 ? `已导入 ${importedCount} 条匿名数据` : '已登录', 'success');
      onClose();
      window.setTimeout(() => window.location.reload(), 250);
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="关闭账号窗口"
      />

      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {mode === 'login'
              ? <LogIn className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              : <UserPlus className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
            <h2 className="text-lg font-bold">{mode === 'login' ? '登录' : '注册'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="关闭账号窗口"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-lg bg-muted p-1">
          {(['login', 'register'] as const).map(item => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item);
                setErrorMessage('');
              }}
              className={cn(
                'flex h-9 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors',
                mode === item
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item === 'login'
                ? <LogIn className="h-4 w-4" />
                : <UserPlus className="h-4 w-4" />}
              {item === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>

        {errorMessage && (
          <FeedbackAlert
            type="error"
            message={errorMessage}
            className="mb-4"
            onClose={() => setErrorMessage('')}
          />
        )}

        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">邮箱</span>
            <Input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          {mode === 'register' && (
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">昵称</span>
              <Input
                value={displayName}
                onChange={event => setDisplayName(event.target.value)}
                autoComplete="name"
              />
            </label>
          )}

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">密码</span>
            <Input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
            />
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border accent-primary-600"
              checked={importAnonymousData}
              onChange={event => setImportAnonymousData(event.target.checked)}
            />
            <span>导入当前匿名数据</span>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              取消
            </Button>
            <Button type="submit" loading={submitting}>
              {mode === 'login'
                ? <LogIn className="h-4 w-4" />
                : <UserPlus className="h-4 w-4" />}
              {mode === 'login' ? '登录' : '注册'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
