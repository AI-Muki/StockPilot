import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  FolderTree,
  ChevronRight,
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
import { CategoryFormDialog } from '@/components/categories/category-form-dialog';
import { useAuth } from '@/hooks/use-auth';
import { fetchCategories, archiveCategory, deleteCategory } from '@/services/inventory';
import type { Category } from '@/types';
import { cn } from '@/lib/utils';

export function CategoriesPage() {
  const { user } = useAuth();
  const canCreate = user?.permissions.includes('products.create');
  const canUpdate = user?.permissions.includes('products.update');
  const canDelete = user?.permissions.includes('products.delete');

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buildTree = (cats: Category[]): Category[] => {
    const byParent = new Map<string | null, Category[]>();
    for (const c of cats) {
      const key = c.parent_category_id;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(c);
    }
    const result: Category[] = [];
    const addChildren = (parentId: string | null) => {
      const children = byParent.get(parentId) || [];
      for (const child of children) {
        result.push(child);
        addChildren(child.id);
      }
    };
    addChildren(null);
    return result;
  };

  const filtered = categories.filter((c) => {
    if (!search) return true;
    return c.name.toLowerCase().includes(search.toLowerCase());
  });

  const tree = buildTree(filtered);
  const depthMap = new Map<string, number>();
  const computeDepth = (cat: Category, depth: number) => {
    depthMap.set(cat.id, depth);
    const children = categories.filter((c) => c.parent_category_id === cat.id);
    for (const child of children) computeDepth(child, depth + 1);
  };
  categories.filter((c) => !c.parent_category_id).forEach((c) => computeDepth(c, 0));

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveCategory(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive category');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? Products will keep their data but lose the category link.')) return;
    try {
      await deleteCategory(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
          <p className="text-sm text-muted-foreground">{categories.length} categories</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search categories..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState message="Loading categories..." />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : tree.length === 0 ? (
            <EmptyState
              icon={FolderTree}
              title="No categories found"
              message={search ? 'Try adjusting your search.' : 'Get started by adding your first category.'}
              action={canCreate && !search ? (
                <Button size="sm" onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" /> Add Category
                </Button>
              ) : undefined}
            />
          ) : (
            <div className="divide-y">
              {tree.map((cat) => {
                const depth = depthMap.get(cat.id) ?? 0;
                const hasChildren = categories.some((c) => c.parent_category_id === cat.id);
                return (
                  <div
                    key={cat.id}
                    className={cn('flex items-center justify-between py-3 pr-4 hover:bg-muted/30')}
                    style={{ paddingLeft: `${depth * 24 + 16}px` }}
                  >
                    <div className="flex items-center gap-2">
                      {hasChildren ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <span className="w-4" />
                      )}
                      <FolderTree className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{cat.name}</p>
                        {cat.description && (
                          <p className="text-xs text-muted-foreground">{cat.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={cat.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {cat.status === 'ACTIVE' ? 'Active' : 'Archived'}
                      </Badge>
                      {(canUpdate || canDelete) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canUpdate && (
                              <DropdownMenuItem onClick={() => handleEdit(cat)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                            )}
                            {canUpdate && cat.status === 'ACTIVE' && (
                              <DropdownMenuItem onClick={() => handleArchive(cat.id)}>
                                <Archive className="mr-2 h-4 w-4" /> Archive
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(cat.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={load}
        category={editingCategory}
        categories={categories}
      />
    </div>
  );
}
