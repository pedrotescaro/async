import { cn } from '@/lib/utils';

interface AsyncLogoProps {
  className?: string;
  wordmark?: boolean;
}

export function AsyncLogo({ className, wordmark = false }: AsyncLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative inline-flex size-8 shrink-0 items-center justify-center">
        <img
          src="/async-logo-light.svg"
          alt=""
          aria-hidden="true"
          className="size-full object-contain dark:hidden"
        />
        <img
          src="/async-logo-dark.svg"
          alt=""
          aria-hidden="true"
          className="hidden size-full object-contain dark:block"
        />
      </span>
      {wordmark && (
        <span className="text-[1.02rem] font-medium tracking-[0.22em] text-[var(--text)]">
          ASYNC
        </span>
      )}
    </span>
  );
}
