import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import App from "./App.js";
import { ErrorBoundary } from "./components/error-boundary.js";
import { ToastProvider } from "./contexts/toast-context.js";
import { DashboardShell } from "./components/layout/index.js";
import { PageSkeleton } from "./components/page-skeleton.js";
import { NotFoundPage } from "./pages/not-found.js";
import "./index.css";

// Lazy load dashboard pages for code splitting
const DashboardHome = React.lazy(() =>
  import("./pages/dashboard-home.js").then((m) => ({ default: m.DashboardHome })),
);
const AgentsPage = React.lazy(() =>
  import("./pages/agents.js").then((m) => ({ default: m.AgentsPage })),
);
const ConsoleIndexPage = React.lazy(() =>
  import("./pages/console-index.js").then((m) => ({ default: m.ConsoleIndexPage })),
);
const ConsolePage = React.lazy(() =>
  import("./pages/console.js").then((m) => ({ default: m.ConsolePage })),
);
const RunsPage = React.lazy(() =>
  import("./pages/runs.js").then((m) => ({ default: m.RunsPage })),
);

function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

function ConsoleRedirect() {
  const { agentId } = useParams();
  return <Navigate to={`/dashboard/console/${agentId}`} replace />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
          {/* Marketing / Landing */}
          <Route path="/" element={<App />} />

          {/* Dashboard with Layout Shell */}
          <Route path="/dashboard" element={<DashboardShell />}>
            <Route index element={<LazyRoute><DashboardHome /></LazyRoute>} />
            <Route path="agents" element={<LazyRoute><AgentsPage /></LazyRoute>} />
            <Route path="console" element={<LazyRoute><ConsoleIndexPage /></LazyRoute>} />
            <Route path="console/:agentId" element={<LazyRoute><ConsolePage /></LazyRoute>} />
            <Route path="runs" element={<LazyRoute><RunsPage /></LazyRoute>} />
          </Route>

          {/* Redirects from old routes */}
          <Route path="/agents" element={<Navigate to="/dashboard/agents" replace />} />
          <Route path="/console/:agentId" element={<ConsoleRedirect />} />
          <Route path="/runs" element={<Navigate to="/dashboard/runs" replace />} />

          {/* 404 - Not Found */}
          <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
