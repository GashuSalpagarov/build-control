'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usePageHeader } from '@/hooks/use-page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { Plus, ArrowLeft, MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react';

const today = new Date().toISOString().split('T')[0];

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export default function InspectorPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Общие данные
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Режим: список объектов vs проверки объекта
  const [selectedObject, setSelectedObject] = useState<ConstructionObject | null>(null);

  // Данные для режима «список объектов»
  const [checkedObjectIds, setCheckedObjectIds] = useState<Set<string>>(new Set());

  // Данные для режима «проверки объекта»
  const [objectChecks, setObjectChecks] = useState<ResourceCheck[]>([]);
  const [isLoadingChecks, setIsLoadingChecks] = useState(false);

  // Диалог формы
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState<ResourceCheck | null>(null);

  // Загрузка объектов
  const loadObjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await objectsApi.getAll();
      setObjects(data);
    } catch (err) {
      console.error('Error loading objects:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Загрузка сводки по проверкам за сегодня (для индикаторов)
  const loadTodaysSummary = useCallback(async () => {
    try {
      const checks = await resourceChecksApi.getAll({ date: today });
      const ids = new Set(checks.map((c) => c.stage.objectId || c.stage.object?.id).filter(Boolean) as string[]);
      setCheckedObjectIds(ids);
    } catch (err) {
      console.error('Error loading today checks:', err);
    }
  }, []);

  // Загрузка проверок выбранного объекта за сегодня
  const loadObjectChecks = useCallback(async (objectId: string) => {
    setIsLoadingChecks(true);
    try {
      const data = await resourceChecksApi.getAll({ objectId, date: today });
      setObjectChecks(data);
    } catch (err) {
      console.error('Error loading object checks:', err);
    } finally {
      setIsLoadingChecks(false);
    }
  }, []);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && !['INSPECTOR', 'MINISTER', 'SUPERADMIN'].includes(user.role)) {
      router.push('/objects');
      return;
    }
    if (user) {
      loadObjects();
      loadTodaysSummary();
    }
  }, [user, authLoading, router, loadObjects, loadTodaysSummary]);

  // При выборе объекта — загрузить его проверки
  useEffect(() => {
    if (selectedObject) {
      loadObjectChecks(selectedObject.id);
    }
  }, [selectedObject, loadObjectChecks]);

  const handleSelectObject = (obj: ConstructionObject) => {
    setSelectedObject(obj);
    setObjectChecks([]);
  };

  const handleBack = () => {
    setSelectedObject(null);
    setObjectChecks([]);
    loadTodaysSummary();
  };

  const handleCreateCheck = () => {
    setEditingCheck(null);
    setIsFormOpen(true);
  };

  const handleEditCheck = (check: ResourceCheck) => {
    setEditingCheck(check);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    if (selectedObject) {
      loadObjectChecks(selectedObject.id);
    }
    loadTodaysSummary();
  };

  // Page header
  const headerAction = useMemo(() => {
    if (!selectedObject) return undefined;
    return (
      <Button onClick={handleCreateCheck}>
        <Plus className="w-4 h-4 mr-2" />
        Новая проверка
      </Button>
    );
  }, [selectedObject]);

  usePageHeader({
    title: selectedObject ? selectedObject.name : 'Мои объекты',
    action: headerAction,
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  // --- Режим 1: Список объектов ---
  if (!selectedObject) {
    return (
      <div className="flex-1 bg-background">
        <main className="max-w-7xl mx-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-5 w-3/4 bg-muted rounded" />
                    <div className="h-4 w-1/2 bg-muted rounded mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : objects.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Вам не назначены объекты для проверки</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {objects.map((obj) => {
                const isChecked = checkedObjectIds.has(obj.id);
                return (
                  <Card
                    key={obj.id}
                    className="cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => handleSelectObject(obj)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-tight">{obj.name}</CardTitle>
                        {isChecked ? (
                          <Badge className="bg-green-100 text-green-700 shrink-0">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Проверено
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-300 text-amber-600 shrink-0">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Нет проверки
                          </Badge>
                        )}
                      </div>
                      {obj.address && (
                        <CardDescription className="mt-1">{obj.address}</CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- Режим 2: Проверки выбранного объекта ---
  return (
    <TooltipProvider>
      <div className="flex-1 bg-background">
        <main className="max-w-7xl mx-auto p-4">
          {/* Навигация назад + дата */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Назад
            </Button>
            <span className="text-sm text-muted-foreground">
              {formatDate(today)}
            </span>
          </div>

          {/* Таблица проверок */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Этап</TableHead>
                  <TableHead className="text-xs w-[100px]">Люди</TableHead>
                  <TableHead className="text-xs w-[100px]">Техника</TableHead>
                  <TableHead className="text-xs w-[140px]">Автор</TableHead>
                  <TableHead className="text-xs w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingChecks ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell><div className="h-4 w-32 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-16 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-16 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-4 bg-muted rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : objectChecks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="text-muted-foreground">
                        <p className="mb-3">На сегодня проверок нет</p>
                        <Button onClick={handleCreateCheck} size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Создать проверку
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  objectChecks.map((check) => {
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

        {/* Диалог формы */}
        <ResourceCheckFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          objects={[selectedObject]}
          existingCheck={editingCheck}
          onSuccess={handleFormSuccess}
        />
      </div>
    </TooltipProvider>
  );
}
