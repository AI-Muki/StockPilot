import { supabase } from '@/lib/supabase';
import type {
  MovementType,
  StockMovement,
  StockMovementWithDetails,
  InventoryWithDetails,
  WarehouseInventory,
  Warehouse,
  Product,
  AdjustmentReason,
  AdjustmentDirection,
  InventoryStatus,
} from '@/types';

// ============================================================
// CORE INVENTORY OPERATIONS (via PostgreSQL functions)
// All inventory changes go through these functions.
// Never modify warehouse_inventory directly from UI.
// ============================================================

interface MovementResult {
  product_id: string;
  warehouse_id: string;
  previous_on_hand: number;
  new_on_hand: number;
  previous_reserved: number;
  new_reserved: number;
  available: number;
  movement_type: string;
  quantity: number;
}

export async function increaseStock(params: {
  orgId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  movementType: MovementType;
  reason?: string | null;
  notes?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  userId?: string | null;
}): Promise<MovementResult> {
  const { data, error } = await supabase.rpc('process_inventory_movement', {
    p_org_id: params.orgId,
    p_product_id: params.productId,
    p_warehouse_id: params.warehouseId,
    p_movement_type: params.movementType,
    p_quantity: params.quantity,
    p_reason: params.reason ?? null,
    p_notes: params.notes ?? null,
    p_reference_type: params.referenceType ?? null,
    p_reference_id: params.referenceId ?? null,
    p_user_id: params.userId ?? null,
  });
  if (error) throw new Error(mapInventoryError(error.message));
  return data as MovementResult;
}

export async function decreaseStock(params: {
  orgId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  movementType: MovementType;
  reason?: string | null;
  notes?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  userId?: string | null;
}): Promise<MovementResult> {
  const { data, error } = await supabase.rpc('process_inventory_movement', {
    p_org_id: params.orgId,
    p_product_id: params.productId,
    p_warehouse_id: params.warehouseId,
    p_movement_type: params.movementType,
    p_quantity: params.quantity,
    p_reason: params.reason ?? null,
    p_notes: params.notes ?? null,
    p_reference_type: params.referenceType ?? null,
    p_reference_id: params.referenceId ?? null,
    p_user_id: params.userId ?? null,
  });
  if (error) throw new Error(mapInventoryError(error.message));
  return data as MovementResult;
}

export async function reserveStock(params: {
  orgId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reason?: string | null;
  notes?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  userId?: string | null;
}): Promise<MovementResult> {
  const { data, error } = await supabase.rpc('reserve_stock', {
    p_org_id: params.orgId,
    p_product_id: params.productId,
    p_warehouse_id: params.warehouseId,
    p_quantity: params.quantity,
    p_reason: params.reason ?? null,
    p_notes: params.notes ?? null,
    p_reference_type: params.referenceType ?? null,
    p_reference_id: params.referenceId ?? null,
    p_user_id: params.userId ?? null,
  });
  if (error) throw new Error(mapInventoryError(error.message));
  return data as MovementResult;
}

export async function releaseReservedStock(params: {
  orgId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reason?: string | null;
  notes?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  userId?: string | null;
}): Promise<MovementResult> {
  const { data, error } = await supabase.rpc('release_reserved_stock', {
    p_org_id: params.orgId,
    p_product_id: params.productId,
    p_warehouse_id: params.warehouseId,
    p_quantity: params.quantity,
    p_reason: params.reason ?? null,
    p_notes: params.notes ?? null,
    p_reference_type: params.referenceType ?? null,
    p_reference_id: params.referenceId ?? null,
    p_user_id: params.userId ?? null,
  });
  if (error) throw new Error(mapInventoryError(error.message));
  return data as MovementResult;
}

export async function adjustStock(params: {
  orgId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  direction: AdjustmentDirection;
  reason: AdjustmentReason;
  notes?: string | null;
  userId?: string | null;
}): Promise<MovementResult> {
  const movementType: MovementType = params.direction === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
  const { data, error } = await supabase.rpc('process_inventory_movement', {
    p_org_id: params.orgId,
    p_product_id: params.productId,
    p_warehouse_id: params.warehouseId,
    p_movement_type: movementType,
    p_quantity: params.quantity,
    p_reason: params.reason,
    p_notes: params.notes ?? null,
    p_reference_type: 'ADJUSTMENT',
    p_reference_id: null,
    p_user_id: params.userId ?? null,
  });
  if (error) throw new Error(mapInventoryError(error.message));
  return data as MovementResult;
}

// ============================================================
// READ OPERATIONS
// ============================================================

