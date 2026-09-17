import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Package,
  Boxes,
  DollarSign,
  Activity,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState, ErrorState, EmptyState } from '@/components/states/states';
import { WarehouseFormDialog } from '@/components/warehouses/warehouse-form-dialog';
import { useAuth } from '@/hooks/use-auth';
import { fetchWarehouseById, fetchWarehouseInventory, fetchWarehouseStats } from '@/services/inventory';
import type { Warehouse, WarehouseInventory } from '@/types';

export function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canUpdate = user?.permissions.includes('warehouses.manage');

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [inventory, setInventory] = useState<WarehouseInventory[]>([]);
  const [stats, setStats] = useState<{ productCount: number; totalUnits: number; totalValue: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchWarehouseById(id),
      fetchWarehouseInventory(id),
      fetchWarehouseStats(id),
    ])
      .then(([wh, inv, st]) => {
        setWarehouse(wh);
        setInventory(inv);
        setStats(st);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load warehouse'))
      .finally(() => setLoading(false));
  }, [id]);

  const reload = () => {
    if (!id) return;
    Promise.all([fetchWarehouseById(id), fetchWarehouseInventory(id), fetchWarehouseStats(id)])
      .then(([wh, inv, st]) => {
        setWarehouse(wh);
        setInventory(inv);
        setStats(st);
      })
      .catch(() => {});
  };

  if (loading) return <LoadingState message="Loading warehouse..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!warehouse) return <EmptyState icon={Building2} title="Warehouse not found" />;

  const formatPrice = (val: number) => `$${val.toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/warehouses')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{warehouse.name}</h2>
              <Badge variant={warehouse.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {warehouse.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{warehouse.code}</p>
          </div>
        </div>
        {canUpdate && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit Warehouse
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Products Stored</CardDescription>
            <CardTitle className="text-2xl">{stats?.productCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Units</CardDescription>
            <CardTitle className="text-2xl">{stats?.totalUnits.toLocaleString() ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inventory Value</CardDescription>
            <CardTitle className="text-2xl">{formatPrice(stats?.totalValue ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Info + Inventory */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Warehouse Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {warehouse.address && (
              <InfoRow icon={MapPin} label="Address" value={`${warehouse.address}${warehouse.city ? `, ${warehouse.city}` : ''}${warehouse.country ? `, ${warehouse.country}` : ''}`} />
            )}
            {warehouse.manager && <InfoRow icon={User} label="Manager" value={warehouse.manager} />}
            {warehouse.phone && <InfoRow icon={Phone} label="Phone" value={warehouse.phone} />}
            {warehouse.email && <InfoRow icon={Mail} label="Email" value={warehouse.email} />}
            {warehouse.capacity && <InfoRow icon={Building2} label="Capacity" value={`${warehouse.capacity.toLocaleString()} units`} />}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>Products in this warehouse</CardDescription>
          </CardHeader>
          <CardContent>
            {inventory.length === 0 ? (
              <EmptyState icon={Package} title="No inventory" message="No products are stocked in this warehouse." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>On Hand</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.slice(0, 20).map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.product?.name || '—'}</TableCell>
                      <TableCell className="font-mono text-sm">{inv.product?.sku || '—'}</TableCell>
                      <TableCell>{inv.quantity_on_hand}</TableCell>
                      <TableCell>{inv.quantity_reserved}</TableCell>
                      <TableCell className="font-medium">{inv.quantity_on_hand - inv.quantity_reserved}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {inventory.length > 20 && (
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Showing 20 of {inventory.length} products
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Stock movements at this warehouse</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Activity} title="No activity yet" message="Stock movements will appear here once the movements module is implemented." />
        </CardContent>
      </Card>

      <WarehouseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={reload}
        warehouse={warehouse}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
