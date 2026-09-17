import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
} from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingState, ErrorState, EmptyState } from '@/components/states/states';
import { WarehouseFormDialog } from '@/components/warehouses/warehouse-form-dialog';
import { useAuth } from '@/hooks/use-auth';
import { fetchWarehouses, deleteWarehouse } from '@/services/inventory';
import type { Warehouse } from '@/types';

export function WarehousesPage() {
  const { user } = useAuth();
  const canCreate = user?.permissions.includes('warehouses.manage');
  const canDelete = user?.permissions.includes('warehouses.manage');

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWarehouses();
      setWarehouses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = warehouses.filter((w) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q) ||
      (w.city || '').toLowerCase().includes(q) || (w.manager || '').toLowerCase().includes(q);
  });

  const handleEdit = (wh: Warehouse) => {
    setEditingWarehouse(wh);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingWarehouse(null);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this warehouse? This will also remove all inventory records in it.')) return;
    try {
      await deleteWarehouse(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete warehouse');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Warehouses</h2>
          <p className="text-sm text-muted-foreground">{warehouses.length} warehouses</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Warehouse
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, code, city, or manager..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingState message="Loading warehouses..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Building2}
              title="No warehouses found"
              message={search ? 'Try adjusting your search.' : 'Get started by adding your first warehouse.'}
              action={canCreate && !search ? (
                <Button size="sm" onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" /> Add Warehouse
                </Button>
              ) : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((wh) => (
            <Card key={wh.id} className="border-border/60">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <Link to={`/warehouses/${wh.id}`} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold hover:text-primary">{wh.name}</p>
                      <p className="text-xs text-muted-foreground">{wh.code}</p>
                    </div>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(wh)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(wh.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  {wh.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {wh.address}{wh.city ? `, ${wh.city}` : ''}{wh.country ? `, ${wh.country}` : ''}
                    </div>
                  )}
                  {wh.manager && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3.5 w-3.5" /> {wh.manager}
                    </div>
                  )}
                  {wh.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> {wh.phone}
                    </div>
                  )}
                  {wh.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" /> {wh.email}
                    </div>
                  )}
                  {wh.capacity && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" /> Capacity: {wh.capacity.toLocaleString()} units
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Badge variant={wh.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {wh.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WarehouseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={load}
        warehouse={editingWarehouse}
      />
    </div>
  );
}
