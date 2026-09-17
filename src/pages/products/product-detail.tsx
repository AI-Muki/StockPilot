import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Package,
  DollarSign,
  Tag,
  Ruler,
  Weight,
  AlertTriangle,
  Building2,
  History,
  ShoppingCart,
  Truck,
  Boxes,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { fetchProductById, fetchProductInventory, fetchCategories } from '@/services/inventory';
import type { Product, WarehouseInventory, Category } from '@/types';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canUpdate = user?.permissions.includes('products.update');

  const [product, setProduct] = useState<Product | null>(null);
  const [inventory, setInventory] = useState<WarehouseInventory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchProductById(id),
      fetchProductInventory(id),
      fetchCategories(),
    ])
      .then(([p, inv, cats]) => {
        setProduct(p);
        setInventory(inv);
        setCategories(cats);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load product'))
      .finally(() => setLoading(false));
  }, [id]);

  const reload = () => {
    if (!id) return;
    Promise.all([fetchProductById(id), fetchProductInventory(id)])
      .then(([p, inv]) => {
        setProduct(p);
        setInventory(inv);
      })
      .catch(() => {});
  };

  if (loading) return <LoadingState message="Loading product..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!product) return <EmptyState icon={Package} title="Product not found" message="This product may have been deleted." />;

  const totalStock = inventory.reduce((sum, inv) => sum + inv.quantity_on_hand, 0);
  const totalReserved = inventory.reduce((sum, inv) => sum + inv.quantity_reserved, 0);
  const available = totalStock - totalReserved;
  const stockStatus = product.status === 'DISCONTINUED' ? 'Discontinued'
    : totalStock <= 0 ? 'Out of Stock'
    : product.reorder_point > 0 && totalStock <= product.reorder_point ? 'Low Stock'
    : 'In Stock';

  const formatPrice = (val: number) => `$${val.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/products')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{product.name}</h2>
              <Badge variant={product.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {product.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {product.sku} {product.barcode && `| ${product.barcode}`} {product.brand && `| ${product.brand}`}
            </p>
          </div>
        </div>
        {canUpdate && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit Product
          </Button>
        )}
      </div>

      {/* Stock summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Stock</CardDescription>
            <CardTitle className="text-2xl">{totalStock}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available</CardDescription>
            <CardTitle className="text-2xl">{available}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stock Status</CardDescription>
            <CardTitle className="text-lg">{stockStatus}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="history">Stock History</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <InfoRow icon={Tag} label="Category" value={product.category?.name || 'Uncategorized'} />
                <InfoRow icon={DollarSign} label="Cost Price" value={formatPrice(product.cost_price)} />
                <InfoRow icon={DollarSign} label="Selling Price" value={formatPrice(product.selling_price)} />
                <InfoRow icon={DollarSign} label="Tax Rate" value={`${product.tax_rate}%`} />
                <InfoRow icon={Package} label="Unit" value={product.unit} />
                <InfoRow icon={Weight} label="Weight" value={product.weight ? `${product.weight} kg` : '—'} />
                <InfoRow icon={Ruler} label="Dimensions" value={product.dimensions || '—'} />
                <InfoRow icon={Package} label="Min Stock" value={String(product.minimum_stock)} />
                <InfoRow icon={AlertTriangle} label="Reorder Point" value={String(product.reorder_point)} />
                <InfoRow icon={Package} label="Reorder Qty" value={String(product.reorder_quantity)} />
                <InfoRow icon={Package} label="Max Stock" value={product.maximum_stock ? String(product.maximum_stock) : '—'} />
                <InfoRow icon={Tag} label="Barcode" value={product.barcode || '—'} />
              </div>
              {product.description && (
                <div className="mt-6 border-t pt-4">
                  <p className="mb-1 text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{product.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventory by Warehouse</CardTitle>
              <CardDescription>Stock levels across all warehouses</CardDescription>
            </CardHeader>
            <CardContent>
              {inventory.length === 0 ? (
                <EmptyState icon={Boxes} title="No inventory records" message="This product has no stock in any warehouse." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>On Hand</TableHead>
                      <TableHead>Reserved</TableHead>
                      <TableHead>Incoming</TableHead>
                      <TableHead>Damaged</TableHead>
                      <TableHead>Available</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.warehouse?.name || '—'}</TableCell>
                        <TableCell>{inv.quantity_on_hand}</TableCell>
                        <TableCell>{inv.quantity_reserved}</TableCell>
                        <TableCell>{inv.quantity_incoming}</TableCell>
                        <TableCell>{inv.quantity_damaged}</TableCell>
                        <TableCell className="font-medium">{inv.quantity_on_hand - inv.quantity_reserved}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouses */}
        <TabsContent value="warehouses">
          <Card>
            <CardHeader>
              <CardTitle>Warehouse Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {inventory.length === 0 ? (
                <EmptyState icon={Building2} title="No warehouses" message="This product is not stocked in any warehouse." />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {inventory.map((inv) => (
                    <Card key={inv.id} className="border-border/60">
                      <CardContent className="pt-6">
                        <div className="mb-2 flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">{inv.warehouse?.name}</p>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">On Hand</span>
                            <span className="font-medium">{inv.quantity_on_hand}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Available</span>
                            <span className="font-medium">{inv.quantity_on_hand - inv.quantity_reserved}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Incoming</span>
                            <span>{inv.quantity_incoming}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock History */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement History</CardTitle>
              <CardDescription>Track all stock changes for this product</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState icon={History} title="No movements yet" message="Stock movements will appear here once the movements module is implemented in a future phase." />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchases */}
        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState icon={ShoppingCart} title="No purchases yet" message="Purchase orders will appear here once the purchasing module is implemented." />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales History</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState icon={Truck} title="No sales yet" message="Sales orders will appear here once the sales module is implemented." />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={reload}
        product={product}
        categories={categories}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Tag; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