export async function getAvailableStock(productId: string, warehouseId?: string): Promise<{
  onHand: number;
  reserved: number;
  available: number;
}> {
  let query = supabase
    .from('warehouse_inventory')
    .select('quantity_on_hand, quantity_reserved')
    .eq('product_id', productId);
  if (warehouseId) query = query.eq('warehouse_id', warehouseId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const onHand = (data || []).reduce((sum, inv) => sum + inv.quantity_on_hand, 0);
  const reserved = (data || []).reduce((sum, inv) => sum + inv.quantity_reserved, 0);
  return { onHand, reserved, available: onHand - reserved };
}

export async function getInventoryValue(orgId: string): Promise<{
  totalValue: number;
  totalUnits: number;
  totalCost: number;
}> {
  const { data, error } = await supabase
    .from('warehouse_inventory')
    .select('quantity_on_hand, product:products(cost_price)')
    .eq('organization_id', orgId)
    .gt('quantity_on_hand', 0);
  if (error) throw new Error(error.message);

  const items = data || [];
  const totalUnits = items.reduce((sum: number, item: any) => sum + item.quantity_on_hand, 0);
  const totalValue = items.reduce((sum: number, item: any) => {
    const cost = item.product?.cost_price ?? 0;
    return sum + item.quantity_on_hand * cost;
  }, 0);
  return { totalValue, totalUnits, totalCost: totalValue };
}

export function computeStockStatus(
  onHand: number,
  reorderPoint: number,
  maximumStock: number | null,
): InventoryStatus {
  if (onHand <= 0) return 'OUT_OF_STOCK';
  if (reorderPoint > 0 && onHand <= reorderPoint) return 'LOW_STOCK';
  if (maximumStock !== null && onHand > maximumStock) return 'OVERSTOCKED';
  return 'IN_STOCK';
}

// ============================================================
// INVENTORY LIST (with details)
// ============================================================

export async function fetchInventoryList(params: {
  orgId: string;
  search?: string;
  warehouseId?: string | null;
  status?: string | null;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}): Promise<{ data: InventoryWithDetails[]; total: number }> {
  const {
    search = '',
    warehouseId = null,
    status = null,
    sort_by = 'product_name',
    sort_order = 'asc',
    page = 1,
    page_size = 10,
  } = params;

  let query = supabase
    .from('warehouse_inventory')
    .select(
      '*, product:products(*), warehouse:warehouses(*)',
      { count: 'exact' },
    )
    .eq('organization_id', params.orgId);

  if (warehouseId) {
    query = query.eq('warehouse_id', warehouseId);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  let items = (data || []) as InventoryWithDetails[];

  // Enrich with computed fields
  for (const item of items) {
    const product = item.product as any;
    item.product_name = product?.name ?? '—';
    item.product_sku = product?.sku ?? '—';
    item.product_cost_price = product?.cost_price ?? 0;
    item.product_reorder_point = product?.reorder_point ?? 0;
    item.product_maximum_stock = product?.maximum_stock ?? null;
    item.available_stock = item.quantity_on_hand - item.quantity_reserved;
    item.inventory_status = computeStockStatus(
      item.quantity_on_hand,
      item.product_reorder_point ?? 0,
      item.product_maximum_stock ?? null,
    );
    item.inventory_value = item.quantity_on_hand * (item.product_cost_price ?? 0);
  }

  // Filter by search
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (item) =>
        item.product_name?.toLowerCase().includes(q) ||
        item.product_sku?.toLowerCase().includes(q),
    );
  }

  // Filter by status
  if (status && status !== 'all') {
    items = items.filter((item) => item.inventory_status === status);
  }

  // Sort
  const sortMap: Record<string, (a: InventoryWithDetails, b: InventoryWithDetails) => number> = {
    product_name: (a, b) => (a.product_name ?? '').localeCompare(b.product_name ?? ''),
    product_sku: (a, b) => (a.product_sku ?? '').localeCompare(b.product_sku ?? ''),
    quantity_on_hand: (a, b) => a.quantity_on_hand - b.quantity_on_hand,
    available: (a, b) => (a.available_stock ?? 0) - (b.available_stock ?? 0),
    inventory_value: (a, b) => (a.inventory_value ?? 0) - (b.inventory_value ?? 0),
  };
  const sorter = sortMap[sort_by] || sortMap.product_name;
  items.sort((a, b) => (sort_order === 'asc' ? sorter(a, b) : -sorter(a, b)));

  const total = items.length;
  const from = (page - 1) * page_size;
  const paginated = items.slice(from, from + page_size);

  return { data: paginated, total };
}

// ============================================================
// STOCK MOVEMENTS
// ============================================================

