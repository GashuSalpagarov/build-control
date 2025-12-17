'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Header } from '@/components/layout/header';
import { objectsApi, stagesApi } from '@/lib/api';
import { ConstructionObject, Stage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Calendar, Users, Truck, Pencil, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { StageFormDialog } from '@/components/stages/stage-form-dialog';
import { ObjectFormDialog } from '@/components/objects/object-form-dialog';

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
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [isObjectDialogOpen, setIsObjectDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);

  // Календарь: начало месяца и 31 день
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const dates = generateDates(startOfMonth, 31);

  const loadData = useCallback(() => {
    if (user && id) {
      setIsLoading(true);
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddStage = () => {
    setEditingStage(null);
    setIsStageDialogOpen(true);
  };

  const handleEditStage = (stage: Stage) => {
    setEditingStage(stage);
    setIsStageDialogOpen(true);
  };

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
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{object.name}</h2>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsObjectDialogOpen(true)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-gray-500">{object.address || 'Адрес не указан'}</p>
            </div>
            {canEdit && (
              <Button onClick={handleAddStage}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить этап
              </Button>
            )}
          </div>
        </div>

        {/* Карточки статистики */}
        {(() => {
          // Расчёт прогресса и отставания
          const totalProgress = stages.length > 0
            ? Math.round(stages.reduce((sum, s) => sum + (s.volumeChecks?.[0]?.percent || 0), 0) / stages.length)
            : 0;

          // Расчёт планового прогресса на основе дат
          const today = new Date();
          let plannedProgress = 0;
          if (stages.length > 0) {
            const stageProgressList = stages.map((s) => {
              if (!s.startDate || !s.endDate) return 0;
              const start = new Date(s.startDate);
              const end = new Date(s.endDate);
              if (today < start) return 0;
              if (today > end) return 100;
              const total = end.getTime() - start.getTime();
              const elapsed = today.getTime() - start.getTime();
              return Math.round((elapsed / total) * 100);
            });
            plannedProgress = Math.round(stageProgressList.reduce((a, b) => a + b, 0) / stages.length);
          }

          const deviation = totalProgress - plannedProgress;

          return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="text-sm text-gray-500 mb-1">Общий прогресс</div>
                <div className="text-3xl font-bold text-indigo-600">{totalProgress}%</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="text-sm text-gray-500 mb-1">План на сегодня</div>
                <div className="text-3xl font-bold text-gray-700">{plannedProgress}%</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="text-sm text-gray-500 mb-1">Отклонение</div>
                <div className={`text-3xl font-bold flex items-center gap-2 ${
                  deviation > 0 ? 'text-green-600' : deviation < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {deviation > 0 ? <TrendingUp className="w-6 h-6" /> : deviation < 0 ? <TrendingDown className="w-6 h-6" /> : <Minus className="w-6 h-6" />}
                  {deviation > 0 ? '+' : ''}{deviation}%
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="text-sm text-gray-500 mb-1">Статус</div>
                <Badge className={`text-base px-3 py-1 ${
                  deviation >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {deviation >= 0 ? 'Успеваем' : 'Отстаём'}
                </Badge>
              </div>
            </div>
          );
        })()}

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
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">
                                {stage.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                Выполнено: {progress}%
                              </div>
                            </div>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditStage(stage)}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            )}
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

      {/* Диалог добавления/редактирования этапа */}
      <StageFormDialog
        open={isStageDialogOpen}
        onOpenChange={setIsStageDialogOpen}
        objectId={id as string}
        stage={editingStage}
        onSuccess={loadData}
      />

      {/* Диалог редактирования объекта */}
      <ObjectFormDialog
        open={isObjectDialogOpen}
        onOpenChange={setIsObjectDialogOpen}
        object={object}
        onSuccess={loadData}
      />
    </div>
  );
}
