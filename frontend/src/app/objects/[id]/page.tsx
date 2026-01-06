'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Header } from '@/components/layout/header';
import { objectsApi, stagesApi, resourceChecksApi, paymentsApi, volumeChecksApi } from '@/lib/api';
import { ConstructionObject, Stage, ResourceCheck, PaymentObjectSummary, VolumeCheckObjectSummary } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Calendar, Users, Truck, Pencil, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

          // Подсчёт завершённых этапов (прогресс >= 100%)
          const completedStages = stages.filter((s) => (s.volumeChecks?.[0]?.percent || 0) >= 100).length;

          // Освоено средств из paymentSummary
          const financialPercent = paymentSummary?.percentPaid || 0;

          return (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="text-sm text-gray-500 mb-1">Общий прогресс</div>
                <div className="text-3xl font-bold text-indigo-600">{totalProgress}%</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="text-sm text-gray-500 mb-1">Завершено этапов</div>
                <div className="text-3xl font-bold text-gray-700">
                  {completedStages}/{stages.length}
                </div>
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
                <div className="text-sm text-gray-500 mb-1">Освоено средств</div>
                <div className={`text-3xl font-bold ${
                  financialPercent >= 80 ? 'text-green-600' : financialPercent >= 50 ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {financialPercent}%
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="text-sm text-gray-500 mb-1">Статус</div>
                <Badge className={`text-base px-3 py-1 ${
                  deviation >= 0 ? 'bg-[#4CAF50] text-white' : deviation >= -10 ? 'bg-[#FF9800] text-white' : 'bg-[#F44336] text-white'
                }`}>
                  {deviation >= 0 ? (deviation > 0 ? `Опережаем: +${deviation}%` : 'Успеваем') : deviation >= -10 ? `Отстаём: ${deviation}%` : `Не успеваем: ${deviation}%`}
                </Badge>
              </div>
            </div>
          );
        })()}

        {/* Таблица-календарь */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Кнопки масштаба */}
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50">
            <span className="text-sm text-gray-500 mr-2">Масштаб:</span>
            <div className="flex rounded-lg border bg-white overflow-hidden">
              {[
                { value: 'days', label: 'По дням' },
                { value: 'weeks', label: 'По неделям' },
                { value: 'decades', label: 'По декадам' },
                { value: 'months', label: 'По месяцам' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setCalendarScale(option.value as CalendarScale)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    calendarScale === option.value
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
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
                  {periods.map((period, i) => (
                    <th
                      key={i}
                      className={`px-1 py-2 text-center ${
                        calendarScale === 'days' ? 'min-w-[40px]' : 'min-w-[60px]'
                      } ${period.isWeekend ? 'bg-gray-100' : ''} ${
                        period.isToday ? 'bg-indigo-100' : ''
                      }`}
                    >
                      {period.subLabel && (
                        <div className="text-xs font-medium text-gray-500">
                          {period.subLabel}
                        </div>
                      )}
                      <div
                        className={`text-sm font-semibold ${
                          period.isToday ? 'text-indigo-600' : 'text-gray-700'
                        }`}
                      >
                        {period.label}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stages.length === 0 ? (
                  <tr>
                    <td colSpan={3 + periods.length} className="px-4 py-8 text-center text-gray-500">
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
                            <div className="flex-1 min-w-0 mr-2">
                              <div className="font-medium text-gray-900">
                                {stage.name}
                              </div>
                              {/* Прогресс-бар с процентом внутри */}
                              <div className="mt-1 relative h-5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    progress >= 80
                                      ? 'bg-gradient-to-r from-green-400 to-green-500'
                                      : progress >= 50
                                      ? 'bg-gradient-to-r from-yellow-400 to-orange-400'
                                      : progress >= 20
                                      ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                                      : 'bg-gradient-to-r from-red-400 to-red-500'
                                  }`}
                                  style={{ width: `${Math.max(progress, 0)}%` }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className={`text-xs font-semibold ${progress >= 50 ? 'text-white' : 'text-gray-700'}`}>
                                    {progress}%
                                  </span>
                                </div>
                              </div>
                              {/* Бейджи Объём и Финансы */}
                              <div className="mt-1 flex gap-1 flex-wrap">
                                {(() => {
                                  const volStage = volumeSummary?.stages.find(s => s.stageId === stage.id);
                                  const payStage = paymentSummary?.stages.find(s => s.stageId === stage.id);
                                  return (
                                    <>
                                      {volStage && (
                                        <Badge className={`text-[10px] px-1.5 py-0 ${
                                          volStage.percent >= 100
                                            ? 'bg-green-100 text-green-700'
                                            : volStage.percent >= 50
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                          Объём: {volStage.percent}%
                                        </Badge>
                                      )}
                                      {payStage && (
                                        <Badge className={`text-[10px] px-1.5 py-0 ${
                                          payStage.percentPaid >= 100
                                            ? 'bg-green-100 text-green-700'
                                            : payStage.percentPaid >= 50
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-gray-100 text-gray-700'
                                        }`}>
                                          Финансы: {payStage.percentPaid}%
                                        </Badge>
                                      )}
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
                        {/* План/факт людей */}
                        {(() => {
                          const stageChecks = resourceChecks.filter((c) => c.stageId === stage.id);
                          const plannedPeople = stage.plannedPeople || 0;
                          const avgPeople = stageChecks.length > 0
                            ? Math.round(stageChecks.reduce((sum, c) => sum + (c.actualPeople || 0), 0) / stageChecks.length)
                            : null;

                          return (
                            <td className="px-2 py-2 text-center border-r">
                              <div className="text-xs">
                                <span className="text-gray-400">план:</span>{' '}
                                <span className="font-medium">{plannedPeople || '—'}</span>
                              </div>
                              <div className={`text-xs ${avgPeople === null ? 'text-gray-400' : avgPeople >= plannedPeople ? 'text-green-600' : 'text-red-600'}`}>
                                <span className="text-gray-400">факт:</span>{' '}
                                <span className="font-medium">{avgPeople ?? '—'}</span>
                              </div>
                            </td>
                          );
                        })()}
                        {/* План/факт техники */}
                        {(() => {
                          const stageChecks = resourceChecks.filter((c) => c.stageId === stage.id);
                          const plannedEquipment = stage.plannedEquipment?.reduce((sum, eq) => sum + eq.quantity, 0) || 0;
                          const avgEquipment = stageChecks.length > 0
                            ? Math.round(
                                stageChecks.reduce(
                                  (sum, c) => sum + c.equipmentChecks.reduce((eq, e) => eq + e.quantity, 0),
                                  0
                                ) / stageChecks.length
                              )
                            : null;

                          return (
                            <td className="px-2 py-2 text-center border-r">
                              <div className="text-xs">
                                <span className="text-gray-400">план:</span>{' '}
                                <span className="font-medium">{plannedEquipment || '—'}</span>
                              </div>
                              <div className={`text-xs ${avgEquipment === null ? 'text-gray-400' : avgEquipment >= plannedEquipment ? 'text-green-600' : 'text-red-600'}`}>
                                <span className="text-gray-400">факт:</span>{' '}
                                <span className="font-medium">{avgEquipment ?? '—'}</span>
                              </div>
                            </td>
                          );
                        })()}
                        {/* Ячейки календаря */}
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
                            // Берём среднее или последнее значение
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

                          return (
                            <td
                              key={i}
                              className={`px-1 py-1 text-center align-top ${
                                period.isWeekend ? 'bg-gray-50' : ''
                              } ${period.isToday ? 'bg-indigo-50' : ''}`}
                            >
                              {inRange && (
                                <div className="min-h-[50px] bg-indigo-100 rounded-sm p-1 border border-indigo-200">
                                  <div className="text-[10px] leading-tight">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Л:</span>
                                      <span className={actualPeople === null ? 'text-gray-400' : actualPeople >= plannedPeople ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                        {actualPeople ?? '—'}/{plannedPeople}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Т:</span>
                                      <span className={actualEquipment === null ? 'text-gray-400' : actualEquipment >= plannedEquipment ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                        {actualEquipment ?? '—'}/{plannedEquipment}
                                      </span>
                                    </div>
                                  </div>
                                </div>
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
