import { Component, type ErrorInfo, type ReactNode } from "react";

interface State { hasError: boolean }

/** Catches render errors so a crash shows a friendly fallback, not a white screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface for monitoring (Sentry/console). Never throws.
    console.error("[app] render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: "70dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 20px", gap: 12 }}>
        <h1 style={{ fontSize: 26, color: "#0c2436" }}>Something went wrong</h1>
        <p style={{ color: "#6b7a87", maxWidth: 420 }}>
          Sorry — an unexpected error occurred. Please reload the page; if it keeps happening, contact SMART Drill support.
        </p>
        <a href="/" className="sd-btn sd-btn--primary sd-btn--lg" style={{ marginTop: 8 }}>Back to Home</a>
      </div>
    );
  }
}
