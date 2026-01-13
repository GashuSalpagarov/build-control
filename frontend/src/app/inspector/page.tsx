'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
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
import { objectsApi, stagesApi, resourceChecksApi } from '@/lib/api';
import { ConstructionObject, Stage, ResourceCheck } from '@/lib/types';
import { ResourceCheckFormDialog } from '@/components/resource-checks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Calendar, Users, Wrench, MessageSquare } from 'lucide-react';

export default function InspectorPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string>('__all__');
  const [stages, setStages] = useState<Stage[]>([]);
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

  // Загрузка этапов выбранного объекта
  const loadStages = useCallback(async (objectId: string) => {
    if (objectId === '__all__') {
      setStages([]);
      return;
    }
    try {
      const data = await stagesApi.getByObject(objectId);
      setStages(data);
    } catch (err) {
      console.error('Error loading stages:', err);
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

    // Проверяем роль - только INSPECTOR, TECHNADZOR, MINISTER, SUPERADMIN
    if (user && !['INSPECTOR', 'TECHNADZOR', 'MINISTER', 'SUPERADMIN'].includes(user.role)) {
      router.push('/objects');
      return;
    }

    if (user) {
      loadObjects();
    }
  }, [user, authLoading, router, loadObjects]);

  useEffect(() => {
    if (selectedObjectId !== '__all__') {
      loadStages(selectedObjectId);
    }
  }, [selectedObjectId, loadStages]);

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
    // Загружаем этапы объекта для редактирования
    if (check.stage.objectId) {
      loadStages(check.stage.objectId);
    }
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    loadChecks();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const today = new Date().toISOString().split('T')[0];

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background">
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Ежедневные проверки
            </h2>
            <p className="text-sm text-gray-500">
              Контроль людей и техники на объектах
            </p>
          </div>
          <Button onClick={handleCreateCheck}>
            <Plus className="w-4 h-4 mr-2" />
            Новая проверка
          </Button>
        </div>

        {/* Фильтры */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
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

        {/* Список проверок */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Загрузка...</div>
          ) : checks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Проверки не найдены
            </div>
          ) : (
            <div className="divide-y">
              {checks.map((check) => {
                const checkDate = check.date.split('T')[0];
                const isToday = checkDate === today;
                const totalEquipment = check.equipmentChecks.reduce(
                  (sum, ec) => sum + ec.quantity,
                  0
                );

                return (
                  <div
                    key={check.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleEditCheck(check)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">
                            {check.stage.name}
                          </span>
                          {isToday && (
                            <Badge className="bg-green-100 text-green-700">
                              Сегодня
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(check.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {check.actualPeople ?? 0} чел.
                          </span>
                          <span className="flex items-center gap-1">
                            <Wrench className="w-4 h-4" />
                            {totalEquipment} ед. техники
                          </span>
                        </div>
                        {check.comment && (
                          <div className="flex items-start gap-1 mt-2 text-sm text-gray-500">
                            <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{check.comment}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div>{check.user.name}</div>
                      </div>
                    </div>

                    {/* Детали техники */}
                    {check.equipmentChecks.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {check.equipmentChecks.map((ec) => (
                          <Badge
                            key={ec.id}
                            variant="outline"
                            className="bg-gray-50"
                          >
                            {ec.equipmentType.name}: {ec.quantity}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Диалог формы */}
      {selectedObjectId !== '__all__' ? (
        <ResourceCheckFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          objectId={selectedObjectId}
          stages={stages}
          existingCheck={editingCheck}
          onSuccess={handleFormSuccess}
        />
      ) : (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Выберите объект</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Для создания проверки сначала выберите объект в фильтре.
              </p>
              <Select
                value={selectedObjectId}
                onValueChange={(value) => {
                  setSelectedObjectId(value);
                  if (value !== '__all__') {
                    loadStages(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите объект" />
                </SelectTrigger>
                <SelectContent>
                  {objects.map((obj) => (
                    <SelectItem key={obj.id} value={obj.id}>
                      {obj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
