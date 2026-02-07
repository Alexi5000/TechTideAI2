/**
 * Sidebar Component
 *
 * Persistent navigation sidebar for the dashboard.
 * Matrix dark theme with green accents and glass effect.
 */

import { NavLink, Link } from "react-router-dom";
import { cn } from "@/lib/utils.js";
import {
  IconHome,
  IconAgents,
  IconTerminal,
  IconHistory,
  IconChevronLeft,
  IconChevronRight,
} from "@/components/icons/index.js";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <IconHome size={20} /> },
  { label: "Agents", href: "/dashboard/agents", icon: <IconAgents size={20} /> },
  { label: "Console", href: "/dashboard/console", icon: <IconTerminal size={20} /> },
  { label: "Runs", href: "/dashboard/runs", icon: <IconHistory size={20} /> },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-[var(--z-sticky)] h-screen bg-black/80 backdrop-blur-md border-r border-[var(--stroke)]",
        "flex flex-col transition-[width] duration-[var(--duration-normal)] ease-[var(--ease-out)]",
        "hidden lg:flex",
        collapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-width)]",
      )}
    >
      {/* Logo */}
      <div className="h-[var(--header-height)] flex items-center px-4 border-b border-[var(--stroke)]">
        <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="h-9 w-9 rounded-xl bg-[var(--accent)] shadow-[var(--shadow-glow)] flex-shrink-0" />
          <span
            className={cn(
              "font-semibold text-[var(--accent)] whitespace-nowrap transition-opacity duration-[var(--duration-fast)]",
              collapsed ? "opacity-0 w-0" : "opacity-100",
            )}
          >
            TechTideAI
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                end={item.href === "/dashboard"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    "hover:bg-[var(--accent)]/5 hover:text-[var(--accent)]",
                    isActive
                      ? "bg-[var(--accent)]/10 text-[var(--accent)] shadow-[inset_3px_0_0_var(--accent)]"
                      : "text-[var(--muted)]",
                    collapsed && "justify-center px-0",
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span
                  className={cn(
                    "whitespace-nowrap transition-opacity duration-[var(--duration-fast)]",
                    collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100",
                  )}
                >
                  {item.label}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-[var(--stroke)]">
        <button
          onClick={onToggleCollapse}
          className={cn(
            "flex items-center justify-center w-full py-2.5 rounded-lg text-sm font-medium",
            "text-[var(--muted)] hover:bg-[var(--accent)]/5 hover:text-[var(--accent)] transition-colors",
            collapsed && "px-0",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <IconChevronRight size={20} /> : <IconChevronLeft size={20} />}
          <span
            className={cn(
              "ml-3 whitespace-nowrap transition-opacity duration-[var(--duration-fast)]",
              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100",
            )}
          >
            Collapse
          </span>
        </button>
      </div>
    </aside>
  );
}
