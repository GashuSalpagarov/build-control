'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { objectsApi, stagesApi, appealsApi } from '@/lib/api';
import {
  ConstructionObject,
  Stage,
  Appeal,
  AppealStatus,
  AppealType,
  appealStatusLabels,
  appealStatusColors,
  appealTypeLabels,
  appealTypeColors,
} from '@/lib/types';
import { Plus, MessageSquare, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AppealsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Фильтры
  const [filterStatus, setFilterStatus] = useState<string>('__all__');
  const [filterObjectId, setFilterObjectId] = useState<string>('__all__');

  // Форма создания
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    objectId: '',
    stageId: '',
    type: 'QUESTION' as AppealType,
    subject: '',
    description: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const filters: { objectId?: string; status?: AppealStatus; my?: boolean } = {};

      if (filterObjectId !== '__all__') {
        filters.objectId = filterObjectId;
      }
      if (filterStatus !== '__all__') {
        filters.status = filterStatus as AppealStatus;
      }

      const [appealsData, objectsData] = await Promise.all([
        appealsApi.getAll(filters),
        objectsApi.getAll(),
      ]);

      setAppeals(appealsData);
      setObjects(objectsData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, filterStatus, filterObjectId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, authLoading, router, loadData]);

  // Загрузка этапов при выборе объекта в форме
  useEffect(() => {
    if (formData.objectId) {
      stagesApi.getByObject(formData.objectId).then(setStages).catch(console.error);
    } else {
      setStages([]);
    }
  }, [formData.objectId]);

  const handleSubmit = async () => {
    if (!formData.objectId || !formData.subject) {
      setFormError('Заполните обязательные поля');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await appealsApi.create({
        objectId: formData.objectId,
        stageId: formData.stageId || undefined,
        type: formData.type,
        subject: formData.subject,
        description: formData.description || undefined,
      });

      setIsFormOpen(false);
      setFormData({
        objectId: '',
        stageId: '',
        type: 'QUESTION',
        subject: '',
        description: '',
      });
      loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: AppealStatus) => {
    switch (status) {
      case 'NEW':
        return <AlertCircle className="w-4 h-4" />;
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4" />;
      case 'RESOLVED':
        return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4" />;
    }
  };

  const canCreate = ['CONTRACTOR', 'INSPECTOR', 'TECHNADZOR', 'ACCOUNTANT', 'MINISTER', 'SUPERADMIN'].includes(user?.role || '');

  const headerAction = useMemo(() => {
    if (!canCreate) return undefined;
    return (
      <Button onClick={() => setIsFormOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Создать обращение
      </Button>
    );
  }, [canCreate]);

  usePageHeader({
    title: 'Обращения',
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
        {/* Фильтры */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Статус</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Все статусы</SelectItem>
                  <SelectItem value="NEW">Новые</SelectItem>
                  <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                  <SelectItem value="RESOLVED">Решённые</SelectItem>
                  <SelectItem value="REJECTED">Отклонённые</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Объект</Label>
              <Select value={filterObjectId} onValueChange={setFilterObjectId}>
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
          </div>
        </div>

        {/* Список обращений */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Загрузка...</div>
          ) : appeals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Обращений нет</div>
          ) : (
            <div className="divide-y">
              {appeals.map((appeal) => (
                <Link
                  key={appeal.id}
                  href={`/appeals/${appeal.id}`}
                  className="block px-4 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={appealTypeColors[appeal.type]}>
                          {appealTypeLabels[appeal.type]}
                        </Badge>
                        <Badge className={appealStatusColors[appeal.status]}>
                          {getStatusIcon(appeal.status)}
                          <span className="ml-1">{appealStatusLabels[appeal.status]}</span>
                        </Badge>
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">
                        {appeal.subject}
                      </h3>
                      <div className="text-sm text-gray-500 mt-1">
                        <span>{appeal.object.name}</span>
                        {appeal.stage && <span> • {appeal.stage.name}</span>}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        {appeal.user.name} • {formatDate(appeal.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm">{appeal._count?.messages || 0}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Форма создания обращения */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Новое обращение</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Объект *</Label>
                <Select
                  value={formData.objectId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, objectId: value, stageId: '' })
                  }
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

              <div className="space-y-2">
                <Label>Этап (опционально)</Label>
                <Select
                  value={formData.stageId}
                  onValueChange={(value) => setFormData({ ...formData, stageId: value })}
                  disabled={!formData.objectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите этап" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Без этапа</SelectItem>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Тип обращения *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as AppealType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUESTION">Вопрос</SelectItem>
                  <SelectItem value="PROBLEM">Проблема</SelectItem>
                  <SelectItem value="SUGGESTION">Предложение</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Тема *</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Краткое описание обращения"
              />
            </div>

            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Подробное описание вопроса или проблемы..."
                rows={4}
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
                {isSubmitting ? 'Создание...' : 'Создать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
