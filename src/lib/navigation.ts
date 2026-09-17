import {
  LayoutDashboard,
  Package,
  Boxes,
  ArrowLeftRight,
  SlidersHorizontal,
  ShoppingCart,
  Truck,
  Users,
  Building2,
  BarChart3,
  FileText,
  Bot,
  UserCog,
  Bell,
  ScrollText,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Products', to: '/products', icon: Package, permission: 'products.view' },
      { label: 'Categories', to: '/categories', icon: Package, permission: 'products.view' },
      { label: 'Inventory', to: '/inventory', icon: Boxes, permission: 'inventory.view' },
      { label: 'Warehouses', to: '/warehouses', icon: Building2, permission: 'warehouses.manage' },
      { label: 'Stock Movements', to: '/stock-movements', icon: ArrowLeftRight, permission: 'inventory.view' },
      { label: 'Transfers', to: '/transfers', icon: ArrowLeftRight, permission: 'inventory.transfer' },
      { label: 'Adjustments', to: '/adjustments', icon: SlidersHorizontal, permission: 'inventory.adjust' },
    ],
  },
  {
    title: 'Orders',
    items: [
      { label: 'Purchase Orders', to: '/purchase-orders', icon: ShoppingCart, permission: 'purchases.view' },
      { label: 'Sales Orders', to: '/sales-orders', icon: Truck, permission: 'sales.view' },
    ],
  },
  {
    title: 'Contacts',
    items: [
      { label: 'Customers', to: '/customers', icon: Users, permission: 'customers.manage' },
      { label: 'Suppliers', to: '/suppliers', icon: Building2, permission: 'suppliers.manage' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Analytics', to: '/analytics', icon: BarChart3, permission: 'reports.view' },
      { label: 'Reports', to: '/reports', icon: FileText, permission: 'reports.view' },
      { label: 'AI Assistant', to: '/ai-assistant', icon: Bot, permission: 'reports.view' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Users', to: '/users', icon: UserCog, permission: 'users.manage' },
      { label: 'Notifications', to: '/notifications', icon: Bell },
      { label: 'Audit Logs', to: '/audit-logs', icon: ScrollText, permission: 'users.manage' },
      { label: 'Settings', to: '/settings', icon: Settings, permission: 'settings.manage' },
    ],
  },
];
