import { supabase } from '@/lib/supabase';
import type { Supplier, SupplierInput, SupplierWithStats } from '@/types';

// ============================================================
// SUPPLIERS CRUD
// ============================================================

export async function fetchSuppliers(params: {
  search?: string;
  status?: string | null;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}): Promise<{ data: SupplierWithStats[]; total: number }> {
  const {
    search = '',
    status = null,
    sort_by = 'company_name',
    sort_order = 'asc',
    page = 1,
    page_size = 10,
  } = params;

  let query = supabase
    .from('suppliers')
    .select('*', { count: 'exact' });

  if (search) {
    query = query.or(
      `company_name.ilike.%${search}%,contact_person.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
    );
  }
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const validSorts = ['company_name', 'created_at', 'updated_at'];
  const sort = validSorts.includes(sort_by) ? sort_by : 'company_name';
  query = query.order(sort, { ascending: sort_order === 'asc' });

  const from = (page - 1) * page_size;
  query = query.range(from, from + page_size - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const suppliers = (data || []) as SupplierWithStats[];

  if (suppliers.length > 0) {
    const supplierIds = suppliers.map((s) => s.id);
    const { data: poData } = await supabase
      .from('purchase_orders')
      .select('supplier_id, status, total')
      .in('supplier_id', supplierIds);

    if (poData) {
      const statsMap = new Map<string, { total: number; spending: number; pending: number; received: number }>();
      for (const po of poData) {
        if (!po.supplier_id) continue;
        const existing = statsMap.get(po.supplier_id) || { total: 0, spending: 0, pending: 0, received: 0 };
        existing.total++;
        existing.spending += po.total || 0;
        if (['DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
          existing.pending++;
        }
        if (po.status === 'RECEIVED') {
          existing.received++;
        }
        statsMap.set(po.supplier_id, existing);
      }
      for (const supplier of suppliers) {
        const stats = statsMap.get(supplier.id);
        supplier.total_orders = stats?.total ?? 0;
        supplier.total_spending = stats?.spending ?? 0;
        supplier.pending_orders = stats?.pending ?? 0;
        supplier.received_orders = stats?.received ?? 0;
      }
    }
  }

  return { data: suppliers, total: count ?? 0 };
}

export async function fetchSupplierById(id: string): Promise<Supplier | null> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Supplier | null;
}

export async function fetchSupplierStats(supplierId: string): Promise<{
  totalOrders: number;
  totalSpending: number;
  pendingOrders: number;
  receivedOrders: number;
}> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('status, total')
    .eq('supplier_id', supplierId);

  if (error) throw new Error(error.message);

  const orders = data || [];
  return {
    totalOrders: orders.length,
    totalSpending: orders.reduce((sum, o) => sum + (o.total || 0), 0),
    pendingOrders: orders.filter((o) =>
      ['DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(o.status),
    ).length,
    receivedOrders: orders.filter((o) => o.status === 'RECEIVED').length,
  };
}

export async function createSupplier(input: SupplierInput, orgId: string): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ ...input, organization_id: orgId })
    .select('*')
    .single();
  if (error) throw new Error(mapSupplierError(error.message));
  return data as Supplier;
}

export async function updateSupplier(id: string, input: Partial<SupplierInput>): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(mapSupplierError(error.message));
  return data as Supplier;
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================================
// HELPERS
// ============================================================

function mapSupplierError(message: string): string {
  if (message.includes('duplicate key')) {
    return 'A supplier with this name already exists.';
  }
  return message;
}
