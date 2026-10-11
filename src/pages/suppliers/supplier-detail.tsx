import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Plus,
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
import { SupplierFormDialog } from '@/components/suppliers/supplier-form-dialog';
import { useAuth } from '@/hooks/use-auth';
import { fetchSupplierById, fetchSupplierStats } from '@/services/suppliers';
import { fetchPurchaseOrders, formatPOStatus, getPOStatusColor } from '@/services/purchase-orders';
import type { Supplier, PurchaseOrder } from '@/types';

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.permissions.includes('suppliers.manage');

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [stats, setStats] = useState<{
    totalOrders: number;
    totalSpending: number;
    pendingOrders: number;
    receivedOrders: number;
  } | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchSupplierById(id),
      fetchSupplierStats(id),
      fetchPurchaseOrders({ supplierId: id, page: 1, page_size: 50 }),
    ])
      .then(([s, st, ords]) => {
        setSupplier(s);
        setStats(st);
        setOrders(ords.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load supplier'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <LoadingState message="Loading supplier..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!supplier) return <EmptyState icon={Building2} title="Supplier not found" message="This supplier may have been deleted." />;

  const formatPrice = (val: number) => `$${val.toFixed(2)}`;
  const formatDate = (val: string) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/suppliers')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{supplier.company_name}</h2>
              <Badge
                className={
                  supplier.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400'
                }
              >
                {supplier.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {supplier.contact_person || 'No contact person'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/purchase-orders')}>
            <Plus className="mr-2 h-4 w-4" /> New Order
          </Button>
          {canEdit && (
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.totalOrders ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spending</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats ? formatPrice(stats.totalSpending) : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.pendingOrders ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Received</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.receivedOrders ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Supplier Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <InfoRow icon={Building2} label="Company" value={supplier.company_name} />
              <InfoRow icon={Mail} label="Email" value={supplier.email || '—'} />
              <InfoRow icon={Phone} label="Phone" value={supplier.phone || '—'} />
              <InfoRow icon={MapPin} label="Address" value={[supplier.address, supplier.city, supplier.country].filter(Boolean).join(', ') || '—'} />
              <InfoRow icon={FileText} label="Tax ID" value={supplier.tax_id || '—'} />
              <InfoRow icon={FileText} label="Payment Terms" value={supplier.payment_terms || '—'} />
              {supplier.notes && (
                <div className="border-t pt-3">
                  <p className="mb-1 text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{supplier.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Purchase Orders</CardTitle>
            <CardDescription>{orders.length} orders with this supplier</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="No orders yet" message="Purchase orders with this supplier will appear here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell>
                        <Link to={`/purchase-orders/${po.id}`} className="font-medium hover:text-primary">
                          {po.po_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(po.order_date)}</TableCell>
                      <TableCell>
                        <Badge className={getPOStatusColor(po.status)}>
                          {formatPOStatus(po.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatPrice(po.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <SupplierFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={load}
        supplier={supplier}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
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
