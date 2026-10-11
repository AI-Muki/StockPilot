import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { AdjustmentDialog } from '@/components/inventory/adjustment-dialog';
import { useAuth } from '@/hooks/use-auth';
import { fetchAdjustments } from '@/services/inventory-engine';
import { fetchProducts, fetchWarehouses } from '@/services/inventory';
import type { Product, Warehouse } from '@/types';

export function AdjustmentsPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId!;
  const canAdjust = user?.permissions.includes('inventory.adjust');

  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdjustments({
        orgId,
        search,
        page,
        page_size: pageSize,
      });
      setMovements(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load adjustments');
    } finally {
      setLoading(false);
    }
  }, [orgId, search, page]);

  useEffect(() => {
    fetchProducts({ page: 1, page_size: 100 }).then((r) => setProducts(r.data)).catch(() => {});
    fetchWarehouses().then(setWarehouses).catch(() => {});
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, page, load]);

  const formatDate = (val: string) =>
    new Date(val).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Adjustments</h2>
          <p className="text-sm text-muted-foreground">Record stock adjustments with before/after tracking</p>
        </div>
        {canAdjust && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Adjustment
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by product or warehouse..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState message="Loading adjustments..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : movements.length === 0 ? (
            <EmptyState
              icon={SlidersHorizontal}
              title="No adjustments found"
              message={search ? 'Try adjusting your search.' : 'No inventory adjustments have been recorded yet.'}
              action={canAdjust && !search ? (
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> New Adjustment
                </Button>
              ) : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Before</TableHead>
                  <TableHead className="text-right">After</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => {
                  const isIn = m.movement_type === 'ADJUSTMENT_IN';
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(m.created_at)}</TableCell>
                      <TableCell className="font-medium">{(m.product as any)?.name || '—'}</TableCell>
                      <TableCell>{(m.warehouse as any)?.name || '—'}</TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 text-sm font-medium ${isIn ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isIn ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {isIn ? 'Add' : 'Remove'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{m.quantity}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{m.previous_quantity}</TableCell>
                      <TableCell className="text-right font-medium">{m.new_quantity}</TableCell>
                      <TableCell><Badge variant="outline">{m.reason || '—'}</Badge></TableCell>
                      <TableCell className="max-w-32 truncate text-sm">{m.notes || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(m.user as any)?.email || '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AdjustmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={load}
        products={products}
        warehouses={warehouses}
      />
    </div>
  );
}
