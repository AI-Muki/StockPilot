import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Users,
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
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog';
import { useAuth } from '@/hooks/use-auth';
import { fetchCustomerById, fetchCustomerStats } from '@/services/customers';
import { fetchSalesOrders, formatSOStatus, getSOStatusColor } from '@/services/sales-orders';
import type { Customer, SalesOrder } from '@/types';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.permissions.includes('customers.manage');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<{
    totalOrders: number;
    totalSpending: number;
    openOrders: number;
    fulfilledOrders: number;
  } | null>(null);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchCustomerById(id),
      fetchCustomerStats(id),
      fetchSalesOrders({ customerId: id, page: 1, page_size: 50 }),
    ])
      .then(([c, st, ords]) => {
        setCustomer(c);
        setStats(st);
        setOrders(ords.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load customer'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <LoadingState message="Loading customer..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!customer) return <EmptyState icon={Users} title="Customer not found" message="This customer may have been deleted." />;

  const formatPrice = (val: number) => `$${val.toFixed(2)}`;
  const formatDate = (val: string) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{customer.company_name}</h2>
              <Badge
                className={
                  customer.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400'
                }
              >
                {customer.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {customer.contact_person || 'No contact person'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/sales-orders')}>
            <Plus className="mr-2 h-4 w-4" /> New Order
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </div>

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.openOrders ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fulfilled</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.fulfilledOrders ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <InfoRow icon={Users} label="Company" value={customer.company_name} />
              <InfoRow icon={Mail} label="Email" value={customer.email || '—'} />
              <InfoRow icon={Phone} label="Phone" value={customer.phone || '—'} />
              <InfoRow icon={MapPin} label="Address" value={[customer.address, customer.city, customer.country].filter(Boolean).join(', ') || '—'} />
              <InfoRow icon={FileText} label="Tax ID" value={customer.tax_id || '—'} />
              {customer.notes && (
                <div className="border-t pt-3">
                  <p className="mb-1 text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{customer.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales Orders</CardTitle>
            <CardDescription>{orders.length} orders from this customer</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="No orders yet" message="Sales orders from this customer will appear here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((so) => (
                    <TableRow key={so.id}>
                      <TableCell>
                        <Link to={`/sales-orders/${so.id}`} className="font-medium hover:text-primary">
                          {so.so_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(so.order_date)}</TableCell>
                      <TableCell>
                        <Badge className={getSOStatusColor(so.status)}>
                          {formatSOStatus(so.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatPrice(so.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={load}
        customer={customer}
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
