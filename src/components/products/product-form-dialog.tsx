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
import { Loader2 } from 'lucide-react';
import type { Product, ProductInput, Category, ProductStatus } from '@/types';
import { createProduct, updateProduct } from '@/services/inventory';
import { useAuth } from '@/hooks/use-auth';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  product?: Product | null;
  categories: Category[];
}

export function ProductFormDialog({
  open,
  onOpenChange,
  onSaved,
  product,
  categories,
}: ProductFormDialogProps) {
  const { user } = useAuth();
  const orgId = user?.organizationId!;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ProductInput>({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    category_id: null,
    brand: '',
    unit: 'piece',
    cost_price: 0,
    selling_price: 0,
    tax_rate: 0,
    minimum_stock: 0,
    reorder_point: 0,
    reorder_quantity: 0,
    maximum_stock: null,
    weight: null,
    dimensions: '',
    status: 'ACTIVE',
    image_url: '',
  });

  useEffect(() => {
    if (product) {
      setForm({
        sku: product.sku,
        barcode: product.barcode ?? '',
        name: product.name,
        description: product.description ?? '',
        category_id: product.category_id,
        brand: product.brand ?? '',
        unit: product.unit,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        tax_rate: product.tax_rate,
        minimum_stock: product.minimum_stock,
        reorder_point: product.reorder_point,
        reorder_quantity: product.reorder_quantity,
        maximum_stock: product.maximum_stock,
        weight: product.weight,
        dimensions: product.dimensions ?? '',
        status: product.status,
        image_url: product.image_url ?? '',
      });
    } else {
      setForm({
        sku: '',
        barcode: '',
        name: '',
        description: '',
        category_id: null,
        brand: '',
        unit: 'piece',
        cost_price: 0,
        selling_price: 0,
        tax_rate: 0,
        minimum_stock: 0,
        reorder_point: 0,
        reorder_quantity: 0,
        maximum_stock: null,
        weight: null,
        dimensions: '',
        status: 'ACTIVE',
        image_url: '',
      });
    }
    setError(null);
  }, [product, open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (product) {
        await updateProduct(product.id, form);
      } else {
        await createProduct(form, orgId);
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'New Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={form.barcode ?? ''}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={form.brand ?? ''}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category_id ?? 'none'}
                onValueChange={(v) => setForm({ ...form, category_id: v === 'none' ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as ProductStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_price">Cost Price *</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                min="0"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selling_price">Selling Price *</Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                min="0"
                value={form.selling_price}
                onChange={(e) => setForm({ ...form, selling_price: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                step="0.01"
                min="0"
                value={form.tax_rate}
                onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minimum_stock">Min Stock</Label>
              <Input
                id="minimum_stock"
                type="number"
                min="0"
                value={form.minimum_stock}
                onChange={(e) => setForm({ ...form, minimum_stock: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorder_point">Reorder Point</Label>
              <Input
                id="reorder_point"
                type="number"
                min="0"
                value={form.reorder_point}
                onChange={(e) => setForm({ ...form, reorder_point: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorder_quantity">Reorder Qty</Label>
              <Input
                id="reorder_quantity"
                type="number"
                min="0"
                value={form.reorder_quantity}
                onChange={(e) => setForm({ ...form, reorder_quantity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maximum_stock">Max Stock</Label>
              <Input
                id="maximum_stock"
                type="number"
                min="0"
                value={form.maximum_stock ?? ''}
                onChange={(e) => setForm({ ...form, maximum_stock: e.target.value ? parseInt(e.target.value) : null })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.001"
                min="0"
                value={form.weight ?? ''}
                onChange={(e) => setForm({ ...form, weight: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input
                id="dimensions"
                value={form.dimensions ?? ''}
                onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? 'Save changes' : 'Create product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
