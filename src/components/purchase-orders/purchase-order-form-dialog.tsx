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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import type {
  Supplier,
  Warehouse,
  Product,
  PurchaseOrderInput,
  PurchaseOrderItemInput,
} from '@/types';
import { createPurchaseOrder, calculateTotals, calculateLineTotal } from '@/services/purchase-orders';
import { useAuth } from '@/hooks/use-auth';

interface PurchaseOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  suppliers: Supplier[];
  warehouses: Warehouse[];
  products: Product[];
}

export function PurchaseOrderFormDialog({
  open,
  onOpenChange,
  onSaved,
  suppliers,
  warehouses,
  products,
}: PurchaseOrderFormDialogProps) {
  const { user } = useAuth();
  const orgId = user?.organizationId!;
  const userId = user?.id ?? '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [expectedDelivery, setExpectedDelivery] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<PurchaseOrderItemInput[]>([]);

  useEffect(() => {
    if (open) {
      setSupplierId('');
      setWarehouseId(warehouses.length > 0 ? warehouses[0].id : '');
      setExpectedDelivery('');
      setCurrency('USD');
      setNotes('');
      setItems([]);
      setError(null);
    }
  }, [open, warehouses]);

  const addItem = () => {
    setItems([...items, {
      product_id: '',
      quantity: 1,
      unit_cost: 0,
      tax_rate: 0,
      discount_amount: 0,
    }]);
  };

  const updateItem = (index: number, field: keyof PurchaseOrderItemInput, value: string | number) => {
    const updated = [...items];
    if (field === 'product_id') {
      const product = products.find((p) => p.id === value);
      updated[index] = {
        ...updated[index],
        product_id: value as string,
        unit_cost: product?.cost_price ?? updated[index].unit_cost,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!warehouseId) {
      setError('Please select a warehouse.');
      return;
    }
    if (items.length === 0) {
      setError('Please add at least one line item.');
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].product_id) {
        setError(`Line ${i + 1}: Please select a product.`);
        return;
      }
      if (items[i].quantity <= 0) {
        setError(`Line ${i + 1}: Quantity must be greater than 0.`);
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const input: PurchaseOrderInput = {
        supplier_id: supplierId || null,
        warehouse_id: warehouseId,
        expected_delivery: expectedDelivery || null,
        currency,
        notes: notes || null,
        items,
      };
      await createPurchaseOrder(input, orgId, userId);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals(items);
  const formatPrice = (val: number) => `$${val.toFixed(2)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Purchase Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={supplierId || 'none'} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supplier</SelectItem>
                  {suppliers.filter((s) => s.status === 'ACTIVE').map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>
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
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expected_delivery">Expected Delivery</Label>
              <Input
                id="expected_delivery"
                type="date"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>
            {items.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-24 text-right">Qty</TableHead>
                      <TableHead className="w-28 text-right">Unit Cost</TableHead>
                      <TableHead className="w-24 text-right">Tax %</TableHead>
                      <TableHead className="w-28 text-right">Discount</TableHead>
                      <TableHead className="w-28 text-right">Line Total</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={item.product_id}
                            onValueChange={(v) => updateItem(index, 'product_id', v)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            className="h-8 text-right"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-8 text-right"
                            value={item.unit_cost}
                            onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-8 text-right"
                            value={item.tax_rate}
                            onChange={(e) => updateItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-8 text-right"
                            value={item.discount_amount}
                            onChange={(e) => updateItem(index, 'discount_amount', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(calculateLineTotal(item))}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Totals */}
          {items.length > 0 && (
            <div className="ml-auto w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatPrice(totals.discountAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatPrice(totals.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold">
                <span>Total</span>
                <span>{formatPrice(totals.total)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="po_notes">Notes</Label>
            <Textarea
              id="po_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes about this purchase order..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Purchase Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
