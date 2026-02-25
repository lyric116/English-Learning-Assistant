import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type FeedbackType = 'success' | 'error' | 'warning' | 'info';

interface FeedbackAlertProps {
  type?: FeedbackType;
  message: string;
  className?: string;
  onClose?: () => void;
}

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const toneClassMap: Record<FeedbackType, string> = {
  success: 'border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200',
  error: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200',
  warning: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
  info: 'border-primary-300 bg-primary-50 text-primary-900 dark:border-primary-700 dark:bg-primary-950/30 dark:text-primary-200',
};

export function FeedbackAlert({ type = 'info', message, className, onClose }: FeedbackAlertProps) {
  const Icon = iconMap[type];

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
        toneClassMap[type],
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 leading-relaxed">{message}</p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
          aria-label="关闭提示"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
