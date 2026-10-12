import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Truck,
  Users,
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
import { SalesOrderFormDialog } from '@/components/sales-orders/sales-order-form-dialog';
import { useAuth } from '@/hooks/use-auth';
import {
  fetchSalesOrders,
  formatSOStatus,
  getSOStatusColor,
  formatPaymentStatus,
  getPaymentStatusColor,
} from '@/services/sales-orders';
import { fetchCustomers } from '@/services/customers';
import { fetchWarehouses, fetchProducts } from '@/services/inventory';
import type { SalesOrder, Customer, Warehouse, Product } from '@/types';

export function SalesOrdersPage() {
  const { user } = useAuth();
  const canCreate = user?.permissions.includes('sales.create');

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
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
      const { data, total: t } = await fetchSalesOrders({
        search,
        status: statusFilter,
        page,
        page_size: pageSize,
      });
      setOrders(data);
      setTotal(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales orders');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchCustomers({ page: 1, page_size: 100 }).then((r) => setCustomers(r.data)).catch(() => {});
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
          <h2 className="text-2xl font-bold tracking-tight">Sales Orders</h2>
          <p className="text-sm text-muted-foreground">{total} orders in your system</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Sales Order
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by SO number..."
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
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="PARTIALLY_FULFILLED">Partially Fulfilled</SelectItem>
            <SelectItem value="FULFILLED">Fulfilled</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState message="Loading sales orders..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No sales orders found"
              message={search || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Get started by creating your first sales order.'}
              action={canCreate && !search && statusFilter === 'all' ? (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> New Sales Order
                </Button>
              ) : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SO Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
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
                    <TableCell className="text-sm">
                      {so.customer ? (
                        <Link to={`/customers/${so.customer.id}`} className="hover:text-primary">
                          {so.customer.company_name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {so.warehouse?.name || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(so.order_date)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {so.delivery_date ? formatDate(so.delivery_date) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getSOStatusColor(so.status)}>
                        {formatSOStatus(so.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentStatusColor(so.payment_status)}>
                        {formatPaymentStatus(so.payment_status)}
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

      <SalesOrderFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={load}
        customers={customers}
        warehouses={warehouses}
        products={products}
      />
    </div>
  );
}
