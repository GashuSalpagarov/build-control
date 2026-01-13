'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const canManageUsers = user && ['MINISTER', 'SUPERADMIN'].includes(user.role);
  const canManageContractors = user && ['MINISTER', 'TECHNADZOR', 'SUPERADMIN'].includes(user.role);
  const canInspect = user && ['INSPECTOR', 'TECHNADZOR', 'MINISTER', 'SUPERADMIN'].includes(user.role);
  const canManagePayments = user && ['ACCOUNTANT', 'MINISTER', 'SUPERADMIN'].includes(user.role);
  const canCheckVolumes = user && ['TECHNADZOR', 'MINISTER', 'SUPERADMIN'].includes(user.role);
  const canViewAppeals = user && ['CONTRACTOR', 'INSPECTOR', 'TECHNADZOR', 'ACCOUNTANT', 'MINISTER', 'GOVERNMENT', 'SUPERADMIN'].includes(user.role);
  const canViewDashboard = user && ['MINISTER', 'GOVERNMENT', 'SUPERADMIN'].includes(user.role);

  const navItems = [
    { href: '/dashboard', label: 'Дашборд', show: canViewDashboard },
    { href: '/objects', label: 'Объекты', show: true },
    { href: '/inspector', label: 'Проверки', show: canInspect },
    { href: '/volumes', label: 'Объёмы', show: canCheckVolumes },
    { href: '/accountant', label: 'Платежи', show: canManagePayments },
    { href: '/appeals', label: 'Обращения', show: canViewAppeals },
    { href: '/contractors', label: 'Подрядчики', show: canManageContractors },
    { href: '/users', label: 'Пользователи', show: canManageUsers },
    { href: '/equipment-types', label: 'Техника', show: canManageContractors },
  ];

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 min-h-16 flex items-center">
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Министерство строительства КЧР</h1>
            <p className="text-muted-foreground text-sm">Контроль строительства</p>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="text-sm">{user.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выйти
              </Button>
            </div>
          )}
        </div>
      </div>
      {user && (
        <nav className="border-t border-border">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-6">
              {navItems.filter(item => item.show).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'py-3 text-sm font-medium transition-colors border-b-2',
                    pathname.startsWith(item.href)
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
