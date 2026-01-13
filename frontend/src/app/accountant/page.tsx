'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
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
import { objectsApi, stagesApi, paymentsApi } from '@/lib/api';
import { ConstructionObject, Stage, Payment, PaymentObjectSummary } from '@/lib/types';
import { Plus, Calendar, DollarSign, AlertTriangle } from 'lucide-react';

function formatCurrency(amount: number | undefined | null): string {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function AccountantPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string>('__none__');
  const [stages, setStages] = useState<Stage[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentObjectSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Форма платежа
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    stageId: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
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
      setPayments([]);
      setSummary(null);
      return;
    }

    setIsLoading(true);
    try {
      const [stagesData, paymentsData, summaryData] = await Promise.all([
        stagesApi.getByObject(objectId),
        paymentsApi.getAll({ objectId }),
        paymentsApi.getSummaryByObject(objectId),
      ]);
      setStages(stagesData);
      setPayments(paymentsData);
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
    if (user && !['ACCOUNTANT', 'MINISTER', 'SUPERADMIN'].includes(user.role)) {
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
    if (!formData.stageId || !formData.amount) {
      setFormError('Заполните обязательные поля');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await paymentsApi.create({
        stageId: formData.stageId,
        date: formData.date,
        amount: parseFloat(formData.amount),
        comment: formData.comment || undefined,
      });

      setIsFormOpen(false);
      setFormData({
        stageId: '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        comment: '',
      });
      loadObjectData(selectedObjectId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Проверка переплаты
  const getStageRemaining = (stageId: string): number => {
    const stageSummary = summary?.stages.find((s) => s.stageId === stageId);
    return stageSummary?.remaining || 0;
  };

  const isOverpayment = formData.stageId && formData.amount
    ? parseFloat(formData.amount) > getStageRemaining(formData.stageId)
    : false;

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
            <h2 className="text-xl font-semibold text-gray-900">Платежи</h2>
            <p className="text-sm text-gray-500">Управление платежами по объектам</p>
          </div>
          <Button
            onClick={() => setIsFormOpen(true)}
            disabled={selectedObjectId === '__none__'}
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить платёж
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <div className="text-sm text-gray-500 mb-1">Общий бюджет</div>
                  <div className="text-2xl font-bold text-gray-700">
                    {formatCurrency(summary.totalBudget)}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <div className="text-sm text-gray-500 mb-1">Оплачено</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(summary.totalPaid)}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <div className="text-sm text-gray-500 mb-1">Остаток</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(summary.totalRemaining)}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <div className="text-sm text-gray-500 mb-1">Освоено</div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {summary.percentPaid}%
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
                      <div>
                        <div className="font-medium">{stage.stageName}</div>
                        <div className="text-sm text-gray-500">
                          {stage.paymentsCount} платеж(ей)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          <span className="text-green-600 font-medium">
                            {formatCurrency(stage.paid)}
                          </span>
                          {' / '}
                          <span className="text-gray-500">
                            {formatCurrency(stage.budget)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Остаток: {formatCurrency(stage.remaining)}
                        </div>
                        <Badge
                          className={`mt-1 ${
                            stage.percentPaid >= 100
                              ? 'bg-green-100 text-green-700'
                              : stage.percentPaid >= 50
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {stage.percentPaid}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Список платежей */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700">
                История платежей
              </div>
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Загрузка...</div>
              ) : payments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Платежей нет</div>
              ) : (
                <div className="divide-y">
                  {payments.map((payment) => (
                    <div key={payment.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{payment.stage.name}</div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(payment.date)}
                            </span>
                            <span>{payment.user.name}</span>
                          </div>
                          {payment.comment && (
                            <div className="text-sm text-gray-500 mt-1">
                              {payment.comment}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600 flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {formatCurrency(payment.amount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Форма добавления платежа */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Добавить платёж</DialogTitle>
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
                  Остаток: {formatCurrency(getStageRemaining(formData.stageId))}
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
              <Label>Сумма (руб.) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
              {isOverpayment && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Внимание: сумма превышает остаток по этапу!
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Комментарий</Label>
              <Textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Дополнительная информация..."
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
