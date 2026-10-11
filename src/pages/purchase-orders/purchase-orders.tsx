import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Building2,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { PurchaseOrderFormDialog } from '@/components/purchase-orders/purchase-order-form-dialog';
import { useAuth } from '@/hooks/use-auth';
import { fetchPurchaseOrders, formatPOStatus, getPOStatusColor } from '@/services/purchase-orders';
import { fetchSuppliers } from '@/services/suppliers';
import { fetchWarehouses, fetchProducts } from '@/services/inventory';
import type { PurchaseOrder, Supplier, Warehouse, Product } from '@/types';

export function PurchaseOrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCreate = user?.permissions.includes('purchases.create');

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, total: t } = await fetchPurchaseOrders({
        search,
        status: statusFilter,
        page,
        page_size: pageSize,
      });
      setOrders(data);
      setTotal(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchSuppliers({ page: 1, page_size: 100 }).then((r) => setSuppliers(r.data)).catch(() => {});
    fetchWarehouses().then(setWarehouses).catch(() => {});
    fetchProducts({ page: 1, page_size: 100 }).then((r) => setProducts(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter, page, load]);

  const totalPages = Math.ceil(total / pageSize);
  const formatPrice = (val: number) => `$${val.toFixed(2)}`;
  const formatDate = (val: string) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Purchase Orders</h2>
          <p className="text-sm text-muted-foreground">{total} orders in your system</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Purchase Order
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by PO number..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="ORDERED">Ordered</SelectItem>
            <SelectItem value="PARTIALLY_RECEIVED">Partially Received</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState message="Loading purchase orders..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No purchase orders found"
              message={search || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Get started by creating your first purchase order.'}
              action={canCreate && !search && statusFilter === 'all' ? (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> New Purchase Order
                </Button>
              ) : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected</TableHead>
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
                    <TableCell className="text-sm">
                      {po.supplier ? (
                        <Link to={`/suppliers/${po.supplier.id}`} className="hover:text-primary">
                          {po.supplier.company_name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {po.warehouse?.name || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(po.order_date)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {po.expected_delivery ? formatDate(po.expected_delivery) : '—'}
                    </TableCell>
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

      {!loading && total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <PurchaseOrderFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={load}
        suppliers={suppliers}
        warehouses={warehouses}
        products={products}
      />
    </div>
  );
}
