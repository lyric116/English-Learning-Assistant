import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  default: 'border border-primary-600 bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:border-primary-700 hover:shadow-md active:bg-primary-800 active:border-primary-800',
  secondary: 'border border-border bg-card text-foreground shadow-sm hover:bg-muted hover:border-primary-300 hover:text-primary-700 dark:hover:text-primary-300 active:bg-muted/80',
  outline: 'border border-border bg-card text-foreground shadow-sm hover:bg-muted hover:border-primary-300 hover:text-primary-700 dark:hover:text-primary-300 active:bg-muted/80',
  ghost: 'border border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-muted hover:text-foreground active:bg-muted/80',
  destructive: 'border border-destructive bg-destructive text-white shadow-sm hover:bg-red-600 hover:border-red-600 hover:shadow-md active:bg-red-700 active:border-red-700',
};

const sizes = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-base gap-2',
};

export function Button({ variant = 'default', size = 'md', loading, className, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-semibold select-none',
        'transition-colors transition-shadow transition-transform duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-55 disabled:pointer-events-none disabled:shadow-none disabled:scale-100',
        'active:scale-[0.97]',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
