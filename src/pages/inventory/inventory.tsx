import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  DollarSign,
  Boxes,
  TrendingDown,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { useAuth } from '@/hooks/use-auth';
import { fetchInventoryList, getInventoryValue, computeStockStatus } from '@/services/inventory-engine';
import { fetchWarehouses } from '@/services/inventory';
import type { InventoryWithDetails, Warehouse } from '@/types';

type SortField = 'product_name' | 'product_sku' | 'quantity_on_hand' | 'available' | 'inventory_value';
type SortOrder = 'asc' | 'desc';

export function InventoryPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId!;

  const [items, setItems] = useState<InventoryWithDetails[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('product_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [valueStats, setValueStats] = useState<{ totalValue: number; totalUnits: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, stats] = await Promise.all([
        fetchInventoryList({
          orgId,
          search,
          warehouseId: warehouseFilter !== 'all' ? warehouseFilter : null,
          status: statusFilter,
          sort_by: sortBy,
          sort_order: sortOrder,
          page,
          page_size: pageSize,
        }),
        getInventoryValue(orgId),
      ]);
      setItems(result.data);
      setTotal(result.total);
      setValueStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [orgId, search, warehouseFilter, statusFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchWarehouses().then(setWarehouses).catch(() => {});
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, warehouseFilter, statusFilter, sortBy, sortOrder, page, load]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'IN_STOCK':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">In Stock</Badge>;
      case 'LOW_STOCK':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">Low Stock</Badge>;
      case 'OUT_OF_STOCK':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">Out of Stock</Badge>;
      case 'OVERSTOCKED':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400">Overstocked</Badge>;
      default:
        return <Badge variant="secondary">—</Badge>;
    }
  };

  const formatPrice = (val: number) => `$${val.toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
        <p className="text-sm text-muted-foreground">Stock levels across all warehouses</p>
      </div>

      {/* Value summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{valueStats ? formatPrice(valueStats.totalValue) : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Units</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{valueStats ? valueStats.totalUnits.toLocaleString() : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inventory Records</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by product name or SKU..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All warehouses</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="IN_STOCK">In Stock</SelectItem>
            <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
            <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
            <SelectItem value="OVERSTOCKED">Overstocked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState message="Loading inventory..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No inventory found"
              message={search || warehouseFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'No inventory records exist yet.'}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('product_name')}>
                      Product <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('product_sku')}>
                      SKU <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('quantity_on_hand')}>
                      On Hand <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('available')}>
                      Available <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Incoming</TableHead>
                  <TableHead className="text-right">Damaged</TableHead>
                  <TableHead className="text-right">Reorder Pt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('inventory_value')}>
                      Value <ChevronsUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link to={`/products/${item.product_id}`} className="font-medium hover:text-primary">
                        {item.product_name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.product_sku}</TableCell>
                    <TableCell>{item.warehouse?.name || '—'}</TableCell>
                    <TableCell className="text-right font-medium">{item.quantity_on_hand}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.quantity_reserved}</TableCell>
                    <TableCell className="text-right font-medium">{item.available_stock}</TableCell>
                    <TableCell className="text-right">{item.quantity_incoming}</TableCell>
                    <TableCell className="text-right">{item.quantity_damaged}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.product_reorder_point ?? 0}</TableCell>
                    <TableCell>{getStatusBadge(item.inventory_status)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPrice(item.inventory_value ?? 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
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
    </div>
  );
}
