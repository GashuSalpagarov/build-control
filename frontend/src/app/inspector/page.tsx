'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usePageHeader } from '@/hooks/use-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { objectsApi, resourceChecksApi } from '@/lib/api';
import { ConstructionObject, ResourceCheck } from '@/lib/types';
import { ResourceCheckFormDialog } from '@/components/resource-checks';
import { Plus, MessageSquare } from 'lucide-react';

export default function InspectorPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string>('__all__');
  const [checks, setChecks] = useState<ResourceCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>('');

  // Диалог формы
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState<ResourceCheck | null>(null);

  // Загрузка объектов
  const loadObjects = useCallback(async () => {
    try {
      const data = await objectsApi.getAll();
      setObjects(data);
    } catch (err) {
      console.error('Error loading objects:', err);
    }
  }, []);

  // Загрузка проверок
  const loadChecks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: { objectId?: string; date?: string } = {};
      if (selectedObjectId !== '__all__') {
        params.objectId = selectedObjectId;
      }
      if (dateFilter) {
        params.date = dateFilter;
      }
      const data = await resourceChecksApi.getAll(params);
      setChecks(data);
    } catch (err) {
      console.error('Error loading checks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedObjectId, dateFilter]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // Проверяем роль - только INSPECTOR, MINISTER, SUPERADMIN
    if (user && !['INSPECTOR', 'MINISTER', 'SUPERADMIN'].includes(user.role)) {
      router.push('/objects');
      return;
    }

    if (user) {
      loadObjects();
    }
  }, [user, authLoading, router, loadObjects]);

  useEffect(() => {
    if (user) {
      loadChecks();
    }
  }, [user, loadChecks]);

  const handleCreateCheck = () => {
    setEditingCheck(null);
    setIsFormOpen(true);
  };

  const handleEditCheck = (check: ResourceCheck) => {
    setEditingCheck(check);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    loadChecks();
  };

  const today = new Date().toISOString().split('T')[0];

  const formatCompactDate = (dateString: string) => {
    const d = new Date(dateString);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const headerAction = useMemo(() => (
    <Button onClick={handleCreateCheck}>
      <Plus className="w-4 h-4 mr-2" />
      Новая проверка
    </Button>
  ), []);

  usePageHeader({
    title: 'Проверки',
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
    <TooltipProvider>
      <div className="flex-1 bg-background">
        <main className="max-w-7xl mx-auto p-4">
          {/* Фильтры */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Объект
                </label>
                <Select
                  value={selectedObjectId}
                  onValueChange={setSelectedObjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Все объекты" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Все объекты</SelectItem>
                    {objects.map((obj) => (
                      <SelectItem key={obj.id} value={obj.id}>
                        {obj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата
                </label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  max={today}
                />
              </div>
              {dateFilter && (
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateFilter('')}
                  >
                    Сбросить
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Таблица проверок */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Дата</TableHead>
                  <TableHead className="text-xs">Объект</TableHead>
                  <TableHead className="text-xs">Этап</TableHead>
                  <TableHead className="text-xs w-[80px]">Люди</TableHead>
                  <TableHead className="text-xs w-[90px]">Техника</TableHead>
                  <TableHead className="text-xs w-[140px]">Автор</TableHead>
                  <TableHead className="text-xs w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell><div className="h-4 w-20 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-28 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-12 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-12 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-20 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-4 bg-muted rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : checks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Проверки не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  checks.map((check) => {
                    const checkDate = check.date.split('T')[0];
                    const isToday = checkDate === today;
                    const totalEquipment = check.equipmentChecks.reduce(
                      (sum, ec) => sum + ec.quantity,
                      0
                    );
                    const equipmentDetails = check.equipmentChecks
                      .filter((ec) => ec.quantity > 0)
                      .map((ec) => `${ec.equipmentType.name}: ${ec.quantity}`)
                      .join('\n');

                    return (
                      <TableRow
                        key={check.id}
                        className="cursor-pointer"
                        onClick={() => handleEditCheck(check)}
                      >
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{formatCompactDate(check.date)}</span>
                            {check.checkedAt && (
                              <span className="text-xs text-muted-foreground">
                                {formatTime(check.checkedAt)}
                              </span>
                            )}
                            {isToday && (
                              <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">
                                Сегодня
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {check.stage.object?.name || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {check.stage.name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {check.actualPeople ?? 0} чел.
                        </TableCell>
                        <TableCell className="text-sm">
                          {totalEquipment > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-default">{totalEquipment} ед.</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="whitespace-pre-line">{equipmentDetails}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">0 ед.</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {check.user.name}
                        </TableCell>
                        <TableCell>
                          {check.comment && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{check.comment}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </main>

        {/* Единый диалог формы */}
        <ResourceCheckFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          objects={objects}
          existingCheck={editingCheck}
          onSuccess={handleFormSuccess}
        />
      </div>
    </TooltipProvider>
  );
}
