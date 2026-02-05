/**
 * Topbar Component
 *
 * Page header with title, breadcrumbs, and action slot.
 * Includes mobile menu toggle.
 */

import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { IconMenu, IconChevronRight, IconUser, IconSettings, IconExternalLink } from "@/components/icons/index.js";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu.js";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopbarProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  onMobileMenuToggle?: () => void;
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);

    // Don't add link for current page (last segment)
    if (currentPath === pathname) {
      items.push({ label });
    } else {
      items.push({ label, href: currentPath });
    }
  }

  return items;
}

export function Topbar({ title, breadcrumbs, actions, onMobileMenuToggle }: TopbarProps) {
  const location = useLocation();
  const crumbs = breadcrumbs ?? generateBreadcrumbs(location.pathname);

  return (
    <header className="h-[var(--header-height)] flex items-center justify-between px-6 border-b border-[var(--stroke)] bg-[var(--surface-2)]/80 backdrop-blur-sm sticky top-0 z-[var(--z-sticky)]">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 -ml-2 rounded-lg text-[var(--muted-strong)] hover:bg-[var(--surface-1)] transition-colors"
            aria-label="Open menu"
          >
            <IconMenu size={20} />
          </button>
        )}

        <div>
          {/* Breadcrumbs */}
          {crumbs.length > 1 && (
            <nav aria-label="Breadcrumb" className="mb-0.5">
              <ol className="flex items-center gap-1 text-xs text-[var(--muted)]">
                {crumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.label + index}>
                    {index > 0 && <IconChevronRight size={12} className="text-[var(--stroke)]" />}
                    <li>
                      {crumb.href ? (
                        <Link
                          to={crumb.href}
                          className="hover:text-[var(--muted-strong)] transition-colors"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="text-[var(--muted-strong)]">{crumb.label}</span>
                      )}
                    </li>
                  </React.Fragment>
                ))}
              </ol>
            </nav>
          )}

          {/* Title */}
          <h1 className="text-lg font-semibold text-[var(--ink)]">{title}</h1>
        </div>
      </div>

      {/* Actions + User Menu */}
      <div className="flex items-center gap-2">
        {actions}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center hover:bg-[var(--accent)]/20 transition-colors"
              aria-label="User menu"
            >
              <IconUser size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <IconSettings size={16} />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => window.open("https://docs.techtide.ai", "_blank")}
            >
              <IconExternalLink size={16} />
              <span>Documentation</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
