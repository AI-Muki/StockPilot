import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/layouts/components/sidebar';
import { Navbar } from '@/layouts/components/navbar';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div
        className={cn(
          'flex min-h-screen flex-col transition-all duration-300 ease-in-out',
          collapsed ? 'lg:pl-[68px]' : 'lg:pl-64',
        )}
      >
        <Navbar
          onOpenMobileNav={() => setMobileOpen(true)}
          sidebarCollapsed={collapsed}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
