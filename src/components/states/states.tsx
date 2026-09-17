import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground',
        className,
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  icon?: LucideIcon;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  icon: Icon,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 text-center',
        className,
      )}
    >
      {Icon ? (
        <Icon className="h-12 w-12 text-destructive" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <span className="text-3xl font-bold text-destructive">!</span>
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try again
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  message,
  icon: Icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        {message && (
          <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
        )}
      </div>
      {action}
    </div>
  );
}

interface NotFoundStateProps {
  title?: string;
  message?: string;
  className?: string;
}

export function NotFoundState({
  title = 'Page not found',
  message = "The page you're looking for doesn't exist or has been moved.",
  className,
}: NotFoundStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-24 text-center',
        className,
      )}
    >
      <p className="text-7xl font-bold text-muted/40">404</p>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
