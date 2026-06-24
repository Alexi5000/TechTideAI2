import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.js";
import { ErrorBoundary } from "./components/error-boundary.js";
import { ToastProvider } from "./contexts/toast-context.js";
import { DashboardShell } from "./components/layout/index.js";
import { DashboardHome } from "./pages/dashboard-home.js";
import { AgentsPage } from "./pages/agents.js";
import { ConsolePage } from "./pages/console.js";
import { RunsPage } from "./pages/runs.js";
import { EvalsPage } from "./pages/evals.js";
import { ApprovalsPage } from "./pages/approvals.js";
import { SprintsPage } from "./pages/sprints.js";
import { NotFoundPage } from "./pages/not-found.js";
import "./index.css";

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
            <Route index element={<DashboardHome />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="console/:agentId" element={<ConsolePage />} />
            <Route path="runs" element={<RunsPage />} />
            <Route path="evals" element={<EvalsPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="sprints" element={<SprintsPage />} />
          </Route>

          {/* Redirects from old routes */}
          <Route path="/agents" element={<Navigate to="/dashboard/agents" replace />} />
          <Route path="/console/:agentId" element={<Navigate to="/dashboard/console/:agentId" replace />} />
          <Route path="/runs" element={<Navigate to="/dashboard/runs" replace />} />
          <Route path="/evals" element={<Navigate to="/dashboard/evals" replace />} />
          <Route path="/approvals" element={<Navigate to="/dashboard/approvals" replace />} />
          <Route path="/sprints" element={<Navigate to="/dashboard/sprints" replace />} />

          {/* 404 - Not Found */}
          <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
