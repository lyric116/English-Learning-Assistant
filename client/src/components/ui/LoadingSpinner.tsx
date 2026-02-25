import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/35 px-6 py-10 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
