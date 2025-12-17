'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Header } from '@/components/layout/header';
import { objectsApi } from '@/lib/api';
import { ConstructionObject } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ObjectFormDialog } from '@/components/objects/object-form-dialog';

function formatCurrency(amount: number | undefined | null): string {
  if (!amount) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusStyle(status: string) {
  if (status === 'PLANNED') {
    return { label: 'Запланировано', className: 'bg-gray-200 text-gray-700' };
  }
  if (status === 'COMPLETED') {
    return { label: 'Завершён', className: 'bg-green-500 text-white' };
  }
  if (status === 'SUSPENDED') {
    return { label: 'Приостановлен', className: 'bg-yellow-500 text-white' };
  }
  return { label: 'В работе', className: 'bg-blue-500 text-white' };
}

export default function ObjectsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadObjects = useCallback(() => {
    if (user) {
      setIsLoading(true);
      objectsApi
        .getAll()
        .then(setObjects)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    loadObjects();
  }, [loadObjects]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  const canCreate = ['MINISTER', 'TECHNADZOR', 'SUPERADMIN'].includes(user.role);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Объекты строительства
            </h2>
            <p className="text-sm text-gray-500">2025 год</p>
          </div>
          {canCreate && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить объект
            </Button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Заголовок таблицы */}
          <div className="grid grid-cols-[50px_1fr_100px_150px_150px] gap-4 px-6 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div>№</div>
            <div>Объект</div>
            <div>Прогресс</div>
            <div>Статус</div>
            <div className="text-right">Бюджет</div>
          </div>

          {/* Список объектов */}
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Загрузка...</div>
          ) : objects.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Объекты не найдены
            </div>
          ) : (
            objects.map((obj, index) => {
              const progress = obj.progress ?? 0;
              const status = getStatusStyle(obj.status);

              return (
                <Link
                  key={obj.id}
                  href={`/objects/${obj.id}`}
                  className="grid grid-cols-[50px_1fr_100px_150px_150px] gap-4 px-6 py-4 border-b last:border-b-0 hover:bg-indigo-50 transition-colors items-center"
                >
                  <div className="text-lg font-bold text-gray-400">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 flex items-center">
                      {obj.name}
                      <ChevronRight className="w-4 h-4 ml-1 text-indigo-500" />
                    </div>
                    <div className="text-sm text-gray-500">{obj.address || '—'}</div>
                  </div>
                  <div className="text-xl font-bold text-indigo-600">
                    {progress}%
                  </div>
                  <div>
                    <Badge className={status.className}>{status.label}</Badge>
                  </div>
                  <div className="text-right font-semibold text-gray-700">
                    {formatCurrency(obj.budget ? Number(obj.budget) : null)}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </main>

      <ObjectFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={loadObjects}
      />
    </div>
  );
}
