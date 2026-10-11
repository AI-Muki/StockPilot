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
import { Label } from '@/components/ui/label';
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
import type { PurchaseOrderItem } from '@/types';
import { receivePurchaseOrderItem } from '@/services/purchase-orders';
import { useAuth } from '@/hooks/use-auth';

interface ReceiveGoodsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReceived: () => void;
  poId: string;
  items: PurchaseOrderItem[];
}

export function ReceiveGoodsDialog({
  open,
  onOpenChange,
  onReceived,
  poId,
  items,
}: ReceiveGoodsDialogProps) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});

  const reset = () => {
    setError(null);
    setSuccess(null);
    setReceiveQtys({});
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const getRemaining = (item: PurchaseOrderItem) => item.quantity - item.received_quantity;
  const receivableItems = items.filter((item) => getRemaining(item) > 0);

  const handleReceiveOne = async (itemId: string) => {
    const qty = receiveQtys[itemId];
    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity to receive.');
      return;
    }
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const remaining = getRemaining(item);
    if (qty > remaining) {
      setError(`Cannot receive more than remaining. Remaining: ${remaining}`);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await receivePurchaseOrderItem(poId, itemId, qty, userId);
      setSuccess(
        `Received ${qty} units of ${item.product?.name ?? 'item'}. ` +
        `Remaining: ${result.remaining}. PO status: ${result.po_status}.`,
      );
      setReceiveQtys({ ...receiveQtys, [itemId]: 0 });
      onReceived();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to receive goods');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveAll = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const results: string[] = [];
      for (const item of receivableItems) {
        const qty = receiveQtys[item.id];
        if (!qty || qty <= 0) continue;
        const remaining = getRemaining(item);
        if (qty > remaining) {
          results.push(`Skipped ${item.product?.name ?? 'item'}: qty exceeds remaining`);
          continue;
        }
        const result = await receivePurchaseOrderItem(poId, item.id, qty, userId);
        results.push(
          `${item.product?.name ?? 'Item'}: received ${qty}, remaining ${result.remaining}, PO ${result.po_status}`,
        );
      }
      if (results.length === 0) {
        setError('No valid quantities entered. Enter quantities for at least one item.');
      } else {
        setSuccess(results.join('\n'));
        setReceiveQtys({});
      }
      onReceived();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to receive goods');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" /> Receive Goods
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

          {receivableItems.length === 0 ? (
            <div className="py-8 text-center">
              <PackageCheck className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">All items have been fully received.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Receive Qty</TableHead>
                    <TableHead className="w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivableItems.map((item) => {
                    const remaining = getRemaining(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.product?.name ?? 'Unknown'}
                          <p className="text-xs text-muted-foreground">{item.product?.sku ?? ''}</p>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{item.received_quantity}</TableCell>
                        <TableCell className="text-right font-medium">{remaining}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={remaining}
                            className="h-8 w-20 text-right"
                            value={receiveQtys[item.id] ?? ''}
                            onChange={(e) =>
                              setReceiveQtys({ ...receiveQtys, [item.id]: parseInt(e.target.value) || 0 })
                            }
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={loading || !receiveQtys[item.id]}
                            onClick={() => handleReceiveOne(item.id)}
                          >
                            Receive
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
        {receivableItems.length > 0 && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Close
            </Button>
            <Button type="button" disabled={loading} onClick={handleReceiveAll}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Receive All Entered
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
