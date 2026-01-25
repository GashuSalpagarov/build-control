'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  Scale,
  CreditCard,
  MessageSquare,
  Users,
  Briefcase,
  Wrench,
  LogOut,
  User,
  Settings,
  X,
} from 'lucide-react';

const getRoleLabel = (role: string) => {
  const roleLabels: Record<string, string> = {
    MINISTER: 'Министр',
    GOVERNMENT: 'Правительство',
    ACCOUNTANT: 'Бухгалтер',
    TECHNADZOR: 'Технадзор',
    INSPECTOR: 'Проверяющий',
    CONTRACTOR: 'Подрядчик',
    SUPERADMIN: 'Суперадмин',
  };
  return roleLabels[role] || role;
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();

  if (!user) return null;

  const canManageUsers = ['MINISTER', 'SUPERADMIN'].includes(user.role);
  const canManageContractors = ['MINISTER', 'TECHNADZOR', 'SUPERADMIN'].includes(user.role);
  const canInspect = ['INSPECTOR', 'TECHNADZOR', 'MINISTER', 'SUPERADMIN'].includes(user.role);
  const canManagePayments = ['ACCOUNTANT', 'MINISTER', 'SUPERADMIN'].includes(user.role);
  const canCheckVolumes = ['TECHNADZOR', 'MINISTER', 'SUPERADMIN'].includes(user.role);
  const canViewAppeals = ['CONTRACTOR', 'INSPECTOR', 'TECHNADZOR', 'ACCOUNTANT', 'MINISTER', 'GOVERNMENT', 'SUPERADMIN'].includes(user.role);
  const canViewDashboard = ['MINISTER', 'GOVERNMENT', 'SUPERADMIN'].includes(user.role);

  const navItems = [
    { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard, show: canViewDashboard },
    { href: '/objects', label: 'Объекты', icon: Building2, show: true },
    { href: '/inspector', label: 'Проверки', icon: ClipboardCheck, show: canInspect },
    { href: '/volumes', label: 'Объёмы', icon: Scale, show: canCheckVolumes },
    { href: '/accountant', label: 'Платежи', icon: CreditCard, show: canManagePayments },
    { href: '/appeals', label: 'Обращения', icon: MessageSquare, show: canViewAppeals },
    { href: '/contractors', label: 'Подрядчики', icon: Briefcase, show: canManageContractors },
    { href: '/users', label: 'Пользователи', icon: Users, show: canManageUsers },
    { href: '/equipment-types', label: 'Техника', icon: Wrench, show: canManageContractors },
  ];

  const handleHeaderClick = () => {
    const firstAvailablePage = navItems.find(item => item.show);
    if (firstAvailablePage) {
      router.push(firstAvailablePage.href);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 border-b overflow-hidden">
        <div className="flex items-center gap-2 h-full">
          <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={handleHeaderClick}>
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-base font-bold tracking-tight leading-none text-primary group-data-[collapsible=icon]:hidden">
              <div>Контроль</div>
              <div>строительства</div>
            </h1>
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setOpenMobile(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.filter(item => item.show).map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="default"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  tooltip={user.name}
                >
                  <div className="flex w-4 h-4 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex items-center flex-1 text-left overflow-hidden">
                    <span className="text-sm truncate w-full">{user.name}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={2}
              >
                <DropdownMenuLabel className="px-2 py-1.5">
                  <div className="grid text-left text-sm leading-tight">
                    <span className="font-semibold">{user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <User className="w-4 h-4 mr-2" />
                  Профиль
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Настройки
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOut className="w-4 h-4 mr-2" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
