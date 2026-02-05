import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import { AgentsPage } from "./pages/agents";
import { ConsolePage } from "./pages/console";
import { RunsPage } from "./pages/runs";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/console/:agentId" element={<ConsolePage />} />
        <Route path="/runs" element={<RunsPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
