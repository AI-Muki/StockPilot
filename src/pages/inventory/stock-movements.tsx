import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
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
import { fetchStockMovements, formatMovementType, getMovementTypeColor } from '@/services/inventory-engine';
import { fetchWarehouses } from '@/services/inventory';
import type { Warehouse, MovementType } from '@/types';

export function StockMovementsPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId!;

  const [movements, setMovements] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchStockMovements({
        orgId,
        search,
        warehouseId: warehouseFilter !== 'all' ? warehouseFilter : null,
        movementType: typeFilter,
        page,
        page_size: pageSize,
      });
      setMovements(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load movements');
    } finally {
      setLoading(false);
    }
  }, [orgId, search, warehouseFilter, typeFilter, page]);

  useEffect(() => {
    fetchWarehouses().then(setWarehouses).catch(() => {});
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, warehouseFilter, typeFilter, page, load]);

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (val: string) =>
    new Date(val).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const movementTypes: { value: string; label: string }[] = [
    { value: 'all', label: 'All types' },
    { value: 'PURCHASE_RECEIPT', label: 'Purchase Receipt' },
    { value: 'SALE', label: 'Sale' },
    { value: 'TRANSFER_OUT', label: 'Transfer Out' },
    { value: 'TRANSFER_IN', label: 'Transfer In' },
    { value: 'ADJUSTMENT_IN', label: 'Adjustment In' },
    { value: 'ADJUSTMENT_OUT', label: 'Adjustment Out' },
    { value: 'RETURN_IN', label: 'Return In' },
    { value: 'RETURN_OUT', label: 'Return Out' },
    { value: 'DAMAGE', label: 'Damage' },
    { value: 'INITIAL_STOCK', label: 'Initial Stock' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Stock Movements</h2>
        <p className="text-sm text-muted-foreground">Immutable history of all inventory changes</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by product or warehouse..."
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {movementTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState message="Loading movements..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : movements.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="No movements found"
              message={search || warehouseFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'No stock movements have been recorded yet.'}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Before</TableHead>
                  <TableHead className="text-right">After</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => {
                  const type = m.movement_type as MovementType;
                  const isIncrease = ['PURCHASE_RECEIPT', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN_IN', 'INITIAL_STOCK'].includes(type);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(m.created_at)}</TableCell>
                      <TableCell className="font-medium">{(m.product as any)?.name || '—'}</TableCell>
                      <TableCell className="font-mono text-sm">{(m.product as any)?.sku || '—'}</TableCell>
                      <TableCell>{(m.warehouse as any)?.name || '—'}</TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 text-sm font-medium ${getMovementTypeColor(type)}`}>
                          {isIncrease ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {formatMovementType(type)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{m.quantity}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{m.previous_quantity}</TableCell>
                      <TableCell className="text-right font-medium">{m.new_quantity}</TableCell>
                      <TableCell className="text-sm">{m.reason || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(m.user as any)?.email || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
            <button
              className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </button>
            <button
              className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
