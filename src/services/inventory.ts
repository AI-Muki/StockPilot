import { supabase } from '@/lib/supabase';
import type {
  Product,
  ProductWithInventory,
  ProductInput,
  Category,
  CategoryInput,
  Warehouse,
  WarehouseInput,
  WarehouseInventory,
} from '@/types';

// ============================================================
// PRODUCTS
// ============================================================

export async function fetchProducts(params: {
  search?: string;
  category_id?: string | null;
  status?: string | null;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}): Promise<{ data: ProductWithInventory[]; total: number }> {
  const {
    search = '',
    category_id = null,
    status = null,
    sort_by = 'name',
    sort_order = 'asc',
    page = 1,
    page_size = 10,
  } = params;

  let query = supabase
    .from('products')
    .select('*, category:categories(*)', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%,brand.ilike.%${search}%`);
  }
  if (category_id) {
    query = query.eq('category_id', category_id);
  }
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const validSorts = ['name', 'sku', 'cost_price', 'selling_price', 'created_at', 'updated_at'];
  const sort = validSorts.includes(sort_by) ? sort_by : 'name';
  query = query.order(sort, { ascending: sort_order === 'asc' });

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const products = (data || []) as ProductWithInventory[];

  if (products.length > 0) {
    const productIds = products.map((p) => p.id);
    const { data: inventory } = await supabase
      .from('warehouse_inventory')
      .select('product_id, quantity_on_hand, quantity_reserved')
      .in('product_id', productIds);

    if (inventory) {
      const stockMap = new Map<string, { on_hand: number; reserved: number }>();
      for (const inv of inventory) {
        const existing = stockMap.get(inv.product_id) || { on_hand: 0, reserved: 0 };
        stockMap.set(inv.product_id, {
          on_hand: existing.on_hand + inv.quantity_on_hand,
          reserved: existing.reserved + inv.quantity_reserved,
        });
      }
      for (const product of products) {
        const stock = stockMap.get(product.id);
        const total = stock?.on_hand ?? 0;
        const reserved = stock?.reserved ?? 0;
        product.total_stock = total;
        product.total_reserved = reserved;
        product.available_stock = total - reserved;
        if (product.status === 'DISCONTINUED') {
          product.stock_status = 'discontinued';
        } else if (total <= 0) {
          product.stock_status = 'out_of_stock';
        } else if (product.reorder_point > 0 && total <= product.reorder_point) {
          product.stock_status = 'low_stock';
        } else {
          product.stock_status = 'in_stock';
        }
      }
    }
  }

  return { data: products, total: count ?? 0 };
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Product | null;
}

export async function fetchProductInventory(id: string): Promise<WarehouseInventory[]> {
  const { data, error } = await supabase
    .from('warehouse_inventory')
    .select('*, warehouse:warehouses(*)')
    .eq('product_id', id);
  if (error) throw new Error(error.message);
  return (data || []) as WarehouseInventory[];
}

export async function createProduct(input: ProductInput, orgId: string): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({ ...input, organization_id: orgId })
    .select('*, category:categories(*)')
    .single();
  if (error) throw new Error(mapDbError(error.message));
  return data as Product;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(input)
    .eq('id', id)
    .select('*, category:categories(*)')
    .single();
  if (error) throw new Error(mapDbError(error.message));
  return data as Product;
}

export async function archiveProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ status: 'INACTIVE' })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  if (error) throw new Error(mapDbError(error.message));
}

// ============================================================
// CATEGORIES
// ============================================================

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  return (data || []) as Category[];
}

export async function fetchCategoryById(id: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Category | null;
}

export async function createCategory(input: CategoryInput, orgId: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...input, organization_id: orgId })
    .select('*')
    .single();
  if (error) throw new Error(mapDbError(error.message));
  return data as Category;
}

export async function updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(mapDbError(error.message));
  return data as Category;
}

export async function archiveCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({ status: 'ARCHIVED' })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  if (error) throw new Error(mapDbError(error.message));
}

// ============================================================
// WAREHOUSES
// ============================================================

export async function fetchWarehouses(): Promise<Warehouse[]> {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  return (data || []) as Warehouse[];
}

export async function fetchWarehouseById(id: string): Promise<Warehouse | null> {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Warehouse | null;
}

export async function fetchWarehouseInventory(warehouseId: string): Promise<WarehouseInventory[]> {
  const { data, error } = await supabase
    .from('warehouse_inventory')
    .select('*, product:products(*)')
    .eq('warehouse_id', warehouseId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as WarehouseInventory[];
}

export async function fetchWarehouseStats(warehouseId: string): Promise<{
  productCount: number;
  totalUnits: number;
  totalValue: number;
}> {
  const { data, error } = await supabase
    .from('warehouse_inventory')
    .select('quantity_on_hand, product:products(cost_price)')
    .eq('warehouse_id', warehouseId)
    .gt('quantity_on_hand', 0);
  if (error) throw new Error(error.message);

  const items = data || [];
  const productCount = items.length;
  const totalUnits = items.reduce((sum: number, item: any) => sum + item.quantity_on_hand, 0);
  const totalValue = items.reduce((sum: number, item: any) => {
    const cost = item.product?.cost_price ?? 0;
    return sum + item.quantity_on_hand * cost;
  }, 0);

  return { productCount, totalUnits, totalValue };
}

export async function createWarehouse(input: WarehouseInput, orgId: string): Promise<Warehouse> {
  const { data, error } = await supabase
    .from('warehouses')
    .insert({ ...input, organization_id: orgId })
    .select('*')
    .single();
  if (error) throw new Error(mapDbError(error.message));
  return data as Warehouse;
}

export async function updateWarehouse(id: string, input: Partial<WarehouseInput>): Promise<Warehouse> {
  const { data, error } = await supabase
    .from('warehouses')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(mapDbError(error.message));
  return data as Warehouse;
}

export async function deleteWarehouse(id: string): Promise<void> {
  const { error } = await supabase
    .from('warehouses')
    .delete()
    .eq('id', id);
  if (error) throw new Error(mapDbError(error.message));
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export async function fetchDashboardStats(orgId: string): Promise<{
  productCount: number;
  totalStock: number;
  warehouseCount: number;
  lowStockCount: number;
}> {
  const [prodRes, whRes, invRes] = await Promise.all([
    supabase.from('products').select('id, reorder_point, status', { count: 'exact' }).eq('organization_id', orgId),
    supabase.from('warehouses').select('id', { count: 'exact' }).eq('organization_id', orgId),
    supabase.from('warehouse_inventory').select('product_id, quantity_on_hand, quantity_reserved').eq('organization_id', orgId),
  ]);

  const productCount = prodRes.count ?? 0;
  const warehouseCount = whRes.count ?? 0;
  const inventory = invRes.data || [];

  const stockByProduct = new Map<string, number>();
  for (const inv of inventory) {
    stockByProduct.set(inv.product_id, (stockByProduct.get(inv.product_id) || 0) + inv.quantity_on_hand);
  }

  const totalStock = inventory.reduce((sum, inv) => sum + inv.quantity_on_hand, 0);

  let lowStockCount = 0;
  for (const prod of (prodRes.data || [])) {
    const stock = stockByProduct.get(prod.id) ?? 0;
    if (prod.status !== 'DISCONTINUED' && prod.reorder_point > 0 && stock <= prod.reorder_point) {
      lowStockCount++;
    }
  }

  return { productCount, totalStock, warehouseCount, lowStockCount };
}

// ============================================================
// HELPERS
// ============================================================

function mapDbError(message: string): string {
  if (message.includes('duplicate key') && message.includes('sku')) {
    return 'A product with this SKU already exists in your organization.';
  }
  if (message.includes('duplicate key') && message.includes('warehouses_code_key')) {
    return 'A warehouse with this code already exists in your organization.';
  }
  if (message.includes('duplicate key') && message.includes('categories')) {
    return 'A category with this name already exists.';
  }
  return message;
}
