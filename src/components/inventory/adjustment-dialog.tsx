import { useState, useEffect, type FormEvent } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import type { Product, Warehouse, AdjustmentReason, AdjustmentDirection } from '@/types';
import { createAdjustment, getAvailableStock } from '@/services/inventory-engine';
import { useAuth } from '@/hooks/use-auth';

interface AdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  products: Product[];
  warehouses: Warehouse[];
}

const REASONS: AdjustmentReason[] = [
  'Damaged',
  'Lost',
  'Found',
  'Counting Error',
  'Initial Stock',
  'Manual Correction',
  'Expired',
  'Other',
];

export function AdjustmentDialog({
  open,
  onOpenChange,
  onSaved,
  products,
  warehouses,
}: AdjustmentDialogProps) {
  const { user } = useAuth();
  const orgId = user?.organizationId!;
  const userId = user?.id ?? null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [availableStock, setAvailableStock] = useState<number | null>(null);

  const [productId, setProductId] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [direction, setDirection] = useState<AdjustmentDirection>('OUT');
  const [reason, setReason] = useState<AdjustmentReason>('Manual Correction');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setError(null);
      setProductId('');
      setWarehouseId('');
      setQuantity(0);
      setDirection('OUT');
      setReason('Manual Correction');
      setNotes('');
      setCurrentStock(null);
      setAvailableStock(null);
    }
  }, [open]);

  useEffect(() => {
    if (productId && warehouseId) {
      getAvailableStock(productId, warehouseId).then((s) => {
        setCurrentStock(s.onHand);
        setAvailableStock(s.available);
      }).catch(() => {
        setCurrentStock(null);
        setAvailableStock(null);
      });
    } else {
      setCurrentStock(null);
      setAvailableStock(null);
    }
  }, [productId, warehouseId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!productId || !warehouseId || quantity <= 0) {
      setError('Please select a product, warehouse, and enter a valid quantity.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createAdjustment({
        orgId,
        productId,
        warehouseId,
        quantity,
        direction,
        reason,
        notes: notes || null,
        userId,
      });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create adjustment');
    } finally {
      setLoading(false);
    }
  };

  const newQuantity = currentStock !== null
    ? direction === 'IN' ? currentStock + quantity : currentStock - quantity
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inventory Adjustment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Product *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Warehouse *</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name} ({w.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Direction *</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`flex items-center justify-center gap-2 rounded-md border p-2 text-sm font-medium transition-colors ${
                  direction === 'IN' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'hover:bg-accent'
                }`}
                onClick={() => setDirection('IN')}
              >
                <ArrowUp className="h-4 w-4" /> Add Stock
              </button>
              <button
                type="button"
                className={`flex items-center justify-center gap-2 rounded-md border p-2 text-sm font-medium transition-colors ${
                  direction === 'OUT' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'hover:bg-accent'
                }`}
                onClick={() => setDirection('OUT')}
              >
                <ArrowDown className="h-4 w-4" /> Remove Stock
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qty">Quantity *</Label>
            <Input
              id="qty"
              type="number"
              min="1"
              value={quantity || ''}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as AdjustmentReason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes about this adjustment..."
            />
          </div>

          {/* Before/after preview */}
          {currentStock !== null && quantity > 0 && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current on hand</span>
                <span className="font-medium">{currentStock}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Adjustment</span>
                <span className={direction === 'IN' ? 'font-medium text-green-600' : 'font-medium text-red-600'}>
                  {direction === 'IN' ? '+' : '−'}{quantity}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t pt-1 text-sm">
                <span className="font-medium">New quantity</span>
                <span className="font-bold">{newQuantity}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
