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
import type { Category, CategoryInput, CategoryStatus } from '@/types';
import { createCategory, updateCategory } from '@/services/inventory';
import { useAuth } from '@/hooks/use-auth';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  category?: Category | null;
  categories: Category[];
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  onSaved,
  category,
  categories,
}: CategoryFormDialogProps) {
  const { user } = useAuth();
  const orgId = user?.organizationId!;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CategoryInput>({
    name: '',
    description: '',
    parent_category_id: null,
    status: 'ACTIVE',
  });

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name,
        description: category.description ?? '',
        parent_category_id: category.parent_category_id,
        status: category.status,
      });
    } else {
      setForm({ name: '', description: '', parent_category_id: null, status: 'ACTIVE' });
    }
    setError(null);
  }, [category, open]);

  const availableParents = categories.filter(
    (c) => c.id !== category?.id && c.status === 'ACTIVE',
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (category) {
        await updateCategory(category.id, form);
      } else {
        await createCategory(form, orgId);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name *</Label>
            <Input id="cat-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-desc">Description</Label>
            <Textarea id="cat-desc" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Parent Category</Label>
            <Select
              value={form.parent_category_id ?? 'none'}
              onValueChange={(v) => setForm({ ...form, parent_category_id: v === 'none' ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="No parent (top-level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No parent (top-level)</SelectItem>
                {availableParents.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as CategoryStatus })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {category ? 'Save changes' : 'Create category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
