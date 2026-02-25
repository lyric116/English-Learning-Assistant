import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Keyboard, History, Sparkles, Wrench } from 'lucide-react';

type ModuleSectionType = 'input' | 'result' | 'history' | 'action';

interface ModuleSectionProps {
  type: ModuleSectionType;
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

const sectionMeta: Record<ModuleSectionType, { label: string; icon: typeof Sparkles }> = {
  input: { label: '输入区', icon: Keyboard },
  result: { label: '结果区', icon: Sparkles },
  history: { label: '历史区', icon: History },
  action: { label: '操作区', icon: Wrench },
};

export function ModuleSection({ type, title, description, className, children }: ModuleSectionProps) {
  const meta = sectionMeta[type];
  const Icon = meta.icon;

  return (
    <section className={cn('module-section-shell', className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="module-section-label">
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
          </p>
          <h2 className="typo-h3 mt-1">{title}</h2>
          {description && <p className="typo-body-sm mt-1 text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
