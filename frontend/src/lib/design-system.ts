/**
 * Minimal Design System
 * Uses only built-in shadcn/ui tokens without customization
 */

import { ObjectStatus } from './types';

/**
 * Status badge styles using shadcn tokens
 */
export const statusStyles = {
  PLANNED: {
    label: 'Запланировано',
    className: 'bg-muted text-muted-foreground',
  },
  IN_PROGRESS: {
    label: 'В работе',
    className: 'bg-primary text-primary-foreground',
  },
  COMPLETED: {
    label: 'Завершён',
    className: 'bg-[hsl(var(--chart-1))] text-white',
  },
  SUSPENDED: {
    label: 'Приостановлен',
    className: 'bg-[hsl(var(--chart-4))] text-white',
  },
} as const;

/**
 * Deviation styles for progress tracking
 */
export const deviationStyles = {
  ahead: (deviation: number) => ({
    label: `Опережаем: +${deviation}%`,
    className: 'bg-[hsl(var(--chart-1))] text-white',
  }),
  onTrack: (deviation: number) => ({
    label: `Успеваем: ${deviation}%`,
    className: 'bg-[hsl(var(--chart-1))] text-white',
  }),
  slightlyBehind: (deviation: number) => ({
    label: `Отстаём: ${deviation}%`,
    className: 'bg-[hsl(var(--chart-4))] text-white',
  }),
  behind: (deviation: number) => ({
    label: `Не успеваем: ${deviation}%`,
    className: 'bg-destructive text-destructive-foreground',
  }),
} as const;

/**
 * Chart colors using shadcn chart palette
 */
export const chartColors = {
  status: {
    PLANNED: 'hsl(var(--muted))',
    IN_PROGRESS: 'hsl(var(--chart-2))',
    COMPLETED: 'hsl(var(--chart-1))',
    SUSPENDED: 'hsl(var(--chart-4))',
  },
} as const;

/**
 * Get status style based on object status
 */
export function getStatusStyle(status: ObjectStatus) {
  return statusStyles[status] || statusStyles.IN_PROGRESS;
}
