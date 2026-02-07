/**
 * Dashboard Shell Component
 *
 * Main layout container for the dashboard.
 * Manages sidebar state and provides structure for nested routes.
 */

import * as React from "react";
import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils.js";
import { Sidebar } from "./sidebar.js";
import { MatrixRain } from "@/components/matrix-rain.js";
import { IconX, IconHome, IconAgents, IconTerminal, IconHistory } from "@/components/icons/index.js";
import { NavLink } from "react-router-dom";

const mobileNavItems = [
  { label: "Home", href: "/dashboard", icon: <IconHome size={20} /> },
  { label: "Agents", href: "/dashboard/agents", icon: <IconAgents size={20} /> },
  { label: "Console", href: "/dashboard/console", icon: <IconTerminal size={20} /> },
  { label: "Runs", href: "/dashboard/runs", icon: <IconHistory size={20} /> },
];

export function DashboardShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const toggleSidebar = React.useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleMobileMenu = React.useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = React.useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Matrix Rain Background */}
      <MatrixRain opacity={0.04} />

      {/* Desktop Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[var(--z-overlay)] bg-black/70 lg:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-out Menu */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "fixed inset-y-0 left-0 z-[var(--z-modal)] w-[280px] bg-black/95 backdrop-blur-md border-r border-[var(--stroke)]",
          "transform transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out)]",
          "lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-[var(--header-height)] flex items-center justify-between px-4 border-b border-[var(--stroke)]">
          <span className="font-semibold text-[var(--accent)] matrix-text-glow">TechTideAI</span>
          <button
            type="button"
            onClick={closeMobileMenu}
            className="p-2 -mr-2 rounded-lg text-[var(--muted)] hover:bg-[var(--surface-1)] hover:text-[var(--accent)]"
            aria-label="Close menu"
          >
            <IconX size={20} />
          </button>
        </div>
        <nav className="py-4 px-3">
          <ul className="space-y-1">
            {mobileNavItems.map((item) => (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  end={item.href === "/dashboard"}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      "hover:bg-[var(--accent)]/5",
                      isActive
                        ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "text-[var(--muted-strong)]",
                    )
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main Content Area */}
      <main
        className={cn(
          "relative z-10 min-h-screen transition-[margin] duration-[var(--duration-normal)] ease-[var(--ease-out)]",
          "lg:ml-[var(--sidebar-width)]",
          sidebarCollapsed && "lg:ml-[var(--sidebar-collapsed)]",
        )}
      >
        <Outlet context={{ onMobileMenuToggle: toggleMobileMenu }} />
      </main>
    </div>
  );
}

/**
 * Type for dashboard shell outlet context
 */
export interface DashboardContextType {
  onMobileMenuToggle: () => void;
}
