import { Link, Outlet } from 'react-router-dom';
import { Boxes } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:grid lg:grid-cols-2">
      {/* Left panel — branding */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative z-10 flex items-center gap-2 text-primary-foreground">
          <Boxes className="h-8 w-8" />
          <span className="text-xl font-bold">StockPilot</span>
        </div>
        <div className="relative z-10 space-y-6 text-primary-foreground">
          <h1 className="text-4xl font-bold leading-tight">
            Inventory management
            <br />
            built for scale.
          </h1>
          <p className="max-w-md text-lg text-primary-foreground/80">
            Track products, manage warehouses, automate purchase and sales
            orders, and get real-time analytics — all in one place.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <p className="text-3xl font-bold">99.9%</p>
              <p className="text-sm text-primary-foreground/70">Uptime</p>
            </div>
            <div>
              <p className="text-3xl font-bold">10k+</p>
              <p className="text-sm text-primary-foreground/70">Products managed</p>
            </div>
            <div>
              <p className="text-3xl font-bold">500+</p>
              <p className="text-sm text-primary-foreground/70">Teams onboarded</p>
            </div>
          </div>
        </div>
        <p className="relative z-10 text-sm text-primary-foreground/60">
          (c) 2026 StockPilot. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <Boxes className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold">StockPilot</span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="hidden justify-end p-6 lg:flex">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
