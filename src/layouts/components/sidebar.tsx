import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft, Boxes, X } from 'lucide-react';
import { NAV_SECTIONS } from '@/lib/navigation';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();

  const hasPermission = (perm?: string) => {
    if (!perm) return true;
    return user?.permissions.includes(perm as never) ?? false;
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-300 ease-in-out',
          collapsed ? 'w-[68px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo / brand */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link to="/dashboard" className="flex items-center gap-2 overflow-hidden">
            <Boxes className="h-7 w-7 shrink-0 text-primary" />
            {!collapsed && (
              <span className="text-lg font-bold tracking-tight">StockPilot</span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 lg:hidden"
            onClick={onCloseMobile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-6">
            {NAV_SECTIONS.map((section) => {
              const visibleItems = section.items.filter((item) =>
                hasPermission(item.permission),
              );
              if (visibleItems.length === 0) return null;
              return (
                <div key={section.title}>
                  {!collapsed && (
                    <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.title}
                    </p>
                  )}
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const active = location.pathname === item.to;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={onCloseMobile}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            active
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                            collapsed && 'justify-center',
                          )}
                          title={collapsed ? item.label : undefined}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Collapse toggle */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className={cn(
              'hidden w-full text-muted-foreground hover:text-foreground lg:flex',
              collapsed ? 'justify-center' : 'justify-start',
            )}
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform',
                collapsed && 'rotate-180',
              )}
            />
            {!collapsed && <span className="ml-2">Collapse</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
