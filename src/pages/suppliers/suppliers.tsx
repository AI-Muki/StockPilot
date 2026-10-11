import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Building2,
  Mail,
  Phone,
  DollarSign,
  ShoppingCart,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState, ErrorState, EmptyState } from '@/components/states/states';
import { SupplierFormDialog } from '@/components/suppliers/supplier-form-dialog';
import { useAuth } from '@/hooks/use-auth';
import { fetchSuppliers, deleteSupplier } from '@/services/suppliers';
import type { SupplierWithStats } from '@/types';

export function SuppliersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCreate = user?.permissions.includes('suppliers.manage');
  const canDelete = user?.permissions.includes('suppliers.manage');

  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithStats | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, total: t } = await fetchSuppliers({
        search,
        status: statusFilter,
        page,
        page_size: pageSize,
      });
      setSuppliers(data);
      setTotal(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter, page, load]);

  const handleEdit = (supplier: SupplierWithStats) => {
    setEditingSupplier(supplier);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingSupplier(null);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier? Purchase orders referencing this supplier will remain.')) return;
    try {
      await deleteSupplier(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete supplier');
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const formatPrice = (val: number) => `$${val.toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Suppliers</h2>
          <p className="text-sm text-muted-foreground">{total} suppliers in your network</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Supplier
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by company name, contact, email, or phone..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState message="Loading suppliers..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : suppliers.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No suppliers found"
              message={search || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Get started by adding your first supplier.'}
              action={canCreate && !search && statusFilter === 'all' ? (
                <Button size="sm" onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" /> Add Supplier
                </Button>
              ) : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total Spending</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <Link to={`/suppliers/${supplier.id}`} className="font-medium hover:text-primary">
                        {supplier.company_name}
                      </Link>
                      {supplier.payment_terms && (
                        <p className="text-xs text-muted-foreground">{supplier.payment_terms}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {supplier.contact_person && (
                          <p className="text-sm">{supplier.contact_person}</p>
                        )}
                        {supplier.email && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" /> {supplier.email}
                          </p>
                        )}
                        {supplier.phone && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" /> {supplier.phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[supplier.city, supplier.country].filter(Boolean).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1 text-sm">
                        <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                        {supplier.total_orders ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {supplier.total_spending ? formatPrice(supplier.total_spending) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          supplier.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400'
                        }
                      >
                        {supplier.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/suppliers/${supplier.id}`)}>
                            View details
                          </DropdownMenuItem>
                          {canCreate && (
                            <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(supplier.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!loading && total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <SupplierFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={load}
        supplier={editingSupplier}
      />
    </div>
  );
}
