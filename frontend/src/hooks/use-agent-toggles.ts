/**
 * Agent Toggle State Hook
 *
 * Manages agent enabled/disabled state persisted in localStorage.
 */

import { useState, useCallback } from "react";

const STORAGE_KEY = "agent-toggles";

interface AgentToggleState {
  [agentId: string]: boolean;
}

function loadToggles(): AgentToggleState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AgentToggleState) : {};
  } catch {
    return {};
  }
}

function saveToggles(state: AgentToggleState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useAgentToggles() {
  const [toggles, setToggles] = useState<AgentToggleState>(loadToggles);

  const isEnabled = useCallback(
    (agentId: string) => toggles[agentId] ?? true,
    [toggles],
  );

  const setToggle = useCallback((agentId: string, enabled: boolean) => {
    setToggles((prev) => {
      const next = { ...prev, [agentId]: enabled };
      saveToggles(next);
      return next;
    });
  }, []);

  const toggleAll = useCallback((enabled: boolean, agentIds: string[]) => {
    setToggles((prev) => {
      const next = { ...prev };
      for (const id of agentIds) {
        next[id] = enabled;
      }
      saveToggles(next);
      return next;
    });
  }, []);

  return { isEnabled, setToggle, toggleAll, toggles };
}
