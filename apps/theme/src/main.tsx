import { StrictMode, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { readTheme, resolveTheme } from "./theme";
// Apply the saved or system theme before the first render to avoid a flash.
document.documentElement.dataset.theme = resolveTheme(readTheme());
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="error-panel fatal">
        <h1>页面遇到异常</h1>
        <p>请刷新页面后重试。</p>
        <button
          className="button button-primary"
          onClick={() => location.reload()}
        >
          重新加载
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
