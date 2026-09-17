import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Ban,
} from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { ProductFormDialog } from '@/components/products/product-form-dialog';
import { useAuth } from '@/hooks/use-auth';
import { fetchProducts, fetchCategories, archiveProduct, deleteProduct } from '@/services/inventory';
import type { ProductWithInventory, Category } from '@/types';
import { cn } from '@/lib/utils';

type SortField = 'name' | 'sku' | 'cost_price' | 'selling_price' | 'updated_at';
type SortOrder = 'asc' | 'desc';

const COLUMNS = [
  { key: 'name', label: 'Product', default: true },
  { key: 'sku', label: 'SKU', default: true },
  { key: 'barcode', label: 'Barcode', default: false },
  { key: 'category', label: 'Category', default: true },
  { key: 'cost_price', label: 'Cost', default: true },
  { key: 'selling_price', label: 'Selling Price', default: true },
  { key: 'stock_status', label: 'Stock Status', default: true },
  { key: 'updated_at', label: 'Updated', default: true },
] as const;

export function ProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCreate = user?.permissions.includes('products.create');
  const canUpdate = user?.permissions.includes('products.update');
  const canDelete = user?.permissions.includes('products.delete');

  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    new Set(COLUMNS.filter((c) => c.default).map((c) => c.key)),
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithInventory | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, total: t } = await fetchProducts({
        search,
        category_id: categoryFilter !== 'all' ? categoryFilter : null,
        status: statusFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: pageSize,
      });
      setProducts(data);
      setTotal(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter, categoryFilter, sortBy, sortOrder, page, load]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  };

  const handleEdit = (product: ProductWithInventory) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveProduct(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive product');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? This will also remove all inventory records.')) return;
    try {
      await deleteProduct(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const getStockBadge = (product: ProductWithInventory) => {
    switch (product.stock_status) {
      case 'in_stock':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">In Stock</Badge>;
      case 'low_stock':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">Low Stock</Badge>;
      case 'out_of_stock':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">Out of Stock</Badge>;
      case 'discontinued':
        return <Badge variant="secondary">Discontinued</Badge>;
      default:
        return <Badge variant="secondary">—</Badge>;
    }
  };

  const formatPrice = (val: number) => `$${val.toFixed(2)}`;
  const formatDate = (val: string) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-sm text-muted-foreground">{total} products in your catalog</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {canCreate && (
            <Button size="sm" onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, barcode, or brand..."
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
            <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Button variant="outline" size="sm" onClick={() => setShowColumnMenu(!showColumnMenu)}>
            <ChevronsUpDown className="mr-2 h-4 w-4" />
            Columns
          </Button>
          {showColumnMenu && (
            <div className="absolute right-0 top-10 z-50 w-44 rounded-md border bg-popover p-2 shadow-md">
              {COLUMNS.map((col) => (
                <label key={col.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                  <Checkbox
                    checked={visibleCols.has(col.key)}
                    onCheckedChange={() => {
                      setVisibleCols((prev) => {
                        const next = new Set(prev);
                        if (next.has(col.key)) next.delete(col.key);
                        else next.add(col.key);
                        return next;
                      });
                    }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2">
            {canUpdate && (
              <Button variant="outline" size="sm" onClick={() => {
                for (const id of selected) archiveProduct(id);
                setSelected(new Set());
                load();
              }}>
                <Archive className="mr-2 h-4 w-4" /> Archive
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState message="Loading products..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products found"
              message={search || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Get started by adding your first product.'}
              action={canCreate && !search && statusFilter === 'all' && categoryFilter === 'all' ? (
                <Button size="sm" onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" /> Add Product
                </Button>
              ) : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selected.size === products.length && products.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  {visibleCols.has('name') && (
                    <TableHead>
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('name')}>
                        Product
                        <ChevronsUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                  )}
                  {visibleCols.has('sku') && (
                    <TableHead>
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('sku')}>
                        SKU
                        <ChevronsUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                  )}
                  {visibleCols.has('barcode') && <TableHead>Barcode</TableHead>}
                  {visibleCols.has('category') && <TableHead>Category</TableHead>}
                  {visibleCols.has('cost_price') && (
                    <TableHead>
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('cost_price')}>
                        Cost
                        <ChevronsUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                  )}
                  {visibleCols.has('selling_price') && (
                    <TableHead>
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('selling_price')}>
                        Selling Price
                        <ChevronsUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                  )}
                  {visibleCols.has('stock_status') && <TableHead>Stock Status</TableHead>}
                  {visibleCols.has('updated_at') && (
                    <TableHead>
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('updated_at')}>
                        Updated
                        <ChevronsUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                  )}
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.id}
                    className={cn(selected.has(product.id) && 'bg-muted/50')}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected.has(product.id)}
                        onCheckedChange={() => toggleSelect(product.id)}
                      />
                    </TableCell>
                    {visibleCols.has('name') && (
                      <TableCell>
                        <Link to={`/products/${product.id}`} className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium hover:text-primary">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.brand}</p>
                          </div>
                        </Link>
                      </TableCell>
                    )}
                    {visibleCols.has('sku') && (
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    )}
                    {visibleCols.has('barcode') && (
                      <TableCell className="font-mono text-sm text-muted-foreground">{product.barcode || '—'}</TableCell>
                    )}
                    {visibleCols.has('category') && (
                      <TableCell>{product.category?.name || '—'}</TableCell>
                    )}
                    {visibleCols.has('cost_price') && (
                      <TableCell>{formatPrice(product.cost_price)}</TableCell>
                    )}
                    {visibleCols.has('selling_price') && (
                      <TableCell className="font-medium">{formatPrice(product.selling_price)}</TableCell>
                    )}
                    {visibleCols.has('stock_status') && (
                      <TableCell>{getStockBadge(product)}</TableCell>
                    )}
                    {visibleCols.has('updated_at') && (
                      <TableCell className="text-sm text-muted-foreground">{formatDate(product.updated_at)}</TableCell>
                    )}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/products/${product.id}`)}>
                            View details
                          </DropdownMenuItem>
                          {canUpdate && (
                            <DropdownMenuItem onClick={() => handleEdit(product)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                          )}
                          {canUpdate && (
                            <DropdownMenuItem onClick={() => handleArchive(product.id)}>
                              <Archive className="mr-2 h-4 w-4" /> Archive
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(product.id)}
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

      {/* Pagination */}
      {!loading && total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={load}
        product={editingProduct}
        categories={categories}
      />
    </div>
  );
}
