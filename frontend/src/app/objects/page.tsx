'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usePageHeader } from '@/hooks/use-page-header';
import { objectsApi } from '@/lib/api';
import { ConstructionObject } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ObjectCreationWizard } from '@/components/objects/object-creation-wizard';
import { statusStyles, deviationStyles } from '@/lib/design-system';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';

function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return '—';
  const fmt = (d: string) => {
    const date = new Date(d);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}.${mm}.${yy}`;
  };
  if (startDate && endDate) return `${fmt(startDate)} – ${fmt(endDate)}`;
  if (startDate) return `с ${fmt(startDate)}`;
  return `до ${fmt(endDate!)}`;
}

function calculateDeviation(obj: ConstructionObject): number | null {
  if (obj.status === 'PLANNED' || obj.status === 'COMPLETED' || obj.status === 'SUSPENDED') {
    return null;
  }
  if (!obj.startDate || !obj.endDate) {
    return null;
  }

  const today = new Date();
  const start = new Date(obj.startDate);
  const end = new Date(obj.endDate);

  if (today < start) return null;
  if (today > end) {
    return (obj.progress ?? 0) - 100;
  }

  const total = end.getTime() - start.getTime();
  const elapsed = today.getTime() - start.getTime();
  const plannedProgress = Math.round((elapsed / total) * 100);

  return (obj.progress ?? 0) - plannedProgress;
}

function getStatusStyle(obj: ConstructionObject) {
  const { status } = obj;

  if (status !== 'IN_PROGRESS') {
    return statusStyles[status];
  }

  const deviation = calculateDeviation(obj);

  if (deviation === null) {
    return statusStyles.IN_PROGRESS;
  }

  if (deviation > 0) {
    return deviationStyles.ahead(deviation);
  }
  if (deviation === 0) {
    return deviationStyles.onTrack(deviation);
  }
  if (deviation >= -10) {
    return deviationStyles.slightlyBehind(deviation);
  }
  return deviationStyles.behind(deviation);
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
      return;
    }
    if (user && user.role === 'INSPECTOR') {
      router.push('/inspector');
      return;
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    loadObjects();
  }, [loadObjects]);

  const canCreate = user ? ['MINISTER', 'TECHNADZOR', 'SUPERADMIN'].includes(user.role) : false;

  const headerAction = useMemo(() => {
    if (!canCreate) return undefined;
    return (
      <Button onClick={() => setIsDialogOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Добавить объект
      </Button>
    );
  }, [canCreate]);

  usePageHeader({
    title: 'Объекты строительства',
    action: headerAction,
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background">
      <main className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px] text-xs">№</TableHead>
                <TableHead className="text-xs">Объект</TableHead>
                <TableHead className="w-[140px] text-xs">Сроки</TableHead>
                <TableHead className="w-[130px] text-xs">Прогресс</TableHead>
                <TableHead className="w-[140px] text-xs">Статус</TableHead>
                <TableHead className="w-[130px] text-xs text-right">Бюджет</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell><div className="h-4 w-5 bg-muted rounded" /></TableCell>
                      <TableCell>
                        <div className="h-4 w-48 bg-muted rounded mb-1.5" />
                        <div className="h-3 w-32 bg-muted rounded" />
                      </TableCell>
                      <TableCell><div className="h-3 w-24 bg-muted rounded" /></TableCell>
                      <TableCell>
                        <div className="h-1.5 w-full bg-muted rounded-full mb-1" />
                        <div className="h-3 w-8 bg-muted rounded" />
                      </TableCell>
                      <TableCell><div className="h-5 w-20 bg-muted rounded-full" /></TableCell>
                      <TableCell><div className="h-4 w-20 bg-muted rounded ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </>
              ) : objects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Объекты не найдены
                  </TableCell>
                </TableRow>
              ) : (
                objects.map((obj, index) => {
                  const progress = obj.progress ?? 0;
                  const status = getStatusStyle(obj);

                  return (
                    <TableRow
                      key={obj.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/objects/${obj.id}`)}
                    >
                      <TableCell className="text-sm text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">{obj.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {obj.address || '—'}
                          {obj.contractor?.name && (
                            <span className="before:content-['·'] before:mx-1.5">{obj.contractor.name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateRange(obj.startDate, obj.endDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-foreground w-8 text-right">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${status.className}`}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-foreground">
                        {formatCurrency(obj.budget ? Number(obj.budget) : null)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <ObjectCreationWizard
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={loadObjects}
      />
    </div>
  );
}
