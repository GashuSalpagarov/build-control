'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { usePageHeader } from '@/hooks/use-page-header';
import { objectsApi, stagesApi, resourceChecksApi, paymentsApi, volumeChecksApi } from '@/lib/api';
import { ConstructionObject, Stage, ResourceCheck, PaymentObjectSummary, VolumeCheckObjectSummary } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Calendar, Users, Truck, Pencil, Package, Wallet, Maximize2, Minimize2, ZoomIn, ZoomOut, ChevronDown, ChevronUp } from 'lucide-react';
import { StageFormDialog } from '@/components/stages/stage-form-dialog';
import { ObjectFormDialog } from '@/components/objects/object-form-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type CalendarScale = 'days' | 'weeks' | 'decades' | 'months';
type CalendarZoom = 50 | 75 | 100 | 125 | 150;

const zoomLevels: CalendarZoom[] = [50, 75, 100, 125, 150];

const zoomConfig: Record<CalendarZoom, {
  columnWidth: string;
  columnWidthLarge: string;
  headerText: string;
  subText: string;
  cellText: string;
  iconSize: string;
  progressHeight: string;
  progressText: string;
}> = {
  50: {
    columnWidth: 'min-w-[45px]',
    columnWidthLarge: 'min-w-[50px]',
    headerText: 'text-[8px]',
    subText: 'text-[6px]',
    cellText: 'text-[7px]',
    iconSize: 'w-2 h-2',
    progressHeight: 'h-3',
    progressText: 'text-[8px]',
  },
  75: {
    columnWidth: 'min-w-[68px]',
    columnWidthLarge: 'min-w-[75px]',
    headerText: 'text-[10px]',
    subText: 'text-[8px]',
    cellText: 'text-[9px]',
    iconSize: 'w-2.5 h-2.5',
    progressHeight: 'h-4',
    progressText: 'text-[10px]',
  },
  100: {
    columnWidth: 'min-w-[90px]',
    columnWidthLarge: 'min-w-[100px]',
    headerText: 'text-xs',
    subText: 'text-[10px]',
    cellText: 'text-[11px]',
    iconSize: 'w-3 h-3',
    progressHeight: 'h-6',
    progressText: 'text-xs',
  },
  125: {
    columnWidth: 'min-w-[113px]',
    columnWidthLarge: 'min-w-[125px]',
    headerText: 'text-sm',
    subText: 'text-xs',
    cellText: 'text-sm',
    iconSize: 'w-4 h-4',
    progressHeight: 'h-7',
    progressText: 'text-sm',
  },
  150: {
    columnWidth: 'min-w-[135px]',
    columnWidthLarge: 'min-w-[150px]',
    headerText: 'text-base',
    subText: 'text-sm',
    cellText: 'text-base',
    iconSize: 'w-[18px] h-[18px]',
    progressHeight: 'h-9',
    progressText: 'text-base',
  },
};

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

