import { cn } from '@/lib/utils';
import { formControlBase, formControlDefault, formControlError } from '@/components/ui/form-control';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ className, error = false, ...props }: InputProps) {
  return (
    <input
      className={cn(
        formControlBase,
        error ? formControlError : formControlDefault,
        'px-3 py-2.5',
        className,
      )}
      {...props}
    />
  );
}
