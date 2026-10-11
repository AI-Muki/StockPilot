import { supabase } from '@/lib/supabase';
import type {
  PurchaseOrder,
  PurchaseOrderWithItems,
  PurchaseOrderItem,
  PurchaseOrderInput,
  PurchaseOrderItemInput,
  PurchaseOrderStatus,
} from '@/types';

// ============================================================
// PURCHASE ORDERS LIST
// ============================================================

export async function fetchPurchaseOrders(params: {
  search?: string;
  supplierId?: string | null;
  status?: string | null;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}): Promise<{ data: PurchaseOrder[]; total: number }> {
  const {
    search = '',
    supplierId = null,
    status = null,
    sort_by = 'created_at',
    sort_order = 'desc',
    page = 1,
    page_size = 10,
  } = params;

  let query = supabase
    .from('purchase_orders')
    .select(
      '*, supplier:suppliers(*), warehouse:warehouses(*), created_by_profile:profiles!created_by(email, full_name)',
      { count: 'exact' },
    );

  if (supplierId) query = query.eq('supplier_id', supplierId);
  if (status && status !== 'all') query = query.eq('status', status);
  if (search) {
    query = query.or(`po_number.ilike.%${search}%`);
  }

  const validSorts = ['po_number', 'created_at', 'order_date', 'expected_delivery', 'total', 'status'];
  const sort = validSorts.includes(sort_by) ? sort_by : 'created_at';
  query = query.order(sort, { ascending: sort_order === 'asc' });

  const from = (page - 1) * page_size;
  query = query.range(from, from + page_size - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { data: (data || []) as PurchaseOrder[], total: count ?? 0 };
}

export async function fetchPurchaseOrderById(id: string): Promise<PurchaseOrderWithItems | null> {
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .select(
      '*, supplier:suppliers(*), warehouse:warehouses(*), created_by_profile:profiles!created_by(email, full_name)',
    )
    .eq('id', id)
    .maybeSingle();

  if (poError) throw new Error(poError.message);
  if (!po) return null;

  const { data: items, error: itemsError } = await supabase
    .from('purchase_order_items')
    .select('*, product:products(*)')
    .eq('purchase_order_id', id)
    .order('created_at', { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  return { ...(po as PurchaseOrder), items: (items || []) as PurchaseOrderItem[] };
}

// ============================================================
// PURCHASE ORDER CRUD
// ============================================================

export async function createPurchaseOrder(
  input: PurchaseOrderInput,
  orgId: string,
  userId: string,
): Promise<PurchaseOrder> {
  const { data: poNumberData, error: poNumError } = await supabase.rpc('generate_po_number', {
    p_org_id: orgId,
  });
  if (poNumError) throw new Error(poNumError.message);

  const poNumber = poNumberData as string;

  const { items, ...poFields } = input;
  const totals = calculateTotals(items);

  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      ...poFields,
      organization_id: orgId,
      po_number: poNumber,
      status: 'DRAFT',
      created_by: userId,
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      discount_amount: totals.discountAmount,
      total: totals.total,
    })
    .select('*')
    .single();

  if (poError) throw new Error(poError.message);

  const poId = (po as PurchaseOrder).id;
  const itemRows = items.map((item) => ({
    purchase_order_id: poId,
    product_id: item.product_id,
    quantity: item.quantity,
    received_quantity: 0,
    unit_cost: item.unit_cost,
    tax_rate: item.tax_rate,
    discount_amount: item.discount_amount,
    line_total: calculateLineTotal(item),
  }));

  const { error: itemsError } = await supabase
    .from('purchase_order_items')
    .insert(itemRows);

  if (itemsError) throw new Error(itemsError.message);

  return po as PurchaseOrder;
}

export async function updatePurchaseOrder(
  id: string,
  input: PurchaseOrderInput,
): Promise<void> {
  const { items, ...poFields } = input;
  const totals = calculateTotals(items);

  const { error: poError } = await supabase
    .from('purchase_orders')
    .update({
      ...poFields,
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      discount_amount: totals.discountAmount,
      total: totals.total,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (poError) throw new Error(poError.message);

  // Delete existing items and re-insert (only allowed in DRAFT)
  const { error: delError } = await supabase
    .from('purchase_order_items')
    .delete()
    .eq('purchase_order_id', id);

  if (delError) throw new Error(delError.message);

  const itemRows = items.map((item) => ({
    purchase_order_id: id,
    product_id: item.product_id,
    quantity: item.quantity,
    received_quantity: 0,
    unit_cost: item.unit_cost,
    tax_rate: item.tax_rate,
    discount_amount: item.discount_amount,
    line_total: calculateLineTotal(item),
  }));

  const { error: itemsError } = await supabase
    .from('purchase_order_items')
    .insert(itemRows);

  if (itemsError) throw new Error(itemsError.message);
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  const { error } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================================
// PURCHASE ORDER WORKFLOW
// ============================================================

const VALID_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['ORDERED', 'CANCELLED'],
  ORDERED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
  PARTIALLY_RECEIVED: ['RECEIVED'],
  RECEIVED: [],
  CANCELLED: [],
};

export function canTransition(from: PurchaseOrderStatus, to: PurchaseOrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function transitionPurchaseOrder(
  id: string,
  toStatus: PurchaseOrderStatus,
): Promise<void> {
  const { data: po, error: fetchError } = await supabase
    .from('purchase_orders')
    .select('status')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!po) throw new Error('Purchase order not found');

  const currentStatus = po.status as PurchaseOrderStatus;
  if (!canTransition(currentStatus, toStatus)) {
    throw new Error(`Cannot transition from ${currentStatus} to ${toStatus}`);
  }

  const { error } = await supabase
    .from('purchase_orders')
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ============================================================
// RECEIVING GOODS
// ============================================================

export interface ReceiveResult {
  item_id: string;
  received_quantity: number;
  remaining: number;
  po_status: string;
  inventory_result: {
    product_id: string;
    warehouse_id: string;
    previous_on_hand: number;
    new_on_hand: number;
    previous_reserved: number;
    new_reserved: number;
    available: number;
    movement_type: string;
    quantity: number;
  };
}

export async function receivePurchaseOrderItem(
  poId: string,
  itemId: string,
  receiveQty: number,
  userId: string | null,
): Promise<ReceiveResult> {
  const { data, error } = await supabase.rpc('receive_purchase_order_item', {
    p_po_id: poId,
    p_item_id: itemId,
    p_receive_qty: receiveQty,
    p_user_id: userId,
  });
  if (error) throw new Error(mapReceiveError(error.message));
  return data as ReceiveResult;
}

// ============================================================
// PURCHASE ANALYTICS
// ============================================================

export async function fetchPurchaseOrderStats(orgId: string): Promise<{
  totalOrders: number;
  totalSpending: number;
  pendingOrders: number;
  receivedOrders: number;
}> {
  const { data, error, count } = await supabase
    .from('purchase_orders')
    .select('status, total', { count: 'exact' })
    .eq('organization_id', orgId);

  if (error) throw new Error(error.message);

  const orders = data || [];
  return {
    totalOrders: count ?? 0,
    totalSpending: orders
      .filter((o) => o.status === 'RECEIVED')
      .reduce((sum, o) => sum + (o.total || 0), 0),
    pendingOrders: orders.filter((o) =>
      ['DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(o.status),
    ).length,
    receivedOrders: orders.filter((o) => o.status === 'RECEIVED').length,
  };
}

// ============================================================
// HELPERS
// ============================================================

export function calculateLineTotal(item: PurchaseOrderItemInput): number {
  const base = item.quantity * item.unit_cost;
  const afterDiscount = base - (item.discount_amount || 0);
  const tax = afterDiscount * (item.tax_rate || 0) / 100;
  return afterDiscount + tax;
}

export function calculateTotals(items: PurchaseOrderItemInput[]): {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
} {
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;

  for (const item of items) {
    const base = item.quantity * item.unit_cost;
    const discount = item.discount_amount || 0;
    const afterDiscount = base - discount;
    const tax = afterDiscount * (item.tax_rate || 0) / 100;

    subtotal += base;
    taxAmount += tax;
    discountAmount += discount;
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    total: Math.round((subtotal - discountAmount + taxAmount) * 100) / 100,
  };
}

export function formatPOStatus(status: PurchaseOrderStatus): string {
  const labels: Record<PurchaseOrderStatus, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    ORDERED: 'Ordered',
    PARTIALLY_RECEIVED: 'Partially Received',
    RECEIVED: 'Received',
    CANCELLED: 'Cancelled',
  };
  return labels[status] || status;
}

export function getPOStatusColor(status: PurchaseOrderStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400';
    case 'SUBMITTED':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'APPROVED':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
    case 'ORDERED':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
    case 'PARTIALLY_RECEIVED':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'RECEIVED':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'CANCELLED':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function mapReceiveError(message: string): string {
  if (message.includes('Cannot receive more than remaining')) {
    return message;
  }
  if (message.includes('Cannot receive goods for PO with status')) {
    return message;
  }
  return message;
}
