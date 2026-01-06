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

  const navItems = [
    { href: '/objects', label: 'Объекты', show: true },
    { href: '/inspector', label: 'Проверки', show: canInspect },
    { href: '/contractors', label: 'Подрядчики', show: canManageContractors },
    { href: '/users', label: 'Пользователи', show: canManageUsers },
    { href: '/equipment-types', label: 'Техника', show: canManageContractors },
  ];

  return (
    <header className="bg-indigo-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Министерство строительства КЧР</h1>
            <p className="text-indigo-200 text-sm">Система контроля строительства</p>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-indigo-200">
                <User className="w-4 h-4" />
                <span className="text-sm">{user.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-white hover:bg-indigo-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выйти
              </Button>
            </div>
          )}
        </div>
      </div>
      {user && (
        <nav className="bg-indigo-700">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1">
              {navItems.filter(item => item.show).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-colors',
                    pathname.startsWith(item.href)
                      ? 'bg-indigo-800 text-white'
                      : 'text-indigo-200 hover:bg-indigo-600 hover:text-white'
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
