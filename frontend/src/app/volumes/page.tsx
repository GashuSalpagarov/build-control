'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Header } from '@/components/layout/header';
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
import { objectsApi, stagesApi, volumeChecksApi } from '@/lib/api';
import { ConstructionObject, Stage, VolumeCheck, VolumeCheckObjectSummary } from '@/lib/types';
import { Plus, Calendar, TrendingUp, CheckCircle } from 'lucide-react';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function TechnadzorPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string>('__none__');
  const [stages, setStages] = useState<Stage[]>([]);
  const [volumeChecks, setVolumeChecks] = useState<VolumeCheck[]>([]);
  const [summary, setSummary] = useState<VolumeCheckObjectSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      await volumeChecksApi.create({
        stageId: formData.stageId,
        date: formData.date,
        percent,
        comment: formData.comment || undefined,
      });

      setIsFormOpen(false);
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

  // Получить текущий процент по этапу
  const getStagePercent = (stageId: string): number => {
    const stageSummary = summary?.stages.find((s) => s.stageId === stageId);
    return stageSummary?.percent || 0;
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Проверки объёмов</h2>
            <p className="text-sm text-gray-500">Контроль выполнения работ по этапам</p>
          </div>
          <Button
            onClick={() => setIsFormOpen(true)}
            disabled={selectedObjectId === '__none__'}
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить проверку
          </Button>
        </div>

        {/* Выбор объекта */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="w-full max-w-md">
            <Label>Выберите объект</Label>
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
        </div>

        {selectedObjectId !== '__none__' && (
          <>
            {/* Сводка */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <div className="text-sm text-gray-500 mb-1">Средний прогресс</div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {summary.averageProgress}%
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <div className="text-sm text-gray-500 mb-1">Всего этапов</div>
                  <div className="text-2xl font-bold text-gray-700">
                    {summary.stages.length}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <div className="text-sm text-gray-500 mb-1">Завершённых</div>
                  <div className="text-2xl font-bold text-green-600">
                    {summary.stages.filter(s => s.percent >= 100).length}
                  </div>
                </div>
              </div>
            )}

            {/* Этапы со сводкой */}
            {summary && summary.stages.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700">
                  Этапы
                </div>
                <div className="divide-y">
                  {summary.stages.map((stage) => (
                    <div key={stage.stageId} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{stage.stageName}</div>
                        <div className="text-sm text-gray-500">
                          {stage.checksCount} проверок
                          {stage.lastCheckDate && (
                            <span className="ml-2">
                              • Последняя: {formatDate(stage.lastCheckDate)}
                            </span>
                          )}
                        </div>
                        {/* Прогресс-бар */}
                        <div className="mt-2 w-full max-w-md">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                stage.percent >= 100
                                  ? 'bg-green-500'
                                  : stage.percent >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(stage.percent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <Badge
                          className={`text-lg px-3 py-1 ${
                            stage.percent >= 100
                              ? 'bg-green-100 text-green-700'
                              : stage.percent >= 50
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {stage.percent}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Список проверок */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700">
                История проверок
              </div>
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Загрузка...</div>
              ) : volumeChecks.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Проверок нет</div>
              ) : (
                <div className="divide-y">
                  {volumeChecks.map((check) => {
                    const stage = stages.find(s => s.id === check.stageId);
                    return (
                      <div key={check.id} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{stage?.name || 'Этап'}</div>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(check.date)}
                              </span>
                            </div>
                            {check.comment && (
                              <div className="text-sm text-gray-500 mt-1">
                                {check.comment}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold flex items-center gap-1 ${
                              check.percent >= 100 ? 'text-green-600' :
                              check.percent >= 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {check.percent >= 100 ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <TrendingUp className="w-5 h-5" />
                              )}
                              {check.percent}%
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Форма добавления проверки */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Добавить проверку объёмов</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Этап *</Label>
              <Select
                value={formData.stageId}
                onValueChange={(value) => setFormData({ ...formData, stageId: value })}
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
