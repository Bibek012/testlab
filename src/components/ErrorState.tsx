'use client';

import React from 'react';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  error: Error | any;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export const ErrorState = ({ error, onRetry, className, compact }: Props) => {
  const isPermissionError =
    error?.name === 'FirestorePermissionError' || error?.code === 'permission-denied';
  const isConnectionError =
    error?.code === 'unavailable' || error?.code === 'deadline-exceeded';
  const isOffline = (typeof window !== 'undefined' && !window.navigator.onLine) || isConnectionError;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-6 p-12 glass border-white/10 rounded-[2.5rem] text-center',
        compact && 'p-6 rounded-2xl gap-3',
        className
      )}
    >
      <div
        className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center',
          isOffline ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500',
          compact && 'w-10 h-10 rounded-xl'
        )}
      >
        {isOffline ? (
          <WifiOff className={compact ? 'w-5 h-5' : 'w-8 h-8'} />
        ) : (
          <AlertCircle className={compact ? 'w-5 h-5' : 'w-8 h-8'} />
        )}
      </div>

      <div className="space-y-2">
        <h3 className={cn('font-headline font-bold', compact ? 'text-sm' : 'text-xl')}>
          {isOffline
            ? 'Network Unreachable'
            : isPermissionError
            ? 'Access Restricted'
            : 'Something went wrong'}
        </h3>
        <p className={cn('text-muted-foreground max-w-xs', compact ? 'text-[10px]' : 'text-sm')}>
          {isOffline
            ? 'The database is currently unreachable. Please check your internet connection and try again.'
            : isPermissionError
            ? "You don't have required permissions to view this resource."
            : error?.message || 'An unexpected error occurred while fetching data.'}
        </p>
      </div>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size={compact ? 'sm' : 'default'}
          className="rounded-xl border-white/10 gap-2 h-11 px-8 font-bold"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      )}
    </div>
  );
};
