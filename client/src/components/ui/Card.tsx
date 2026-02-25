import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ className, hover, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'ds-card bg-card rounded-xl shadow-sm border border-border/50 p-6 transition-all duration-300',
        hover && 'hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-800 hover:-translate-y-0.5',
        className,
      )}
      {...props}
    />
  );
}
