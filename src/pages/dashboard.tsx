import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Boxes,
  ShoppingCart,
  Truck,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { getRoleDisplayName } from '@/lib/permissions';
import { fetchDashboardStats } from '@/services/inventory';

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    productCount: number;
    totalStock: number;
    warehouseCount: number;
    lowStockCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.organizationId) return;
    fetchDashboardStats(user.organizationId)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.organizationId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Welcome back, {user?.fullName?.split(' ')[0] || 'there'}!
        </h2>
        <p className="text-muted-foreground">
          Here's what's happening in {user?.organizationName || 'your organization'} today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Products"
          value={loading ? '—' : String(stats?.productCount ?? 0)}
          icon={Package}
          trend="in catalog"
          trendType="neutral"
        />
        <StatCard
          title="Items in Stock"
          value={loading ? '—' : String(stats?.totalStock ?? 0)}
          icon={Boxes}
          trend="total units"
          trendType="neutral"
        />
        <StatCard
          title="Warehouses"
          value={loading ? '—' : String(stats?.warehouseCount ?? 0)}
          icon={Building2}
          trend="active locations"
          trendType="neutral"
        />
        <StatCard
          title="Low Stock Items"
          value={loading ? '—' : String(stats?.lowStockCount ?? 0)}
          icon={AlertTriangle}
          trend={stats && stats.lowStockCount > 0 ? 'needs attention' : 'all good'}
          trendType={stats && stats.lowStockCount > 0 ? 'down' : 'up'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Inventory movements and order updates will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                No activity yet
              </p>
              <p className="text-xs text-muted-foreground/70">
                Activity feed will be available once stock movements are implemented in a future phase.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump to common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickAction label="View Products" to="/products" icon={Package} />
            <QuickAction label="Manage Categories" to="/categories" icon={Package} />
            <QuickAction label="View Warehouses" to="/warehouses" icon={Building2} />
            <QuickAction label="Purchase Orders" to="/purchase-orders" icon={ShoppingCart} />
            <QuickAction label="Sales Orders" to="/sales-orders" icon={Truck} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 pt-6">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium">
              Products, categories, and warehouses are now available.
            </p>
            <p className="text-xs text-muted-foreground">
              Your account is set up as <strong>{user?.role ? getRoleDisplayName(user.role) : 'Unassigned'}</strong> in{' '}
              <strong>{user?.organizationName || 'your organization'}</strong>. Purchase orders, sales orders, and stock movements will be available in the next phase.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendType,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: string;
  trendType: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        <div className="mt-1 flex items-center gap-1 text-xs">
          {trendType === 'up' && <ArrowUpRight className="h-3 w-3 text-green-500" />}
          {trendType === 'down' && <ArrowDownRight className="h-3 w-3 text-red-500" />}
          <span className={trendType === 'neutral' ? 'text-muted-foreground' : ''}>
            {trend}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  label,
  to,
  icon: Icon,
}: {
  label: string;
  to: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-md border p-3 text-sm font-medium transition-colors hover:bg-accent"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </Link>
  );
}
