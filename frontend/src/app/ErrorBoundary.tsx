import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || "Unexpected error",
    };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }): void {
    // Keep diagnostics available in browser console for rapid triage.
    console.error("ui.unhandled_error", {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="fatal-shell">
          <h1>UI Error</h1>
          <p>The page hit an unexpected error. Refresh to recover.</p>
          <pre>{this.state.message}</pre>
          <button
            className="mt-3 px-3 py-2 rounded border border-border-subtle text-[12px]"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
