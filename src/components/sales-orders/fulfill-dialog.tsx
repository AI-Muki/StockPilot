import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, PackageCheck } from 'lucide-react';
import type { SalesOrderItem } from '@/types';
import { fulfillSalesOrderItem } from '@/services/sales-orders';
import { useAuth } from '@/hooks/use-auth';

interface FulfillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFulfilled: () => void;
  soId: string;
  items: SalesOrderItem[];
}

export function FulfillDialog({
  open,
  onOpenChange,
  onFulfilled,
  soId,
  items,
}: FulfillDialogProps) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fulfillQtys, setFulfillQtys] = useState<Record<string, number>>({});

  const reset = () => {
    setError(null);
    setSuccess(null);
    setFulfillQtys({});
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const getRemaining = (item: SalesOrderItem) => item.quantity - item.fulfilled_quantity;
  const fulfillableItems = items.filter((item) => getRemaining(item) > 0);

  const handleFulfillOne = async (itemId: string) => {
    const qty = fulfillQtys[itemId];
    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity to fulfill.');
      return;
    }
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const remaining = getRemaining(item);
    if (qty > remaining) {
      setError(`Cannot fulfill more than remaining. Remaining: ${remaining}`);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await fulfillSalesOrderItem(soId, itemId, qty, userId);
      setSuccess(
        `Fulfilled ${qty} units of ${item.product?.name ?? 'item'}. ` +
        `Remaining: ${result.remaining}. SO status: ${result.so_status}.`,
      );
      setFulfillQtys({ ...fulfillQtys, [itemId]: 0 });
      onFulfilled();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fulfill items');
    } finally {
      setLoading(false);
    }
  };

  const handleFulfillAll = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const results: string[] = [];
      for (const item of fulfillableItems) {
        const qty = fulfillQtys[item.id];
        if (!qty || qty <= 0) continue;
        const remaining = getRemaining(item);
        if (qty > remaining) {
          results.push(`Skipped ${item.product?.name ?? 'item'}: qty exceeds remaining`);
          continue;
        }
        const result = await fulfillSalesOrderItem(soId, item.id, qty, userId);
        results.push(
          `${item.product?.name ?? 'Item'}: fulfilled ${qty}, remaining ${result.remaining}, SO ${result.so_status}`,
        );
      }
      if (results.length === 0) {
        setError('No valid quantities entered. Enter quantities for at least one item.');
      } else {
        setSuccess(results.join('\n'));
        setFulfillQtys({});
      }
      onFulfilled();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fulfill items');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" /> Fulfill Order
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <AlertDescription className="whitespace-pre-line">{success}</AlertDescription>
            </Alert>
          )}

          {fulfillableItems.length === 0 ? (
            <div className="py-8 text-center">
              <PackageCheck className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">All items have been fully fulfilled.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Fulfilled</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Fulfill Qty</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fulfillableItems.map((item) => {
                    const remaining = getRemaining(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.product?.name ?? 'Unknown'}
                          <p className="text-xs text-muted-foreground">{item.product?.sku ?? ''}</p>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{item.fulfilled_quantity}</TableCell>
                        <TableCell className="text-right font-medium">{remaining}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={remaining}
                            className="h-8 w-20 text-right"
                            value={fulfillQtys[item.id] ?? ''}
                            onChange={(e) =>
                              setFulfillQtys({ ...fulfillQtys, [item.id]: parseInt(e.target.value) || 0 })
                            }
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={loading || !fulfillQtys[item.id]}
                            onClick={() => handleFulfillOne(item.id)}
                          >
                            Fulfill
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        {fulfillableItems.length > 0 && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Close
            </Button>
            <Button type="button" disabled={loading} onClick={handleFulfillAll}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Fulfill All Entered
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
