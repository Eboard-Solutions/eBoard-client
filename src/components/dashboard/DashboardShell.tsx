// src/components/dashboard/DashboardShell.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared wrapper providing:
//   • Consistent page-level loading skeleton
//   • Graceful error state with retry button
//   • Reusable EmptyState component for widgets
//   • ErrorAlert inline component for hook-level errors
// ─────────────────────────────────────────────────────────────────────────────
import React, { Component } from 'react';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ── Skeleton blocks ───────────────────────────────────────────────────────────

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-lg bg-muted/60 dark:bg-muted/30', className)}
    />
  );
}

/** Full-page loading skeleton shown while the dashboard resolves auth */
export function DashboardPageSkeleton() {
  return (
    <div className="space-y-8 p-6 lg:p-8" aria-label="Loading dashboard…" aria-busy="true">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonBox className="h-8 w-64" />
        <SkeletonBox className="h-4 w-48" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="glass">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <SkeletonBox className="h-4 w-28" />
                <SkeletonBox className="h-10 w-10 rounded-lg" />
              </div>
              <SkeletonBox className="h-7 w-20" />
              <SkeletonBox className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <SkeletonBox className="h-64" />
          <SkeletonBox className="h-48" />
        </div>
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <SkeletonBox className="h-64" />
          <SkeletonBox className="h-48" />
        </div>
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <SkeletonBox className="h-48" />
          <SkeletonBox className="h-48" />
        </div>
      </div>
    </div>
  );
}

// ── ErrorAlert — inline per-section error with retry ─────────────────────────

interface ErrorAlertProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorAlert({
  title = 'Failed to load data',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  className,
}: ErrorAlertProps) {
  return (
    <Alert
      variant="destructive"
      role="alert"
      className={cn('flex items-start gap-3', className)}
    >
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <AlertTitle className="text-sm font-semibold">{title}</AlertTitle>
        <AlertDescription className="text-xs mt-0.5">{message}</AlertDescription>
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="shrink-0 h-7 text-xs gap-1.5 border-destructive/40 hover:bg-destructive/10"
          aria-label="Retry loading data"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          Retry
        </Button>
      )}
    </Alert>
  );
}

// ── EmptyState — shown inside widgets when data array is empty ────────────────

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-label={title}
      className={cn(
        'flex flex-col items-center justify-center py-10 px-4 text-center',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 dark:bg-muted/30 mb-3"
      >
        <Icon className="h-6 w-6 text-muted-foreground/60" />
      </div>
      <p className="text-sm font-semibold text-muted-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground/70 mt-0.5 max-w-[200px]">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ── React error boundary — catches render-time errors in child widgets ────────

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

export class WidgetErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unexpected error',
    };
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <ErrorAlert
            title="Widget error"
            message={this.state.message}
            onRetry={this.handleReset}
          />
        )
      );
    }
    return this.props.children;
  }
}

// ── DashboardShell — wraps role dashboards with shared error boundary ─────────

interface DashboardShellProps {
  children: React.ReactNode;
  /** Extra padding/layout classes */
  className?: string;
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={cn('space-y-8 p-6 lg:p-8 focus:outline-none', className)}
    >
      <WidgetErrorBoundary>{children}</WidgetErrorBoundary>
    </main>
  );
}