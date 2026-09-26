import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({ error, resetError }: ErrorFallbackProps) {
  const handleReload = () => {
    try {
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-stone-50 p-6">
      <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm border border-stone-200/80 p-8">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-900 mx-auto flex items-center justify-center font-serif text-xl font-bold mb-4">
          PM
        </div>
        <h1 className="text-xl font-serif font-semibold text-stone-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          A temporary error occurred while rendering this section.
        </p>
        {import.meta.env.DEV ? (
          <pre className="mt-4 overflow-x-auto rounded bg-stone-100 p-3 text-left text-xs text-stone-800">
            {error.message || String(error)}
          </pre>
        ) : null}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={resetError}
            className="w-full sm:w-auto rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={handleReload}
            className="w-full sm:w-auto rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Refresh App
          </button>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const err = toError(error);
    const msg = String(err.message || '').toLowerCase();
    // Auto-reload on stale chunk after a new deployment
    if (
      msg.includes('dynamically imported module') ||
      msg.includes('chunkloaderror') ||
      msg.includes('loading chunk')
    ) {
      if (!sessionStorage.getItem('pm_chunk_reload_lock')) {
        sessionStorage.setItem('pm_chunk_reload_lock', 'true');
        window.location.reload();
      }
    }
    return { error: err };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      'ErrorBoundary caught an error:',
      toError(error),
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={error} resetError={this.resetError} />;
  }
}
