import { cn } from '@/lib/utils';

export const CardLoading = (params: { className?: string; text?: string }) => {
  const { className, text = 'Loading...' } = params;
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center',
        className,
      )}
    >
      <span className="skeleton loading loading-infinity text-base-300 w-16" />
      <span className="skeleton skeleton-text">{text}</span>
    </div>
  );
};
