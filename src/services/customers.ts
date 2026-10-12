import { supabase } from '@/lib/supabase';
import type { Customer, CustomerInput, CustomerWithStats } from '@/types';

export async function fetchCustomers(params: {
  search?: string;
  status?: string | null;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}): Promise<{ data: CustomerWithStats[]; total: number }> {
  const {
    search = '',
    status = null,
    sort_by = 'company_name',
    sort_order = 'asc',
    page = 1,
    page_size = 10,
  } = params;

  let query = supabase
    .from('customers')
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

  const customers = (data || []) as CustomerWithStats[];

  if (customers.length > 0) {
    const customerIds = customers.map((c) => c.id);
    const { data: soData } = await supabase
      .from('sales_orders')
      .select('customer_id, status, total')
      .in('customer_id', customerIds);

    if (soData) {
      const statsMap = new Map<string, { total: number; spending: number; open: number; fulfilled: number }>();
      for (const so of soData) {
        if (!so.customer_id) continue;
        const existing = statsMap.get(so.customer_id) || { total: 0, spending: 0, open: 0, fulfilled: 0 };
        existing.total++;
        existing.spending += so.total || 0;
        if (['DRAFT', 'CONFIRMED', 'PROCESSING', 'PARTIALLY_FULFILLED'].includes(so.status)) {
          existing.open++;
        }
        if (so.status === 'FULFILLED') {
          existing.fulfilled++;
        }
        statsMap.set(so.customer_id, existing);
      }
      for (const customer of customers) {
        const stats = statsMap.get(customer.id);
        customer.total_orders = stats?.total ?? 0;
        customer.total_spending = stats?.spending ?? 0;
        customer.open_orders = stats?.open ?? 0;
        customer.fulfilled_orders = stats?.fulfilled ?? 0;
      }
    }
  }

  return { data: customers, total: count ?? 0 };
}

export async function fetchCustomerById(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Customer | null;
}

export async function fetchCustomerStats(customerId: string): Promise<{
  totalOrders: number;
  totalSpending: number;
  openOrders: number;
  fulfilledOrders: number;
}> {
  const { data, error } = await supabase
    .from('sales_orders')
    .select('status, total')
    .eq('customer_id', customerId);

  if (error) throw new Error(error.message);

  const orders = data || [];
  return {
    totalOrders: orders.length,
    totalSpending: orders.filter((o) => o.status === 'FULFILLED').reduce((sum, o) => sum + (o.total || 0), 0),
    openOrders: orders.filter((o) =>
      ['DRAFT', 'CONFIRMED', 'PROCESSING', 'PARTIALLY_FULFILLED'].includes(o.status),
    ).length,
    fulfilledOrders: orders.filter((o) => o.status === 'FULFILLED').length,
  };
}

export async function createCustomer(input: CustomerInput, orgId: string): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...input, organization_id: orgId })
    .select('*')
    .single();
  if (error) throw new Error(mapCustomerError(error.message));
  return data as Customer;
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(mapCustomerError(error.message));
  return data as Customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

function mapCustomerError(message: string): string {
  if (message.includes('duplicate key')) {
    return 'A customer with this name already exists.';
  }
  return message;
}
