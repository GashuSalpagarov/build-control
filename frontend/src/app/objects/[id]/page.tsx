'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Header } from '@/components/layout/header';
import { objectsApi, stagesApi } from '@/lib/api';
import { ConstructionObject, Stage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Calendar, Users, Truck } from 'lucide-react';

// Генерируем даты для календаря (текущий месяц)
function generateDates(start: Date, days: number) {
  const dates: Date[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function formatDate(date: Date) {
  return date.toLocaleDateString('ru-RU', { day: 'numeric' });
}

function formatDayOfWeek(date: Date) {
  return date.toLocaleDateString('ru-RU', { weekday: 'short' });
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isToday(date: Date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isInRange(date: Date, start?: string, end?: string) {
  if (!start || !end) return false;
  const d = date.getTime();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return d >= s && d <= e;
}

export default function ObjectDetailPage() {
  const { id } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [object, setObject] = useState<ConstructionObject | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Календарь: начало месяца и 31 день
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const dates = generateDates(startOfMonth, 31);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && id) {
      Promise.all([
        objectsApi.getOne(id as string),
        stagesApi.getByObject(id as string),
      ])
        .then(([obj, stg]) => {
          setObject(obj);
          setStages(stg);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [user, id]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-gray-500">Загрузка...</div>
        </main>
      </div>
    );
  }

  if (!object) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-gray-500">Объект не найден</div>
        </main>
      </div>
    );
  }

  const canEdit = ['MINISTER', 'TECHNADZOR', 'SUPERADMIN'].includes(user.role);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-full mx-auto px-4 py-6">
        {/* Навигация и заголовок */}
        <div className="mb-6">
          <Link
            href="/objects"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            К списку объектов
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{object.name}</h2>
              <p className="text-gray-500">{object.address || 'Адрес не указан'}</p>
            </div>
            {canEdit && (
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Добавить этап
              </Button>
            )}
          </div>
        </div>

        {/* Таблица-календарь */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1200px]">
              <thead>
                {/* Заголовок с датами */}
                <tr className="bg-gray-50 border-b">
                  <th className="sticky left-0 bg-gray-50 z-10 px-4 py-3 text-left text-sm font-semibold text-gray-700 min-w-[200px] border-r">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Этап работ
                    </div>
                  </th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 min-w-[60px] border-r">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-3 h-3" />
                      Люди
                    </div>
                  </th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 min-w-[60px] border-r">
                    <div className="flex items-center justify-center gap-1">
                      <Truck className="w-3 h-3" />
                      Техника
                    </div>
                  </th>
                  {dates.map((date, i) => (
                    <th
                      key={i}
                      className={`px-1 py-2 text-center min-w-[40px] ${
                        isWeekend(date) ? 'bg-gray-100' : ''
                      } ${isToday(date) ? 'bg-indigo-100' : ''}`}
                    >
                      <div className="text-xs font-medium text-gray-500">
                        {formatDayOfWeek(date)}
                      </div>
                      <div
                        className={`text-sm font-semibold ${
                          isToday(date) ? 'text-indigo-600' : 'text-gray-700'
                        }`}
                      >
                        {formatDate(date)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stages.length === 0 ? (
                  <tr>
                    <td colSpan={3 + dates.length} className="px-4 py-8 text-center text-gray-500">
                      Этапы работ не добавлены
                    </td>
                  </tr>
                ) : (
                  stages.map((stage) => {
                    const lastVolumeCheck = stage.volumeChecks?.[0];
                    const progress = lastVolumeCheck?.percent || 0;

                    return (
                      <tr key={stage.id} className="border-b hover:bg-gray-50">
                        {/* Название этапа */}
                        <td className="sticky left-0 bg-white z-10 px-4 py-3 border-r">
                          <div className="font-medium text-gray-900">
                            {stage.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Выполнено: {progress}%
                          </div>
                        </td>
                        {/* План/факт людей */}
                        <td className="px-2 py-2 text-center border-r">
                          <div className="text-xs">
                            <span className="text-gray-400">план:</span>{' '}
                            <span className="font-medium">{stage.plannedPeople || '—'}</span>
                          </div>
                          <div className="text-xs text-green-600">
                            <span className="text-gray-400">факт:</span>{' '}
                            <span className="font-medium">—</span>
                          </div>
                        </td>
                        {/* План/факт техники */}
                        <td className="px-2 py-2 text-center border-r">
                          <div className="text-xs">
                            <span className="text-gray-400">план:</span>{' '}
                            <span className="font-medium">
                              {stage.plannedEquipment?.reduce((sum, eq) => sum + eq.quantity, 0) || '—'}
                            </span>
                          </div>
                          <div className="text-xs text-green-600">
                            <span className="text-gray-400">факт:</span>{' '}
                            <span className="font-medium">—</span>
                          </div>
                        </td>
                        {/* Ячейки календаря */}
                        {dates.map((date, i) => {
                          const inRange = isInRange(date, stage.startDate, stage.endDate);
                          return (
                            <td
                              key={i}
                              className={`px-1 py-2 text-center ${
                                isWeekend(date) ? 'bg-gray-50' : ''
                              } ${isToday(date) ? 'bg-indigo-50' : ''}`}
                            >
                              {inRange && (
                                <div className="w-full h-6 bg-indigo-500 rounded-sm" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Легенда */}
        <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-indigo-500 rounded-sm" />
            <span>Период работ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-indigo-100 rounded-sm border" />
            <span>Сегодня</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 rounded-sm border" />
            <span>Выходные</span>
          </div>
        </div>
      </main>
    </div>
  );
}
