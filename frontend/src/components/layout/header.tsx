'use client';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();

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
    </header>
  );
}
