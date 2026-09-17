import type { PermissionCode, RoleName } from '@/types';

export const ALL_PERMISSIONS: PermissionCode[] = [
  'products.view',
  'products.create',
  'products.update',
  'products.delete',
  'inventory.view',
  'inventory.adjust',
  'inventory.transfer',
  'warehouses.manage',
  'purchases.view',
  'purchases.create',
  'purchases.approve',
  'purchases.receive',
  'sales.view',
  'sales.create',
  'sales.fulfill',
  'suppliers.manage',
  'customers.manage',
  'reports.view',
  'users.manage',
  'settings.manage',
];

export const ROLE_PERMISSIONS: Record<RoleName, PermissionCode[]> = {
  OWNER: [...ALL_PERMISSIONS],
  ADMIN: ALL_PERMISSIONS.filter((p) => p !== 'users.manage'),
  WAREHOUSE_MANAGER: [
    'products.view',
    'products.create',
    'products.update',
    'inventory.view',
    'inventory.adjust',
    'inventory.transfer',
    'warehouses.manage',
    'purchases.view',
    'purchases.receive',
    'sales.view',
    'sales.fulfill',
    'reports.view',
  ],
  INVENTORY_MANAGER: [
    'products.view',
    'products.create',
    'products.update',
    'inventory.view',
    'inventory.adjust',
    'purchases.view',
    'purchases.receive',
    'sales.view',
    'reports.view',
  ],
  SALES: [
    'products.view',
    'inventory.view',
    'sales.view',
    'sales.create',
    'sales.fulfill',
    'customers.manage',
    'reports.view',
  ],
  PURCHASING: [
    'products.view',
    'products.create',
    'products.update',
    'inventory.view',
    'purchases.view',
    'purchases.create',
    'purchases.receive',
    'suppliers.manage',
    'reports.view',
  ],
  VIEWER: ALL_PERMISSIONS.filter((p) => p.endsWith('.view')),
};

export function hasPermission(
  permissions: PermissionCode[],
  code: PermissionCode,
): boolean {
  return permissions.includes(code);
}

export function hasAnyPermission(
  permissions: PermissionCode[],
  codes: PermissionCode[],
): boolean {
  return codes.some((code) => permissions.includes(code));
}

export function getRoleDisplayName(role: RoleName): string {
  const names: Record<RoleName, string> = {
    OWNER: 'Owner',
    ADMIN: 'Administrator',
    WAREHOUSE_MANAGER: 'Warehouse Manager',
    INVENTORY_MANAGER: 'Inventory Manager',
    SALES: 'Sales',
    PURCHASING: 'Purchasing',
    VIEWER: 'Viewer',
  };
  return names[role];
}