export async function fetchStockMovements(params: {
  orgId: string;
  search?: string;
  productId?: string | null;
  warehouseId?: string | null;
  movementType?: string | null;
  page?: number;
  page_size?: number;
}): Promise<{ data: StockMovementWithDetails[]; total: number }> {
  const {
    search = '',
    productId = null,
    warehouseId = null,
    movementType = null,
    page = 1,
    page_size = 15,
  } = params;

  let query = supabase
    .from('stock_movements')
    .select(
      '*, product:products(name, sku), warehouse:warehouses(name, code), user:profiles(email, full_name)',
      { count: 'exact' },
    )
    .eq('organization_id', params.orgId)
    .order('created_at', { ascending: false });

  if (productId) query = query.eq('product_id', productId);
  if (warehouseId) query = query.eq('warehouse_id', warehouseId);
  if (movementType && movementType !== 'all') query = query.eq('movement_type', movementType);

  const from = (page - 1) * page_size;
  query = query.range(from, from + page_size - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  let movements = (data || []) as StockMovementWithDetails[];
  if (search) {
    const q = search.toLowerCase();
    movements = movements.filter(
      (m) =>
        (m.product as any)?.name?.toLowerCase().includes(q) ||
        (m.product as any)?.sku?.toLowerCase().includes(q) ||
        (m.warehouse as any)?.name?.toLowerCase().includes(q),
    );
  }

  return { data: movements, total: count ?? 0 };
}

// ============================================================
// ADJUSTMENTS
// ============================================================

export async function createAdjustment(params: {
  orgId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  direction: AdjustmentDirection;
  reason: AdjustmentReason;
  notes?: string | null;
  userId?: string | null;
}): Promise<MovementResult> {
  const movementType: MovementType =
    params.direction === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';

  const { data, error } = await supabase.rpc('process_inventory_movement', {
    p_org_id: params.orgId,
    p_product_id: params.productId,
    p_warehouse_id: params.warehouseId,
    p_movement_type: movementType,
    p_quantity: params.quantity,
    p_reason: params.reason,
    p_notes: params.notes ?? null,
    p_reference_type: 'ADJUSTMENT',
    p_reference_id: null,
    p_user_id: params.userId ?? null,
  });
  if (error) throw new Error(mapInventoryError(error.message));
  return data as MovementResult;
}

export async function fetchAdjustments(params: {
  orgId: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<{ data: StockMovementWithDetails[]; total: number }> {
  const {
    search = '',
    page = 1,
    page_size = 15,
  } = params;

  let query = supabase
    .from('stock_movements')
    .select(
      '*, product:products(name, sku), warehouse:warehouses(name, code), user:profiles(email, full_name)',
      { count: 'exact' },
    )
    .eq('organization_id', params.orgId)
    .in('movement_type', ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'])
    .order('created_at', { ascending: false });

  const from = (page - 1) * page_size;
  query = query.range(from, from + page_size - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  let movements = (data || []) as StockMovementWithDetails[];
  if (search) {
    const q = search.toLowerCase();
    movements = movements.filter(
      (m) =>
        (m.product as any)?.name?.toLowerCase().includes(q) ||
        (m.product as any)?.sku?.toLowerCase().includes(q) ||
        (m.warehouse as any)?.name?.toLowerCase().includes(q),
    );
  }

  return { data: movements, total: count ?? 0 };
}

// ============================================================
// AUDIT LOGS
// ============================================================

export async function fetchAuditLogs(params: {
  orgId: string;
  entity?: string | null;
  page?: number;
  page_size?: number;
}): Promise<{ data: any[]; total: number }> {
  const { entity = null, page = 1, page_size = 20 } = params;
  let query = supabase
    .from('audit_logs')
    .select('*, user:profiles(email, full_name)', { count: 'exact' })
    .eq('organization_id', params.orgId)
    .order('created_at', { ascending: false });

  if (entity && entity !== 'all') query = query.eq('entity', entity);

  const from = (page - 1) * page_size;
  query = query.range(from, from + page_size - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: data || [], total: count ?? 0 };
}

export async function logAudit(params: {
  orgId: string;
  userId: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    organization_id: params.orgId,
    user_id: params.userId,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId,
    before: params.before ?? null,
    after: params.after ?? null,
  });
  if (error) throw new Error(error.message);
}

// ============================================================
// HELPERS
// ============================================================

function mapInventoryError(message: string): string {
  if (message.includes('Insufficient stock')) {
    return message;
  }
  if (message.includes('Cannot reserve more than available')) {
    return message;
  }
  return message;
}

export function formatMovementType(type: MovementType): string {
  const labels: Record<MovementType, string> = {
    PURCHASE_RECEIPT: 'Purchase Receipt',
    SALE: 'Sale',
    TRANSFER_OUT: 'Transfer Out',
    TRANSFER_IN: 'Transfer In',
    ADJUSTMENT_IN: 'Adjustment In',
    ADJUSTMENT_OUT: 'Adjustment Out',
    RETURN_IN: 'Return In',
    RETURN_OUT: 'Return Out',
    DAMAGE: 'Damage',
    INITIAL_STOCK: 'Initial Stock',
  };
  return labels[type] || type;
}

export function getMovementTypeColor(type: MovementType): string {
  const increaseTypes: MovementType[] = ['PURCHASE_RECEIPT', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN_IN', 'INITIAL_STOCK'];
  const decreaseTypes: MovementType[] = ['SALE', 'TRANSFER_OUT', 'ADJUSTMENT_OUT', 'RETURN_OUT', 'DAMAGE'];
  if (increaseTypes.includes(type)) return 'text-green-600 dark:text-green-400';
  if (decreaseTypes.includes(type)) return 'text-red-600 dark:text-red-400';
  return 'text-muted-foreground';
}
