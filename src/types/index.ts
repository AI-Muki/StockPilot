export type RoleName =
  | 'OWNER'
  | 'ADMIN'
  | 'WAREHOUSE_MANAGER'
  | 'INVENTORY_MANAGER'
  | 'SALES'
  | 'PURCHASING'
  | 'VIEWER';

export type PermissionCode =
  | 'products.view'
  | 'products.create'
  | 'products.update'
  | 'products.delete'
  | 'inventory.view'
  | 'inventory.adjust'
  | 'inventory.transfer'
  | 'warehouses.manage'
  | 'purchases.view'
  | 'purchases.create'
  | 'purchases.approve'
  | 'purchases.receive'
  | 'sales.view'
  | 'sales.create'
  | 'sales.fulfill'
  | 'suppliers.manage'
  | 'customers.manage'
  | 'reports.view'
  | 'users.manage'
  | 'settings.manage';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: RoleName;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface Permission {
  id: string;
  code: PermissionCode;
  description: string | null;
  module: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  organization_id: string;
  role_id: string;
  created_at: string;
  role?: Role;
}

export interface Setting {
  id: string;
  organization_id: string;
  key: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  organizationId: string | null;
  organizationName: string | null;
  role: RoleName | null;
  permissions: PermissionCode[];
}

export type CategoryStatus = 'ACTIVE' | 'ARCHIVED';

export interface Category {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  parent_category_id: string | null;
  status: CategoryStatus;
  created_at: string;
  updated_at: string;
  parent?: Category | null;
  product_count?: number;
}

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';

export interface Product {
  id: string;
  organization_id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category_id: string | null;
  brand: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  tax_rate: number;
  minimum_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  maximum_stock: number | null;
  weight: number | null;
  dimensions: string | null;
  status: ProductStatus;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
}

export interface ProductWithInventory extends Product {
  total_stock?: number;
  total_reserved?: number;
  available_stock?: number;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
}

export type WarehouseStatus = 'ACTIVE' | 'INACTIVE';

export interface Warehouse {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  country: string | null;
  manager: string | null;
  phone: string | null;
  email: string | null;
  capacity: number | null;
  status: WarehouseStatus;
  created_at: string;
  updated_at: string;
}

export interface WarehouseInventory {
  id: string;
  organization_id: string;
  warehouse_id: string;
  product_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_incoming: number;
  quantity_damaged: number;
  created_at: string;
  updated_at: string;
  warehouse?: Warehouse;
  product?: Product;
}

export interface ProductInput {
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category_id: string | null;
  brand: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  tax_rate: number;
  minimum_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  maximum_stock: number | null;
  weight: number | null;
  dimensions: string | null;
  status: ProductStatus;
  image_url: string | null;
}

export interface CategoryInput {
  name: string;
  description: string | null;
  parent_category_id: string | null;
  status: CategoryStatus;
}

export interface WarehouseInput {
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  country: string | null;
  manager: string | null;
  phone: string | null;
  email: string | null;
  capacity: number | null;
  status: WarehouseStatus;
}
