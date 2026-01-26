'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { usePageHeader } from '@/hooks/use-page-header';
import { objectsApi, stagesApi, resourceChecksApi, paymentsApi, volumeChecksApi } from '@/lib/api';
import { ConstructionObject, Stage, ResourceCheck, PaymentObjectSummary, VolumeCheckObjectSummary } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Calendar, Users, Truck, Pencil, TrendingUp, TrendingDown, Minus, Package, Wallet } from 'lucide-react';
import { StageFormDialog } from '@/components/stages/stage-form-dialog';
import { ObjectFormDialog } from '@/components/objects/object-form-dialog';

type CalendarScale = 'days' | 'weeks' | 'decades' | 'months';

interface CalendarPeriod {
  label: string;
  subLabel?: string;
  dates: Date[];
  isWeekend?: boolean;
  isToday?: boolean;
}

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
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
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

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

function getDecade(date: Date): number {
  const day = date.getDate();
  if (day <= 10) return 1;
  if (day <= 20) return 2;
  return 3;
}

function groupDatesByScale(dates: Date[], scale: CalendarScale): CalendarPeriod[] {
  if (scale === 'days') {
    return dates.map((date) => ({
      label: formatDate(date),
      subLabel: formatDayOfWeek(date),
      dates: [date],
      isWeekend: isWeekend(date),
      isToday: isToday(date),
    }));
  }

  if (scale === 'weeks') {
    const groups = new Map<string, Date[]>();
    dates.forEach((date) => {
      const year = date.getFullYear();
      const week = getWeekNumber(date);
      const key = `${year}-W${week}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(date);
    });
    return Array.from(groups.entries()).map(([key, groupDates]) => ({
      label: `Нед ${key.split('-W')[1]}`,
      subLabel: `${formatDate(groupDates[0])}-${formatDate(groupDates[groupDates.length - 1])}`,
      dates: groupDates,
      isToday: groupDates.some(isToday),
    }));
  }

  if (scale === 'decades') {
    const groups = new Map<string, Date[]>();
    dates.forEach((date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const decade = getDecade(date);
      const key = `${year}-${month}-D${decade}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(date);
    });
    return Array.from(groups.entries()).map(([key, groupDates]) => {
      const decade = key.split('-D')[1];
      const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
      const month = groupDates[0].getMonth();
      return {
        label: `${decade} дек`,
        subLabel: monthNames[month],
        dates: groupDates,
        isToday: groupDates.some(isToday),
      };
    });
  }

  // months
  const groups = new Map<string, Date[]>();
  dates.forEach((date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${month}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(date);
  });
  return Array.from(groups.entries()).map(([, groupDates]) => {
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const month = groupDates[0].getMonth();
    return {
      label: monthNames[month],
      subLabel: `${groupDates[0].getFullYear()}`,
      dates: groupDates,
      isToday: groupDates.some(isToday),
    };
  });
}

function isPeriodInRange(period: CalendarPeriod, start?: string, end?: string): boolean {
  return period.dates.some((date) => isInRange(date, start, end));
}

