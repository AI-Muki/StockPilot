import { supabase } from '@/lib/supabase';
import type {
  SalesOrder,
  SalesOrderWithItems,
  SalesOrderItem,
  SalesOrderInput,
  SalesOrderItemInput,
  SalesOrderStatus,
  PaymentStatus,
} from '@/types';

// ============================================================
// SALES ORDERS LIST
// ============================================================

export async function fetchSalesOrders(params: {
  search?: string;
  customerId?: string | null;
  status?: string | null;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}): Promise<{ data: SalesOrder[]; total: number }> {
  const {
    search = '',
    customerId = null,
    status = null,
    sort_by = 'created_at',
    sort_order = 'desc',
    page = 1,
    page_size = 10,
  } = params;

  let query = supabase
    .from('sales_orders')
    .select(
      '*, customer:customers(*), warehouse:warehouses(*), created_by_profile:profiles!created_by(email, full_name)',
      { count: 'exact' },
    );

  if (customerId) query = query.eq('customer_id', customerId);
  if (status && status !== 'all') query = query.eq('status', status);
  if (search) {
    query = query.or(`so_number.ilike.%${search}%`);
  }

  const validSorts = ['so_number', 'created_at', 'order_date', 'delivery_date', 'total', 'status'];
  const sort = validSorts.includes(sort_by) ? sort_by : 'created_at';
  query = query.order(sort, { ascending: sort_order === 'asc' });

  const from = (page - 1) * page_size;
  query = query.range(from, from + page_size - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { data: (data || []) as SalesOrder[], total: count ?? 0 };
}

export async function fetchSalesOrderById(id: string): Promise<SalesOrderWithItems | null> {
  const { data: so, error: soError } = await supabase
    .from('sales_orders')
    .select(
      '*, customer:customers(*), warehouse:warehouses(*), created_by_profile:profiles!created_by(email, full_name)',
    )
    .eq('id', id)
    .maybeSingle();

  if (soError) throw new Error(soError.message);
  if (!so) return null;

  const { data: items, error: itemsError } = await supabase
    .from('sales_order_items')
    .select('*, product:products(*)')
    .eq('sales_order_id', id)
    .order('created_at', { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  return { ...(so as SalesOrder), items: (items || []) as SalesOrderItem[] };
}

// ============================================================
// SALES ORDER CRUD
// ============================================================

export async function createSalesOrder(
  input: SalesOrderInput,
  orgId: string,
  userId: string,
): Promise<SalesOrder> {
  const { data: soNumberData, error: soNumError } = await supabase.rpc('generate_so_number', {
    p_org_id: orgId,
  });
  if (soNumError) throw new Error(soNumError.message);

  const soNumber = soNumberData as string;

  const { items, ...soFields } = input;
  const totals = calculateSOTotals(items);

  const { data: so, error: soError } = await supabase
    .from('sales_orders')
    .insert({
      ...soFields,
      organization_id: orgId,
      so_number: soNumber,
      status: 'DRAFT',
      payment_status: 'UNPAID',
      created_by: userId,
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      discount_amount: totals.discountAmount,
      total: totals.total,
    })
    .select('*')
    .single();

  if (soError) throw new Error(soError.message);

  const soId = (so as SalesOrder).id;
  const itemRows = items.map((item) => ({
    sales_order_id: soId,
    product_id: item.product_id,
    quantity: item.quantity,
    reserved_quantity: 0,
    fulfilled_quantity: 0,
    unit_price: item.unit_price,
    tax_rate: item.tax_rate,
    discount_amount: item.discount_amount,
    line_total: calculateSOLineTotal(item),
  }));

  const { error: itemsError } = await supabase
    .from('sales_order_items')
    .insert(itemRows);

  if (itemsError) throw new Error(itemsError.message);

  return so as SalesOrder;
}

export async function deleteSalesOrder(id: string): Promise<void> {
  const { error } = await supabase
    .from('sales_orders')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================================
// SALES ORDER WORKFLOW
// ============================================================

const VALID_TRANSITIONS: Record<SalesOrderStatus, SalesOrderStatus[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED'],
  PROCESSING: ['PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED'],
  PARTIALLY_FULFILLED: ['FULFILLED', 'CANCELLED'],
  FULFILLED: [],
  CANCELLED: [],
};

export function canTransitionSO(from: SalesOrderStatus, to: SalesOrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ============================================================
// CONFIRM SALES ORDER (reserve stock)
// ============================================================

export interface ConfirmResult {
  so_id: string;
  status: string;
  items_reserved: number;
}

export async function confirmSalesOrder(soId: string, userId: string | null): Promise<ConfirmResult> {
  const { data, error } = await supabase.rpc('confirm_sales_order', {
    p_so_id: soId,
    p_user_id: userId,
  });
  if (error) throw new Error(mapConfirmError(error.message));
  return data as ConfirmResult;
}

// ============================================================
// FULFILL SALES ORDER ITEM
// ============================================================

export interface FulfillResult {
  item_id: string;
  fulfilled_quantity: number;
  remaining: number;
  so_status: string;
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

export async function fulfillSalesOrderItem(
  soId: string,
  itemId: string,
  fulfillQty: number,
  userId: string | null,
): Promise<FulfillResult> {
  const { data, error } = await supabase.rpc('fulfill_sales_order_item', {
    p_so_id: soId,
    p_item_id: itemId,
    p_fulfill_qty: fulfillQty,
    p_user_id: userId,
  });
  if (error) throw new Error(mapFulfillError(error.message));
  return data as FulfillResult;
}

// ============================================================
// CANCEL SALES ORDER (release reservations)
// ============================================================

export interface CancelResult {
  so_id: string;
  status: string;
  reservations_released: number;
}

export async function cancelSalesOrder(soId: string, userId: string | null): Promise<CancelResult> {
  const { data, error } = await supabase.rpc('cancel_sales_order', {
    p_so_id: soId,
    p_user_id: userId,
  });
  if (error) throw new Error(mapCancelError(error.message));
  return data as CancelResult;
}

// ============================================================
// UPDATE PAYMENT STATUS
// ============================================================

export async function updatePaymentStatus(
  soId: string,
  paymentStatus: PaymentStatus,
): Promise<void> {
  const { error } = await supabase
    .from('sales_orders')
    .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
    .eq('id', soId);
  if (error) throw new Error(error.message);
}

// ============================================================
// HELPERS
// ============================================================

export function calculateSOLineTotal(item: SalesOrderItemInput): number {
  const base = item.quantity * item.unit_price;
  const afterDiscount = base - (item.discount_amount || 0);
  const tax = afterDiscount * (item.tax_rate || 0) / 100;
  return afterDiscount + tax;
}

export function calculateSOTotals(items: SalesOrderItemInput[]): {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
} {
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;

  for (const item of items) {
    const base = item.quantity * item.unit_price;
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

export function formatSOStatus(status: SalesOrderStatus): string {
  const labels: Record<SalesOrderStatus, string> = {
    DRAFT: 'Draft',
    CONFIRMED: 'Confirmed',
    PROCESSING: 'Processing',
    PARTIALLY_FULFILLED: 'Partially Fulfilled',
    FULFILLED: 'Fulfilled',
    CANCELLED: 'Cancelled',
  };
  return labels[status] || status;
}

export function getSOStatusColor(status: SalesOrderStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400';
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'PROCESSING':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
    case 'PARTIALLY_FULFILLED':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'FULFILLED':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'CANCELLED':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function formatPaymentStatus(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    UNPAID: 'Unpaid',
    PARTIALLY_PAID: 'Partially Paid',
    PAID: 'Paid',
  };
  return labels[status] || status;
}

export function getPaymentStatusColor(status: PaymentStatus): string {
  switch (status) {
    case 'UNPAID':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'PARTIALLY_PAID':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'PAID':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function mapConfirmError(message: string): string {
  if (message.includes('Insufficient stock')) {
    return message;
  }
  if (message.includes('Only DRAFT orders can be confirmed')) {
    return message;
  }
  return message;
}

function mapFulfillError(message: string): string {
  if (message.includes('Cannot fulfill more than remaining')) {
    return message;
  }
  if (message.includes('Cannot fulfill order with status')) {
    return message;
  }
  return message;
}

function mapCancelError(message: string): string {
  if (message.includes('Cannot cancel order with status')) {
    return message;
  }
  return message;
}
