import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/25 py-14 px-5 text-center animate-fade-in-up">
      {icon && <div className="mb-4 text-muted-foreground/60">{icon}</div>}
      <h3 className="text-lg font-semibold mb-1.5">{title}</h3>
      {description && <p className="max-w-md text-sm leading-relaxed text-muted-foreground mb-4">{description}</p>}
      {action}
    </div>
  );
}