export default function ObjectDetailPage() {
  const { id } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [object, setObject] = useState<ConstructionObject | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [resourceChecks, setResourceChecks] = useState<ResourceCheck[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentObjectSummary | null>(null);
  const [volumeSummary, setVolumeSummary] = useState<VolumeCheckObjectSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [isObjectDialogOpen, setIsObjectDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [calendarScale, setCalendarScale] = useState<CalendarScale>('days');

  // Календарь: начало месяца и 62 дня (2 месяца для лучшего обзора)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const dates = generateDates(startOfMonth, 62);
  const periods = groupDatesByScale(dates, calendarScale);

  const loadData = useCallback(() => {
    if (user && id) {
      setIsLoading(true);

      // Вычисляем диапазон дат для загрузки проверок
      const startDate = new Date();
      startDate.setDate(1);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 62);

      Promise.all([
        objectsApi.getOne(id as string),
        stagesApi.getByObject(id as string),
        resourceChecksApi.getByDateRange(
          id as string,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        ),
        paymentsApi.getSummaryByObject(id as string).catch(() => null),
        volumeChecksApi.getSummaryByObject(id as string).catch(() => null),
      ])
        .then(([obj, stg, checks, paySummary, volSummary]) => {
          setObject(obj);
          setStages(stg);
          setResourceChecks(checks);
          setPaymentSummary(paySummary);
          setVolumeSummary(volSummary);
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

  const canEdit = user ? ['MINISTER', 'TECHNADZOR', 'SUPERADMIN'].includes(user.role) : false;

  usePageHeader({
    title: 'График работ - Календарный план',
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 bg-background">
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-gray-500">Загрузка...</div>
        </main>
      </div>
    );
  }

  if (!object) {
    return (
      <div className="flex-1 bg-background">
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-gray-500">Объект не найден</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 bg-background">
      <main className="w-full px-4 py-6">
        {/* Навигация */}
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
          <Link
            href="/objects"
            className="inline-flex items-center hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Объекты
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">{object.name}</span>
          <span className="text-gray-300 mx-1">•</span>
          <span>{object.address || 'Адрес не указан'}</span>
          {canEdit && (
            <>
              <span className="text-gray-300 mx-1">•</span>
              <button
                onClick={() => setIsObjectDialogOpen(true)}
                className="inline-flex items-center text-primary hover:underline"
              >
                <Pencil className="w-3 h-3 mr-1" />
                Редактировать
              </button>
            </>
          )}
        </div>

        {/* Таблица-календарь */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Кнопки масштаба и статистика */}
          <div className="flex items-center justify-between gap-4 px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Масштаб:</span>
              <div className="flex gap-1">
                {[
                  { value: 'days', label: 'По дням' },
                  { value: 'weeks', label: 'По неделям' },
                  { value: 'decades', label: 'По декадам' },
                  { value: 'months', label: 'По месяцам' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setCalendarScale(option.value as CalendarScale)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      calendarScale === option.value
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Статистика */}
            {(() => {
              const totalProgress = stages.length > 0
                ? Math.round(stages.reduce((sum, s) => sum + (s.volumeChecks?.[0]?.percent || 0), 0) / stages.length)
                : 0;
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
              const completedStages = stages.filter((s) => (s.volumeChecks?.[0]?.percent || 0) >= 100).length;
              const financialPercent = paymentSummary?.percentPaid || 0;

              return (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">Прогресс:</span>
                    <span className="font-semibold text-primary">{totalProgress}%</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">Завершено:</span>
                    <span className="font-semibold text-gray-700">{completedStages}/{stages.length}</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">Отклонение:</span>
                    <span className={`font-semibold flex items-center gap-1 ${
                      deviation > 0 ? 'text-green-600' : deviation < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {deviation > 0 ? <TrendingUp className="w-4 h-4" /> : deviation < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                      {deviation > 0 ? '+' : ''}{deviation}%
                    </span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">Освоено:</span>
                    <span className={`font-semibold ${
                      financialPercent >= 80 ? 'text-green-600' : financialPercent >= 50 ? 'text-primary' : 'text-gray-700'
                    }`}>
                      {financialPercent}%
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1200px]">
              <thead>
                {/* Заголовок с датами */}
                <tr className="bg-primary text-primary-foreground">
                  <th className="sticky left-0 bg-primary z-10 px-4 py-2 text-left text-sm font-semibold min-w-[300px] border-r border-white/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Этап работ
                      </div>
                      {canEdit && (
                        <button
                          className="flex items-center gap-1 text-xs font-medium text-white/90 hover:text-white transition-colors"
                          onClick={handleAddStage}
                        >
                          <Plus className="w-4 h-4" />
                          Добавить
                        </button>
                      )}
                    </div>
                  </th>
                  {periods.map((period, i) => (
                    <th
                      key={i}
                      className={`px-1 py-2 text-center border-r border-white/20 ${
                        calendarScale === 'days' ? 'min-w-[90px]' : 'min-w-[100px]'
                      } ${period.isWeekend ? 'bg-black/10' : ''} ${
                        period.isToday ? 'bg-white/20' : ''
                      }`}
                    >
                      <div className="text-xs font-semibold">
                        {period.label}
                      </div>
                      {period.subLabel && calendarScale === 'days' && (
                        <div className="text-[10px] opacity-75">
                          {period.subLabel}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stages.length === 0 ? (
                  <tr>
                    <td colSpan={1 + periods.length} className="px-4 py-8 text-center text-gray-500">
                      Этапы работ не добавлены
                    </td>
                  </tr>
                ) : (
                  stages.map((stage, stageIndex) => {
                    const lastVolumeCheck = stage.volumeChecks?.[0];
                    const progress = lastVolumeCheck?.percent || 0;
                    const stageBudget = (stage as any).budget;

                    // Вычисляем индексы начала и конца периода этапа
                    const startIdx = periods.findIndex(p => isPeriodInRange(p, stage.startDate, stage.endDate));
                    const endIdx = periods.reduce((last, p, i) => isPeriodInRange(p, stage.startDate, stage.endDate) ? i : last, -1);
                    const spanCount = startIdx >= 0 && endIdx >= 0 ? endIdx - startIdx + 1 : 0;

                    return (
                      <React.Fragment key={stage.id}>
                        {/* Строка с прогресс-баром */}
                        <tr className="border-b border-gray-100">
                          {/* Название этапа */}
                          <td rowSpan={2} className="sticky left-0 bg-white z-10 px-4 py-3 border-r align-top">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0 mr-2">
                                <div className="font-medium text-gray-900">
                                  {stageIndex + 1}. {stage.name}
                                </div>
                                {stageBudget && (
                                  <div className="text-xs text-gray-500">
                                    {Number(stageBudget).toLocaleString('ru-RU')} ₽
                                  </div>
                                )}
                                {/* Бейджи Объём и Финансы */}
                                <div className="mt-2 flex gap-2 text-xs">
                                  {(() => {
                                    const volStage = volumeSummary?.stages.find(s => s.stageId === stage.id);
                                    const payStage = paymentSummary?.stages.find(s => s.stageId === stage.id);
                                    const volPercent = volStage?.percent || 0;
                                    const payPercent = payStage?.percentPaid || 0;
                                    return (
                                      <>
                                        <div className={`flex items-center gap-1 cursor-pointer hover:opacity-70 ${
                                          volPercent >= 100 ? 'text-green-600' : volPercent >= 50 ? 'text-yellow-600' : 'text-gray-500'
                                        }`}>
                                          <Package className="w-3.5 h-3.5" />
                                          <span>{volPercent}%</span>
                                          <span className="text-gray-400">({volStage?.checksCount || 0})</span>
                                        </div>
                                        <div className={`flex items-center gap-1 cursor-pointer hover:opacity-70 ${
                                          payPercent >= 100 ? 'text-green-600' : payPercent >= 50 ? 'text-primary' : 'text-gray-500'
                                        }`}>
                                          <Wallet className="w-3.5 h-3.5" />
                                          <span>{payPercent}%</span>
                                          <span className="text-gray-400">({payStage?.paymentsCount || 0})</span>
                                        </div>
                                      </>
                                    );
                                  })()}
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
                          {/* Ячейки прогресс-бара */}
                          {periods.map((period, i) => {
                            const isStart = i === startIdx;
                            const inRange = i >= startIdx && i <= endIdx && startIdx >= 0;

                            // Пропускаем ячейки внутри span (кроме первой)
                            if (inRange && !isStart) return null;

                            if (isStart && spanCount > 0) {
                              return (
                                <td
                                  key={i}
                                  colSpan={spanCount}
                                  className="px-1 py-1 align-middle"
                                >
                                  <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        progress >= 80
                                          ? 'bg-gradient-to-r from-green-400 to-green-500'
                                          : progress >= 50
                                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                                          : progress >= 20
                                          ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                                          : 'bg-gradient-to-r from-red-400 to-red-500'
                                      }`}
                                      style={{ width: `${Math.max(progress, 0)}%` }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className={`text-xs font-bold ${progress >= 45 ? 'text-white' : 'text-gray-700'}`}>
                                        {progress}%
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              );
                            }

                            // Пустые ячейки вне диапазона
                            return (
                              <td
                                key={i}
                                className={`px-0.5 py-1 ${
                                  period.isWeekend ? 'bg-gray-50' : ''
                                } ${period.isToday ? 'bg-blue-50' : ''}`}
                              />
                            );
                          })}
                        </tr>
                        {/* Строка с данными ресурсов */}
                        <tr className="border-b hover:bg-gray-50">
                          {/* Ячейки календаря с ресурсами */}
                          {periods.map((period, i) => {
                            const inRange = isPeriodInRange(period, stage.startDate, stage.endDate);
                            const plannedPeople = stage.plannedPeople || 0;
                            const plannedEquipment = stage.plannedEquipment?.reduce((sum, eq) => sum + eq.quantity, 0) || 0;

                            // Ищем проверки для этого этапа в данном периоде
                            const periodChecks = resourceChecks.filter(
                              (check) =>
                                check.stageId === stage.id &&
                                period.dates.some(
                                  (d) => d.toISOString().split('T')[0] === check.date.split('T')[0]
                                )
                            );

                            // Суммируем факт по всем проверкам в периоде
                            let actualPeople: number | null = null;
                            let actualEquipment: number | null = null;

                            if (periodChecks.length > 0) {
                              const totalPeople = periodChecks.reduce(
                                (sum, c) => sum + (c.actualPeople || 0),
                                0
                              );
                              actualPeople = Math.round(totalPeople / periodChecks.length);

                              const totalEquipment = periodChecks.reduce(
                                (sum, c) =>
                                  sum +
                                  c.equipmentChecks.reduce((eq, e) => eq + e.quantity, 0),
                                0
                              );
                              actualEquipment = Math.round(totalEquipment / periodChecks.length);
                            }

                            // Определяем статус
                            const hasData = actualPeople !== null;
                            const peopleOk = actualPeople !== null && actualPeople >= plannedPeople;
                            const equipmentOk = actualEquipment !== null && actualEquipment >= plannedEquipment;

                            return (
                              <td
                                key={i}
                                className={`px-0.5 py-1 text-left align-top ${
                                  period.isWeekend ? 'bg-gray-50' : ''
                                } ${period.isToday ? 'bg-blue-50' : ''}`}
                              >
                                {inRange && (
                                  <div className="text-[11px] space-y-0.5 px-1">
                                    <div className={`flex items-center gap-1 whitespace-nowrap ${
                                      !hasData ? 'text-gray-400' : peopleOk ? 'text-green-600' : 'text-orange-500'
                                    }`}>
                                      <Users className="w-3 h-3 flex-shrink-0" />
                                      <span>Люди:</span>
                                      <span className="font-semibold">
                                        {actualPeople ?? '–'}/{plannedPeople || '–'}
                                      </span>
                                    </div>
                                    <div className={`flex items-center gap-1 whitespace-nowrap ${
                                      !hasData ? 'text-gray-400' : equipmentOk ? 'text-green-600' : 'text-orange-500'
                                    }`}>
                                      <Truck className="w-3 h-3 flex-shrink-0" />
                                      <span>Техн.:</span>
                                      <span className="font-semibold">
                                        {actualEquipment ?? '–'}/{plannedEquipment || '–'}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
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
