import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingCart,
  Building2,
  Calendar,
  DollarSign,
  PackageCheck,
  Send,
  CheckCircle2,
  Truck,
  XCircle,
  Trash2,
  Package,
  FileText,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState, ErrorState, EmptyState } from '@/components/states/states';
import { ReceiveGoodsDialog } from '@/components/purchase-orders/receive-goods-dialog';
import { useAuth } from '@/hooks/use-auth';
import {
  fetchPurchaseOrderById,
  transitionPurchaseOrder,
  deletePurchaseOrder,
  formatPOStatus,
  getPOStatusColor,
  canTransition,
} from '@/services/purchase-orders';
import type { PurchaseOrderWithItems, PurchaseOrderStatus } from '@/types';

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canApprove = user?.permissions.includes('purchases.approve');
  const canReceive = user?.permissions.includes('purchases.receive');
  const canCreate = user?.permissions.includes('purchases.create');
  const canDelete = user?.permissions.includes('purchases.create');

  const [po, setPo] = useState<PurchaseOrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchPurchaseOrderById(id)
      .then((data) => setPo(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load purchase order'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleTransition = async (toStatus: PurchaseOrderStatus) => {
    if (!id) return;
    setActionError(null);
    try {
      await transitionPurchaseOrder(id, toStatus);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update order status');
    }
  };

  const handleDelete = async () => {
    if (!id || !po) return;
    if (!confirm(`Delete ${po.po_number}? This cannot be undone.`)) return;
    try {
      await deletePurchaseOrder(id);
      navigate('/purchase-orders');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete order');
    }
  };

  if (loading) return <LoadingState message="Loading purchase order..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!po) return <EmptyState icon={ShoppingCart} title="Order not found" message="This purchase order may have been deleted." />;

  const formatPrice = (val: number) => `$${val.toFixed(2)}`;
  const formatDate = (val: string) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const totalReceived = (po.items ?? []).reduce((sum, item) => sum + item.received_quantity, 0);
  const totalOrdered = (po.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const allReceived = (po.items ?? []).every((item) => item.received_quantity >= item.quantity);
  const hasReceivableItems = (po.items ?? []).some((item) => item.received_quantity < item.quantity);

  const canSubmit = canTransition(po.status, 'SUBMITTED') && canCreate;
  const canApproveAction = canTransition(po.status, 'APPROVED') && canApprove;
  const canOrder = canTransition(po.status, 'ORDERED') && canApprove;
  const canReceiveAction = canTransition(po.status, 'PARTIALLY_RECEIVED') || (po.status === 'ORDERED' && canReceive && hasReceivableItems);
  const canCancel = canTransition(po.status, 'CANCELLED') && canCreate;
  const canDeletePO = po.status === 'DRAFT' && canDelete;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/purchase-orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{po.po_number}</h2>
              <Badge className={getPOStatusColor(po.status)}>
                {formatPOStatus(po.status)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(po.created_at)}
              {po.created_by_profile && ` by ${po.created_by_profile.email}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSubmit && (
            <Button size="sm" variant="outline" onClick={() => handleTransition('SUBMITTED')}>
              <Send className="mr-2 h-4 w-4" /> Submit
            </Button>
          )}
          {canApproveAction && (
            <Button size="sm" variant="outline" onClick={() => handleTransition('APPROVED')}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
            </Button>
          )}
          {canOrder && (
            <Button size="sm" variant="outline" onClick={() => handleTransition('ORDERED')}>
              <Truck className="mr-2 h-4 w-4" /> Mark as Ordered
            </Button>
          )}
          {canReceiveAction && (po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') && (
            <Button size="sm" onClick={() => setReceiveOpen(true)}>
              <PackageCheck className="mr-2 h-4 w-4" /> Receive Goods
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="outline" onClick={() => handleTransition('CANCELLED')}>
              <XCircle className="mr-2 h-4 w-4" /> Cancel
            </Button>
          )}
          {canDeletePO && (
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
            <p className="text-xl font-bold">{formatPrice(po.subtotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tax</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatPrice(po.tax_amount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Discount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">-{formatPrice(po.discount_amount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{formatPrice(po.total)}</p>
            <p className="text-xs text-muted-foreground">{po.currency}</p>
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
                icon={Building2}
                label="Supplier"
                value={po.supplier ? (
                  <Link to={`/suppliers/${po.supplier.id}`} className="hover:text-primary">
                    {po.supplier.company_name}
                  </Link>
                ) : '—'}
              />
              <InfoRow icon={Package} label="Warehouse" value={po.warehouse?.name || '—'} />
              <InfoRow icon={Calendar} label="Order Date" value={formatDate(po.order_date)} />
              <InfoRow
                icon={Calendar}
                label="Expected Delivery"
                value={po.expected_delivery ? formatDate(po.expected_delivery) : '—'}
              />
              <InfoRow icon={DollarSign} label="Currency" value={po.currency} />
              {po.notes && (
                <div className="border-t pt-3">
                  <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" /> Notes
                  </p>
                  <p className="text-sm">{po.notes}</p>
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
              {totalOrdered} ordered, {totalReceived} received
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!po.items || po.items.length === 0) ? (
              <EmptyState icon={Package} title="No items" message="This order has no line items." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {po.items.map((item) => {
                    const remaining = item.quantity - item.received_quantity;
                    const fullyReceived = remaining === 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Link to={`/products/${item.product_id}`} className="font-medium hover:text-primary">
                            {item.product?.name ?? 'Unknown'}
                          </Link>
                          <p className="text-xs text-muted-foreground">{item.product?.sku ?? ''}</p>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          <span className={fullyReceived ? 'font-medium text-green-600 dark:text-green-400' : ''}>
                            {item.received_quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {remaining > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">{remaining}</span>
                          ) : (
                            <CheckCircle2 className="ml-auto h-4 w-4 text-green-600 dark:text-green-400" />
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatPrice(item.unit_cost)}</TableCell>
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

      <ReceiveGoodsDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        onReceived={load}
        poId={po.id}
        items={po.items ?? []}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: React.ReactNode }) {
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
