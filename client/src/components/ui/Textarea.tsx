import { cn } from '@/lib/utils';
import { formControlBase, formControlDefault, formControlError } from '@/components/ui/form-control';
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ className, error = false, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        formControlBase,
        error ? formControlError : formControlDefault,
        'resize-y px-4 py-3 min-h-[120px]',
        className,
      )}
      {...props}
    />
  );
}