// Get all extensions (where newEndDate > oldEndDate) for visualization
function getAllExtensions(stage: Stage) {
  if (!stage.scheduleChanges?.length) return [];

  // Sort by createdAt ascending (oldest first)
  const sortedChanges = [...stage.scheduleChanges].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Filter only extensions (newEndDate > oldEndDate)
  return sortedChanges.filter(change => {
    if (change.oldEndDate && change.newEndDate) {
      return new Date(change.newEndDate) > new Date(change.oldEndDate);
    }
    return false;
  });
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
  const [calendarZoom, setCalendarZoom] = useState<CalendarZoom>(100);
  const zoom = zoomConfig[calendarZoom];
  const [volumeModalStage, setVolumeModalStage] = useState<Stage | null>(null);
  const [paymentModalStage, setPaymentModalStage] = useState<Stage | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedEquipment, setExpandedEquipment] = useState<Set<string>>(new Set());
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const periodHeaderRefs = useRef<Map<number, HTMLTableCellElement>>(new Map());
  const dragState = useRef({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
  });

  // Календарь: от startDate до endDate объекта
  const calendarDates = useMemo(() => {
    if (!object?.startDate || !object?.endDate) {
      // Fallback: текущий месяц + 2 месяца
      const start = new Date();
      start.setDate(1);
      return generateDates(start, 62);
    }
    const start = new Date(object.startDate);
    const end = new Date(object.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    return generateDates(start, days);
  }, [object?.startDate, object?.endDate]);

  const periods = useMemo(() => groupDatesByScale(calendarDates, calendarScale), [calendarDates, calendarScale]);

  const loadData = useCallback(async () => {
    if (user && id) {
      setIsLoading(true);
      try {
        // Сначала загружаем объект, чтобы узнать его даты
        const [obj, stg, paySummary, volSummary] = await Promise.all([
          objectsApi.getOne(id as string),
          stagesApi.getByObject(id as string),
          paymentsApi.getSummaryByObject(id as string).catch(() => null),
          volumeChecksApi.getSummaryByObject(id as string).catch(() => null),
        ]);

        setObject(obj);
        setStages(stg);
        setPaymentSummary(paySummary);
        setVolumeSummary(volSummary);

        // Загружаем проверки ресурсов по датам объекта
        if (obj.startDate && obj.endDate) {
          const checks = await resourceChecksApi.getByDateRange(
            id as string,
            obj.startDate.split('T')[0],
            obj.endDate.split('T')[0]
          );
          setResourceChecks(checks);
        } else {
          setResourceChecks([]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
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

  // Скролл к сегодняшней дате после загрузки
  useEffect(() => {
    if (!isLoading && tableContainerRef.current) {
      const todayCell = tableContainerRef.current.querySelector('[data-today="true"]');
      if (todayCell) {
        const container = tableContainerRef.current;
        const cellRect = todayCell.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const scrollLeft = cellRect.left - containerRect.left + container.scrollLeft - containerRect.width / 2 + cellRect.width / 2;
        container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
      }
    }
  }, [isLoading, calendarScale]);

  // Выход из fullscreen по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Drag-to-scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tableContainerRef.current) return;
    dragState.current.isDragging = true;
    dragState.current.startX = e.pageX - tableContainerRef.current.offsetLeft;
    dragState.current.scrollLeft = tableContainerRef.current.scrollLeft;
    tableContainerRef.current.style.cursor = 'grabbing';
    tableContainerRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.isDragging || !tableContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableContainerRef.current.offsetLeft;
    const walk = (x - dragState.current.startX) * 2;
    tableContainerRef.current.scrollLeft = dragState.current.scrollLeft - walk;
  };

  const handleMouseUp = () => {
    if (!tableContainerRef.current) return;
    dragState.current.isDragging = false;
    tableContainerRef.current.style.cursor = 'grab';
    tableContainerRef.current.style.removeProperty('user-select');
  };

  const handleMouseLeave = () => {
    handleMouseUp();
  };

  const handleAddStage = () => {
    setEditingStage(null);
    setIsStageDialogOpen(true);
  };

  const handleEditStage = (stage: Stage) => {
    setEditingStage(stage);
    setIsStageDialogOpen(true);
  };

  const canEdit = user ? ['MINISTER', 'TECHNADZOR', 'SUPERADMIN'].includes(user.role) : false;

  const headerAction = useMemo(() => (
    <Link
      href="/objects"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/90 hover:text-white hover:bg-white/10 rounded transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      К объектам
    </Link>
  ), []);

  usePageHeader({
    title: 'График работ - Календарный план',
    action: headerAction,
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
        <main className="max-w-7xl mx-auto p-4">
          <div className="text-gray-500">Загрузка...</div>
        </main>
      </div>
    );
  }

  if (!object) {
    return (
      <div className="flex-1 bg-background">
        <main className="max-w-7xl mx-auto p-4">
          <div className="text-gray-500">Объект не найден</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 bg-background">
      <main className="w-full p-4">
        {/* Навигация */}
        {!isFullscreen && (
          <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
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
        )}

        {/* Таблица-календарь */}
        <div className={`bg-white shadow-sm overflow-hidden ${
          isFullscreen
            ? 'fixed inset-0 z-50 rounded-none flex flex-col'
            : ''
        }`}>
          {/* Статистика и кнопки масштаба */}
          <div className="flex items-center justify-between gap-4 px-4 py-2">
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
                <div className="flex items-center gap-3 text-[13px]">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Прогресс:</span>
                    <span className="font-semibold text-gray-700">{totalProgress}%</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Завершено:</span>
                    <span className="font-semibold text-gray-700">{completedStages}/{stages.length}</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Отклонение:</span>
                    <span className={`font-semibold ${
                      deviation > 0 ? 'text-green-600' : deviation < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {deviation > 0 ? '+' : ''}{deviation}%
                    </span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1">
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
            {/* Масштаб и Fullscreen */}
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] text-gray-500">Масштаб:</span>
              <div className="flex gap-0.5">
                {[
                  { value: 'days', label: 'По дням' },
                  { value: 'weeks', label: 'По неделям' },
                  { value: 'decades', label: 'По декадам' },
                  { value: 'months', label: 'По месяцам' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setCalendarScale(option.value as CalendarScale)}
                    className={`px-2.5 py-1 text-[13px] font-medium rounded transition-colors ${
                      calendarScale === option.value
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-0.5 border-l pl-2.5 ml-1">
                <button
                  onClick={() => setCalendarZoom(prev => {
                    const idx = zoomLevels.indexOf(prev);
                    return idx > 0 ? zoomLevels[idx - 1] : prev;
                  })}
                  className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  disabled={calendarZoom === 50}
                  title="Уменьшить"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[13px] text-gray-500 min-w-[40px] text-center">
                  {calendarZoom}%
                </span>
                <button
                  onClick={() => setCalendarZoom(prev => {
                    const idx = zoomLevels.indexOf(prev);
                    return idx < zoomLevels.length - 1 ? zoomLevels[idx + 1] : prev;
                  })}
                  className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  disabled={calendarZoom === 150}
                  title="Увеличить"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div
              className={`overflow-x-auto cursor-grab ${isFullscreen ? 'flex-1 overflow-y-auto' : ''}`}
              ref={tableContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
            <table className="w-full border-collapse min-w-[1200px]">
              <thead>
                {/* Заголовок с датами */}
                <tr className="bg-primary text-primary-foreground">
                  <th className="sticky left-0 bg-primary z-10 px-4 py-2 text-left text-sm font-semibold w-[300px] min-w-[300px] max-w-[300px] relative after:content-[''] after:absolute after:top-0 after:bottom-0 after:left-full after:w-px after:bg-white/20">
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
                      ref={(el) => {
                        if (el) periodHeaderRefs.current.set(i, el);
                        else periodHeaderRefs.current.delete(i);
                      }}
                      data-today={period.isToday || undefined}
                      className={`px-1 py-2 text-center border-r border-white/20 ${
                        calendarScale === 'days' ? zoom.columnWidth : zoom.columnWidthLarge
                      } ${period.isWeekend ? 'bg-black/10' : ''} ${
                        period.isToday ? 'bg-chart-1 text-white' : ''
                      }`}
                    >
                      <div className={`${zoom.headerText} font-semibold`}>
                        {period.label}
                      </div>
                      {period.subLabel && calendarScale === 'days' && (
                        <div className={`${zoom.subText} opacity-75`}>
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
                          <td rowSpan={2} className="sticky left-0 bg-white z-30 px-4 py-1 align-top w-[300px] min-w-[300px] max-w-[300px] relative after:content-[''] after:absolute after:top-0 after:bottom-0 after:left-full after:w-px after:bg-gray-100">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0 mr-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={() => {
                                      const stageStartIdx = periods.findIndex(p => isPeriodInRange(p, stage.startDate, stage.endDate));
                                      const headerCell = periodHeaderRefs.current.get(stageStartIdx);
                                      if (headerCell && tableContainerRef.current) {
                                        const container = tableContainerRef.current;
                                        const cellRect = headerCell.getBoundingClientRect();
                                        const containerRect = container.getBoundingClientRect();
                                        const scrollLeft = cellRect.left - containerRect.left + container.scrollLeft - 300;
                                        container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
                                      }
                                    }}
                                    className="font-medium text-gray-900 hover:text-primary cursor-pointer text-left"
                                  >
                                    {stageIndex + 1}. {stage.name}
                                  </button>
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
                                        <div
                                          onClick={() => setVolumeModalStage(stage)}
                                          className={`flex items-center gap-1 cursor-pointer hover:opacity-70 ${
                                            volPercent >= 100 ? 'text-green-600' : volPercent >= 50 ? 'text-yellow-600' : 'text-gray-500'
                                          }`}
                                        >
                                          <Package className="w-3.5 h-3.5" />
                                          <span>Объём:</span>
                                          <span>{volPercent}%</span>
                                          <span className="text-gray-400">({volStage?.checksCount || 0})</span>
                                        </div>
                                        <div
                                          onClick={() => setPaymentModalStage(stage)}
                                          className={`flex items-center gap-1 cursor-pointer hover:opacity-70 ${
                                            payPercent >= 100 ? 'text-green-600' : payPercent >= 50 ? 'text-primary' : 'text-gray-500'
                                          }`}
                                        >
                                          <Wallet className="w-3.5 h-3.5" />
                                          <span>Платежи:</span>
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
                                  title="Редактировать"
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
                              // Calculate separator positions aligned to period boundaries
                              const extensions = getAllExtensions(stage);
                              const separatorPositions: number[] = [];

                              if (extensions.length > 0 && spanCount > 1) {
                                extensions.forEach(ext => {
                                  // Find the period index where extension starts (after oldEndDate)
                                  const extStartDate = new Date(ext.oldEndDate!);
                                  extStartDate.setDate(extStartDate.getDate() + 1); // Day after old end

                                  const periodIdx = periods.findIndex((p, idx) =>
                                    idx >= startIdx && idx <= endIdx &&
                                    p.dates.some(d => d.toDateString() === extStartDate.toDateString())
                                  );

                                  if (periodIdx >= startIdx && periodIdx <= endIdx) {
                                    // Position as percentage: (periodIdx - startIdx) / spanCount * 100
                                    const positionPercent = ((periodIdx - startIdx) / spanCount) * 100;
                                    if (positionPercent > 0 && positionPercent < 100 && !separatorPositions.includes(positionPercent)) {
                                      separatorPositions.push(positionPercent);
                                    }
                                  }
                                });
                              }

                              return (
                                <td
                                  key={i}
                                  colSpan={spanCount}
                                  className="px-1 py-1 align-middle"
                                >
                                  <div className={`relative ${zoom.progressHeight} bg-gray-200 rounded-full overflow-hidden`}>
                                    {/* Vertical separators at extension boundaries */}
                                    {separatorPositions.map((pos, idx) => (
                                      <div
                                        key={idx}
                                        className="absolute inset-y-0 w-1 bg-white z-10"
                                        style={{ left: `calc(${pos}% + 1px)` }}
                                        title={`Продление ${idx + 1}`}
                                      />
                                    ))}
                                    {/* Progress bar */}
                                    <div
                                      className={`h-full rounded-full transition-all relative z-10 ${
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
                                    <div className="absolute inset-0 flex items-center justify-center z-20">
                                      <span className={`${zoom.progressText} font-bold ${progress >= 45 ? 'text-white' : 'text-gray-700'}`}>
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
                                className="px-0.5 py-1"
                              />
                            );
                          })}
                        </tr>
                        {/* Строка с данными ресурсов */}
                        <tr className="border-b">
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
                                className="px-0.5 py-1 text-left align-top"
                              >
                                {inRange && (
                                  <div className={`${zoom.cellText} space-y-0.5 px-1`}>
                                    <div className={`flex items-center gap-1 whitespace-nowrap ${
                                      !hasData ? 'text-gray-400' : peopleOk ? 'text-green-600' : 'text-orange-500'
                                    }`}>
                                      <Users className={`${zoom.iconSize} flex-shrink-0`} />
                                      <span>Люди:</span>
                                      <span className="font-semibold">
                                        {actualPeople ?? '–'}/{plannedPeople || '–'}
                                      </span>
                                    </div>
                                    {(() => {
                                      const cellKey = `${stage.id}-${i}`;
                                      const isExpanded = expandedEquipment.has(cellKey);

                                      // Агрегируем данные по типам техники
                                      const equipmentByType: Record<string, { planned: number; actual: number; name: string }> = {};

                                      // Плановая техника
                                      stage.plannedEquipment?.forEach((eq) => {
                                        const typeId = eq.equipmentTypeId;
                                        if (!equipmentByType[typeId]) {
                                          equipmentByType[typeId] = { planned: 0, actual: 0, name: eq.equipmentType.name };
                                        }
                                        equipmentByType[typeId].planned += eq.quantity;
                                      });

                                      // Фактическая техника из проверок
                                      if (periodChecks.length > 0) {
                                        const typeActuals: Record<string, number[]> = {};
                                        periodChecks.forEach((check) => {
                                          check.equipmentChecks.forEach((ec) => {
                                            if (!typeActuals[ec.equipmentTypeId]) {
                                              typeActuals[ec.equipmentTypeId] = [];
                                            }
                                            typeActuals[ec.equipmentTypeId].push(ec.quantity);
                                            // Добавляем название если ещё нет
                                            if (!equipmentByType[ec.equipmentTypeId]) {
                                              equipmentByType[ec.equipmentTypeId] = { planned: 0, actual: 0, name: ec.equipmentType.name };
                                            }
                                          });
                                        });
                                        // Усредняем факт
                                        Object.entries(typeActuals).forEach(([typeId, values]) => {
                                          if (equipmentByType[typeId]) {
                                            equipmentByType[typeId].actual = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
                                          }
                                        });
                                      }

                                      const equipmentList = Object.values(equipmentByType);
                                      const hasEquipmentDetails = equipmentList.length > 0;

                                      return (
                                        <div>
                                          <div
                                            className={`flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                                              !hasData ? 'text-gray-400' : equipmentOk ? 'text-green-600' : 'text-orange-500'
                                            }`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (hasEquipmentDetails) {
                                                setExpandedEquipment(prev => {
                                                  const next = new Set(prev);
                                                  if (next.has(cellKey)) {
                                                    next.delete(cellKey);
                                                  } else {
                                                    next.add(cellKey);
                                                  }
                                                  return next;
                                                });
                                              }
                                            }}
                                          >
                                            <Truck className={`${zoom.iconSize} flex-shrink-0`} />
                                            <span>Техн.:</span>
                                            {hasEquipmentDetails && (
                                              isExpanded
                                                ? <ChevronUp className="w-3 h-3 flex-shrink-0" />
                                                : <ChevronDown className="w-3 h-3 flex-shrink-0" />
                                            )}
                                            <span className="font-semibold">
                                              {actualEquipment ?? '–'}/{plannedEquipment || '–'}
                                            </span>
                                          </div>
                                          {isExpanded && hasEquipmentDetails && (
                                            <div className="ml-4 mt-0.5 space-y-0.5">
                                              {equipmentList.map((eq, idx) => {
                                                const eqOk = eq.actual >= eq.planned;
                                                return (
                                                  <div
                                                    key={idx}
                                                    className={`flex items-center justify-between gap-2 ${
                                                      eq.actual === 0 && !hasData ? 'text-gray-400' : eqOk ? 'text-green-600' : 'text-orange-500'
                                                    }`}
                                                  >
                                                    <span className="truncate">{eq.name}:</span>
                                                    <span className="font-semibold">{hasData ? eq.actual : '–'}/{eq.planned}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
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
        objectStartDate={object?.startDate}
        objectEndDate={object?.endDate}
      />

      {/* Диалог редактирования объекта */}
      <ObjectFormDialog
        open={isObjectDialogOpen}
        onOpenChange={setIsObjectDialogOpen}
        object={object}
        onSuccess={loadData}
      />

      {/* Модальное окно проверок объёмов */}
      <Dialog open={!!volumeModalStage} onOpenChange={() => setVolumeModalStage(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Проверки объёмов</DialogTitle>
          </DialogHeader>
          {volumeModalStage && (() => {
            const volStage = volumeSummary?.stages.find(s => s.stageId === volumeModalStage.id);
            return (
              <div className="space-y-4">
                <div className="text-sm text-gray-500">{volumeModalStage.name}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Выполнено</div>
                    <div className="text-2xl font-bold text-primary">{volStage?.percent || 0}%</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Проверок</div>
                    <div className="text-2xl font-bold text-gray-700">{volStage?.checksCount || 0}</div>
                  </div>
                </div>
                {volStage?.lastCheckDate && (
                  <div className="text-sm text-gray-500">
                    Последняя проверка: {new Date(volStage.lastCheckDate).toLocaleDateString('ru-RU')}
                  </div>
                )}
                {(!volStage || volStage.checksCount === 0) && (
                  <div className="text-center text-gray-400 py-4">
                    Проверки объёмов ещё не проводились
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Модальное окно платежей */}
      <Dialog open={!!paymentModalStage} onOpenChange={() => setPaymentModalStage(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Платежи по этапу</DialogTitle>
          </DialogHeader>
          {paymentModalStage && (() => {
            const payStage = paymentSummary?.stages.find(s => s.stageId === paymentModalStage.id);
            const stageBudget = (paymentModalStage as any).budget || 0;
            return (
              <div className="space-y-4">
                <div className="text-sm text-gray-500">{paymentModalStage.name}</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Бюджет</div>
                    <div className="text-lg font-bold text-gray-700">
                      {stageBudget ? Number(stageBudget).toLocaleString('ru-RU') : '—'} ₽
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Оплачено</div>
                    <div className="text-lg font-bold text-green-600">
                      {payStage?.totalPaid ? Number(payStage.totalPaid).toLocaleString('ru-RU') : '0'} ₽
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Процент</div>
                    <div className="text-lg font-bold text-primary">{payStage?.percentPaid || 0}%</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Платежей: {payStage?.paymentsCount || 0}
                </div>
                {(!payStage || payStage.paymentsCount === 0) && (
                  <div className="text-center text-gray-400 py-4">
                    Платежи по этапу ещё не проводились
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
}
