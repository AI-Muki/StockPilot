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
import type { Warehouse, WarehouseInput, WarehouseStatus } from '@/types';
import { createWarehouse, updateWarehouse } from '@/services/inventory';
import { useAuth } from '@/hooks/use-auth';

interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  warehouse?: Warehouse | null;
}

export function WarehouseFormDialog({
  open,
  onOpenChange,
  onSaved,
  warehouse,
}: WarehouseFormDialogProps) {
  const { user } = useAuth();
  const orgId = user?.organizationId!;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<WarehouseInput>({
    name: '',
    code: '',
    address: '',
    city: '',
    country: '',
    manager: '',
    phone: '',
    email: '',
    capacity: null,
    status: 'ACTIVE',
  });

  useEffect(() => {
    if (warehouse) {
      setForm({
        name: warehouse.name,
        code: warehouse.code,
        address: warehouse.address ?? '',
        city: warehouse.city ?? '',
        country: warehouse.country ?? '',
        manager: warehouse.manager ?? '',
        phone: warehouse.phone ?? '',
        email: warehouse.email ?? '',
        capacity: warehouse.capacity,
        status: warehouse.status,
      });
    } else {
      setForm({
        name: '',
        code: '',
        address: '',
        city: '',
        country: '',
        manager: '',
        phone: '',
        email: '',
        capacity: null,
        status: 'ACTIVE',
      });
    }
    setError(null);
  }, [warehouse, open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (warehouse) {
        await updateWarehouse(warehouse.id, form);
      } else {
        await createWarehouse(form, orgId);
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
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{warehouse ? 'Edit Warehouse' : 'New Warehouse'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wh-name">Name *</Label>
              <Input id="wh-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-code">Code *</Label>
              <Input id="wh-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="MAIN-01" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh-address">Address</Label>
            <Textarea id="wh-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wh-city">City</Label>
              <Input id="wh-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-country">Country</Label>
              <Input id="wh-country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wh-manager">Manager</Label>
              <Input id="wh-manager" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-capacity">Capacity (units)</Label>
              <Input id="wh-capacity" type="number" min="0" value={form.capacity ?? ''} onChange={(e) => setForm({ ...form, capacity: e.target.value ? parseInt(e.target.value) : null })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wh-phone">Phone</Label>
              <Input id="wh-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-email">Email</Label>
              <Input id="wh-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as WarehouseStatus })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {warehouse ? 'Save changes' : 'Create warehouse'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
