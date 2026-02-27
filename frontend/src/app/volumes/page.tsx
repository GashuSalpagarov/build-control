'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usePageHeader } from '@/hooks/use-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { objectsApi, stagesApi, volumeChecksApi } from '@/lib/api';
import { ConstructionObject, Stage, VolumeCheck, VolumeCheckObjectSummary, UpdateVolumeCheckDto } from '@/lib/types';
import { Plus } from 'lucide-react';

function formatDate(dateString: string) {
  const d = new Date(dateString);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

export default function TechnadzorPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string>('__none__');
  const [stages, setStages] = useState<Stage[]>([]);
  const [volumeChecks, setVolumeChecks] = useState<VolumeCheck[]>([]);
  const [summary, setSummary] = useState<VolumeCheckObjectSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Редактирование
  const [editingCheck, setEditingCheck] = useState<VolumeCheck | null>(null);

  // Форма проверки
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    stageId: '',
    date: new Date().toISOString().split('T')[0],
    percent: '',
    comment: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Загрузка объектов
  const loadObjects = useCallback(async () => {
    try {
      const data = await objectsApi.getAll();
      setObjects(data);
    } catch (err) {
      console.error('Error loading objects:', err);
    }
  }, []);

  // Загрузка данных при выборе объекта
  const loadObjectData = useCallback(async (objectId: string) => {
    if (objectId === '__none__') {
      setStages([]);
      setVolumeChecks([]);
      setSummary(null);
      return;
    }

    setIsLoading(true);
    try {
      const [stagesData, checksData, summaryData] = await Promise.all([
        stagesApi.getByObject(objectId),
        volumeChecksApi.getAll({ objectId }),
        volumeChecksApi.getSummaryByObject(objectId),
      ]);
      setStages(stagesData);
      setVolumeChecks(checksData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error loading object data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // Проверяем роль
    if (user && !['TECHNADZOR', 'MINISTER', 'SUPERADMIN'].includes(user.role)) {
      router.push('/objects');
      return;
    }

    if (user) {
      loadObjects();
    }
  }, [user, authLoading, router, loadObjects]);

  useEffect(() => {
    loadObjectData(selectedObjectId);
  }, [selectedObjectId, loadObjectData]);

  const handleSubmit = async () => {
    if (!formData.stageId || !formData.percent) {
      setFormError('Заполните обязательные поля');
      return;
    }

    const percent = parseInt(formData.percent);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      setFormError('Процент должен быть от 0 до 100');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingCheck) {
        await volumeChecksApi.update(editingCheck.id, {
          date: formData.date,
          percent,
          comment: formData.comment || undefined,
        });
      } else {
        await volumeChecksApi.create({
          stageId: formData.stageId,
          date: formData.date,
          percent,
          comment: formData.comment || undefined,
        });
      }

      setIsFormOpen(false);
      setEditingCheck(null);
      setFormData({
        stageId: '',
        date: new Date().toISOString().split('T')[0],
        percent: '',
        comment: '',
      });
      loadObjectData(selectedObjectId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCheck = (check: VolumeCheck) => {
    setEditingCheck(check);
    setFormData({
      stageId: check.stageId,
      date: new Date(check.date).toISOString().split('T')[0],
      percent: String(check.percent),
      comment: check.comment || '',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  // Получить текущий процент по этапу
  const getStagePercent = (stageId: string): number => {
    const stageSummary = summary?.stages.find((s) => s.stageId === stageId);
    return stageSummary?.percent || 0;
  };

  const headerAction = useMemo(() => (
    <Button
      onClick={() => setIsFormOpen(true)}
      disabled={selectedObjectId === '__none__'}
    >
      <Plus className="w-4 h-4 mr-2" />
      Добавить проверку
    </Button>
  ), [selectedObjectId]);

  usePageHeader({
    title: 'Объёмы',
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
        {/* Выбор объекта */}
        <div className="mb-6 w-full max-w-md">
          <Label className="mb-1.5 block">Выберите объект</Label>
          <Select value={selectedObjectId} onValueChange={setSelectedObjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите объект" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Не выбран</SelectItem>
              {objects.map((obj) => (
                <SelectItem key={obj.id} value={obj.id}>
                  {obj.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Сводка */}
        {(() => {
          const completed = summary?.stages.filter(s => s.percent >= 100).length || 0;
          const total = summary?.stages.length || 0;
          const avgProgress = summary?.averageProgress || 0;
          return (
            <div className="flex items-center gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Прогресс</span>
                <span className={`font-semibold ${
                  avgProgress >= 80 ? 'text-green-600' :
                  avgProgress >= 40 ? 'text-yellow-600' : 'text-foreground'
                }`}>{avgProgress}%</span>
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      avgProgress >= 80 ? 'bg-green-500' :
                      avgProgress >= 40 ? 'bg-yellow-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(avgProgress, 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-muted-foreground/30">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Этапов</span>
                <span className="font-semibold text-foreground">{total}</span>
              </div>
              <span className="text-muted-foreground/30">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Завершено</span>
                <span className="font-semibold text-green-600">{completed}</span>
                {total > 0 && (
                  <span className="text-muted-foreground">/ {total}</span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Этапы */}
        <div className="mb-6">
          <h3 className="font-semibold text-sm text-foreground mb-2">Этапы</h3>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Этап</TableHead>
                  <TableHead className="w-[200px] text-xs">Прогресс</TableHead>
                  <TableHead className="w-[100px] text-xs text-center">Проверок</TableHead>
                  <TableHead className="w-[140px] text-xs text-right">Последняя</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary && summary.stages.length > 0 ? (
                  summary.stages.map((stage) => (
                    <TableRow key={stage.stageId}>
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">{stage.stageName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                stage.percent >= 100
                                  ? 'bg-green-500'
                                  : stage.percent >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-primary'
                              }`}
                              style={{ width: `${Math.min(stage.percent, 100)}%` }}
                            />
                          </div>
                          <Badge
                            className={`text-xs min-w-[42px] justify-center ${
                              stage.percent >= 100
                                ? 'bg-green-100 text-green-700'
                                : stage.percent >= 50
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            {stage.percent}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {stage.checksCount}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {stage.lastCheckDate ? formatDate(stage.lastCheckDate) : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      {selectedObjectId === '__none__' ? 'Выберите объект' : 'Этапов нет'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* История проверок */}
        <h3 className="font-semibold text-sm text-foreground mb-2">История проверок</h3>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px] text-xs">№</TableHead>
                <TableHead className="text-xs">Этап</TableHead>
                <TableHead className="w-[100px] text-xs">Дата</TableHead>
                <TableHead className="w-[130px] text-xs">Прогресс</TableHead>
                <TableHead className="text-xs">Автор</TableHead>
                <TableHead className="text-xs">Комментарий</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell><div className="h-4 w-5 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-32 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-16 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-20 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-40 bg-muted rounded" /></TableCell>
                    </TableRow>
                  ))}
                </>
              ) : volumeChecks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {selectedObjectId === '__none__' ? 'Выберите объект' : 'Проверок нет'}
                  </TableCell>
                </TableRow>
              ) : (
                volumeChecks.map((check, index) => {
                  const stage = stages.find(s => s.id === check.stageId);
                  return (
                    <TableRow key={check.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEditCheck(check)}>
                      <TableCell className="text-sm text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">
                          {stage?.name || 'Этап'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(check.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                check.percent >= 100
                                  ? 'bg-green-500'
                                  : check.percent >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-primary'
                              }`}
                              style={{ width: `${Math.min(check.percent, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-foreground w-8 text-right">
                            {check.percent}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {check.user?.name || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {check.comment || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Форма добавления проверки */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) setEditingCheck(null);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCheck ? 'Редактировать проверку' : 'Добавить проверку объёмов'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Этап *</Label>
              <Select
                value={formData.stageId}
                onValueChange={(value) => setFormData({ ...formData, stageId: value })}
                disabled={!!editingCheck}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите этап" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.stageId && (
                <p className="text-xs text-gray-500">
                  Текущий прогресс: {getStagePercent(formData.stageId)}%
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Дата *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Процент выполнения (0-100) *</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.percent}
                onChange={(e) => setFormData({ ...formData, percent: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Комментарий</Label>
              <Textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Описание выполненных работ..."
                rows={3}
              />
            </div>

            {formError && (
              <div className="text-sm text-red-500 text-center">{formError}</div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
