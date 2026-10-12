import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  Users,
  Calendar,
  DollarSign,
  PackageCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  Package,
  FileText,
  CreditCard,
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState, ErrorState, EmptyState } from '@/components/states/states';
import { FulfillDialog } from '@/components/sales-orders/fulfill-dialog';
import { useAuth } from '@/hooks/use-auth';
import {
  fetchSalesOrderById,
  confirmSalesOrder,
  cancelSalesOrder,
  deleteSalesOrder,
  updatePaymentStatus,
  formatSOStatus,
  getSOStatusColor,
  formatPaymentStatus,
  getPaymentStatusColor,
} from '@/services/sales-orders';
import type { SalesOrderWithItems, PaymentStatus } from '@/types';

export function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = user?.permissions.includes('sales.create');
  const canFulfill = user?.permissions.includes('sales.fulfill');

  const [so, setSo] = useState<SalesOrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [fulfillOpen, setFulfillOpen] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchSalesOrderById(id)
      .then((data) => setSo(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load sales order'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleConfirm = async () => {
    if (!id) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await confirmSalesOrder(id, user?.id ?? null);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to confirm order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!confirm('Cancel this order? Reserved stock will be released.')) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await cancelSalesOrder(id, user?.id ?? null);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !so) return;
    if (!confirm(`Delete ${so.so_number}? This cannot be undone.`)) return;
    try {
      await deleteSalesOrder(id);
      navigate('/sales-orders');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete order');
    }
  };

  const handlePaymentStatusChange = async (value: string) => {
    if (!id) return;
    try {
      await updatePaymentStatus(id, value as PaymentStatus);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update payment status');
    }
  };

  if (loading) return <LoadingState message="Loading sales order..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!so) return <EmptyState icon={Truck} title="Order not found" message="This sales order may have been deleted." />;

  const formatPrice = (val: number) => `$${val.toFixed(2)}`;
  const formatDate = (val: string) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const totalOrdered = (so.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const totalFulfilled = (so.items ?? []).reduce((sum, item) => sum + item.fulfilled_quantity, 0);
  const totalReserved = (so.items ?? []).reduce((sum, item) => sum + item.reserved_quantity, 0);
  const hasFulfillableItems = (so.items ?? []).some((item) => item.fulfilled_quantity < item.quantity);

  const canConfirm = so.status === 'DRAFT' && canCreate;
  const canCancel = ['CONFIRMED', 'PROCESSING', 'PARTIALLY_FULFILLED'].includes(so.status) && canCreate;
  const canFulfillAction = ['CONFIRMED', 'PROCESSING', 'PARTIALLY_FULFILLED'].includes(so.status) && canFulfill && hasFulfillableItems;
  const canDeleteSO = so.status === 'DRAFT' && canCreate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/sales-orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{so.so_number}</h2>
              <Badge className={getSOStatusColor(so.status)}>
                {formatSOStatus(so.status)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(so.created_at)}
              {so.created_by_profile && ` by ${so.created_by_profile.email}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canConfirm && (
            <Button size="sm" onClick={handleConfirm} disabled={actionLoading}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm & Reserve
            </Button>
          )}
          {canFulfillAction && (
            <Button size="sm" onClick={() => setFulfillOpen(true)}>
              <PackageCheck className="mr-2 h-4 w-4" /> Fulfill
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={actionLoading}>
              <XCircle className="mr-2 h-4 w-4" /> Cancel
            </Button>
          )}
          {canDeleteSO && (
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Subtotal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatPrice(so.subtotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tax</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatPrice(so.tax_amount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Discount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">-{formatPrice(so.discount_amount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatPrice(so.total)}</p>
            <p className="text-xs text-muted-foreground">{so.currency}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <InfoRow
                icon={Users}
                label="Customer"
                value={so.customer ? (
                  <Link to={`/customers/${so.customer.id}`} className="hover:text-primary">
                    {so.customer.company_name}
                  </Link>
                ) : '—'}
              />
              <InfoRow icon={Package} label="Warehouse" value={so.warehouse?.name || '—'} />
              <InfoRow icon={Calendar} label="Order Date" value={formatDate(so.order_date)} />
              <InfoRow
                icon={Calendar}
                label="Delivery Date"
                value={so.delivery_date ? formatDate(so.delivery_date) : '—'}
              />
              <InfoRow icon={DollarSign} label="Currency" value={so.currency} />
              <div className="flex items-start gap-3 border-t pt-3">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Payment Status</p>
                  {canCreate ? (
                    <Select value={so.payment_status} onValueChange={handlePaymentStatusChange}>
                      <SelectTrigger className="mt-1 h-8 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNPAID">Unpaid</SelectItem>
                        <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={getPaymentStatusColor(so.payment_status)}>
                      {formatPaymentStatus(so.payment_status)}
                    </Badge>
                  )}
                </div>
              </div>
              {so.notes && (
                <div className="border-t pt-3">
                  <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" /> Notes
                  </p>
                  <p className="text-sm">{so.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
            <CardDescription>
              {totalOrdered} ordered, {totalReserved} reserved, {totalFulfilled} fulfilled
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!so.items || so.items.length === 0) ? (
              <EmptyState icon={Package} title="No items" message="This order has no line items." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Fulfilled</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {so.items.map((item) => {
                    const remaining = item.quantity - item.fulfilled_quantity;
                    const fullyFulfilled = remaining === 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Link to={`/products/${item.product_id}`} className="font-medium hover:text-primary">
                            {item.product?.name ?? 'Unknown'}
                          </Link>
                          <p className="text-xs text-muted-foreground">{item.product?.sku ?? ''}</p>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right text-blue-600 dark:text-blue-400">
                          {item.reserved_quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={fullyFulfilled ? 'font-medium text-green-600 dark:text-green-400' : ''}>
                            {item.fulfilled_quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {remaining > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">{remaining}</span>
                          ) : (
                            <CheckCircle2 className="ml-auto h-4 w-4 text-green-600 dark:text-green-400" />
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatPrice(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-medium">{formatPrice(item.line_total)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <FulfillDialog
        open={fulfillOpen}
        onOpenChange={setFulfillOpen}
        onFulfilled={load}
        soId={so.id}
        items={so.items ?? []}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: React.ReactNode }) {
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
