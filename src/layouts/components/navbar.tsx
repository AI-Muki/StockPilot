import { useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut,
  User as UserIcon,
  Settings,
  ChevronDown,
  Menu,
  Search,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getRoleDisplayName } from '@/lib/permissions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onOpenMobileNav: () => void;
  sidebarCollapsed: boolean;
}

export function Navbar({ onOpenMobileNav, sidebarCollapsed }: NavbarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = (user?.fullName || user?.email || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const pageTitle = getPageTitle(location.pathname);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md',
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMobileNav}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page title + breadcrumb */}
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold leading-tight">{pageTitle}</h1>
        {user?.organizationName && (
          <p className="hidden text-xs text-muted-foreground sm:block">
            {user.organizationName}
          </p>
        )}
      </div>

      {/* Global search */}
      <div className="ml-auto hidden items-center md:flex">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products, orders, contacts..."
            className="h-9 w-64 rounded-md border border-input bg-muted/50 pl-9 pr-3 text-sm outline-none transition-colors focus:border-ring focus:bg-background lg:w-80"
          />
        </div>
      </div>

      <ThemeToggle />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight">
                {user?.fullName || 'User'}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.role ? getRoleDisplayName(user.role) : 'No role'}
              </p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="space-y-1">
              <p className="text-sm font-medium">{user?.fullName || 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/users')}>
            <UserIcon className="mr-2 h-4 w-4" />
            My account
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              signOut();
              navigate('/login');
            }}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/products': 'Products',
    '/inventory': 'Inventory',
    '/stock-movements': 'Stock Movements',
    '/transfers': 'Transfers',
    '/adjustments': 'Adjustments',
    '/purchase-orders': 'Purchase Orders',
    '/sales-orders': 'Sales Orders',
    '/customers': 'Customers',
    '/suppliers': 'Suppliers',
    '/analytics': 'Analytics',
    '/reports': 'Reports',
    '/ai-assistant': 'AI Assistant',
    '/users': 'Users',
    '/notifications': 'Notifications',
    '/audit-logs': 'Audit Logs',
    '/settings': 'Settings',
  };
  return map[pathname] || 'StockPilot';
}
