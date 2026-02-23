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
import { objectsApi, stagesApi, paymentsApi } from '@/lib/api';
import { ConstructionObject, Stage, Payment, PaymentObjectSummary } from '@/lib/types';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Plus, AlertTriangle } from 'lucide-react';

function formatCurrency(amount: number | undefined | null): string {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string) {
  const d = new Date(dateString);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

export default function AccountantPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string>('__none__');
  const [stages, setStages] = useState<Stage[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentObjectSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const headerAction = useMemo(() => (
    <Button
      onClick={() => setIsFormOpen(true)}
      disabled={selectedObjectId === '__none__'}
    >
      <Plus className="w-4 h-4 mr-2" />
      Добавить платёж
    </Button>
  ), [selectedObjectId]);

  usePageHeader({
    title: 'Платежи',
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
          const totalBudget = summary?.totalBudget || 0;
          const totalPaid = summary?.totalPaid || 0;
          const totalRemaining = summary?.totalRemaining || 0;
          const percentPaid = summary?.percentPaid || 0;
          return (
            <div className="flex items-center gap-6 mb-6 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Бюджет</span>
                <span className="font-semibold text-foreground">{formatCurrency(totalBudget)}</span>
              </div>
              <span className="text-muted-foreground/30">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Оплачено</span>
                <span className="font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
              </div>
              <span className="text-muted-foreground/30">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Остаток</span>
                <span className="font-semibold text-foreground">{formatCurrency(totalRemaining)}</span>
              </div>
              <span className="text-muted-foreground/30">|</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Освоено</span>
                <span className={`font-semibold ${
                  percentPaid >= 80 ? 'text-green-600' :
                  percentPaid >= 40 ? 'text-yellow-600' : 'text-foreground'
                }`}>{percentPaid}%</span>
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      percentPaid >= 80 ? 'bg-green-500' :
                      percentPaid >= 40 ? 'bg-yellow-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(percentPaid, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Этапы со сводкой */}
        <div className="mb-6">
          <h3 className="font-semibold text-sm text-foreground mb-2">Этапы</h3>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Этап</TableHead>
                  <TableHead className="text-xs text-right">Оплачено</TableHead>
                  <TableHead className="text-xs text-right">Бюджет</TableHead>
                  <TableHead className="text-xs text-right">Остаток</TableHead>
                  <TableHead className="text-xs text-center">Платежей</TableHead>
                  <TableHead className="text-xs text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary && summary.stages.length > 0 ? (
                  summary.stages.map((stage) => (
                    <TableRow key={stage.stageId}>
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">{stage.stageName}</div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-green-600 font-medium">
                        {formatCurrency(stage.paid)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatCurrency(stage.budget)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatCurrency(stage.remaining)}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {stage.paymentsCount}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`text-xs min-w-[42px] justify-center ${
                            stage.percentPaid >= 100
                              ? 'bg-green-100 text-green-700'
                              : stage.percentPaid >= 50
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {stage.percentPaid}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {selectedObjectId === '__none__' ? 'Выберите объект' : 'Этапов нет'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Список платежей */}
        <h3 className="font-semibold text-sm text-foreground mb-2">История платежей</h3>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px] text-xs">№</TableHead>
                <TableHead className="text-xs">Этап</TableHead>
                <TableHead className="text-xs">Дата</TableHead>
                <TableHead className="text-xs">Автор</TableHead>
                <TableHead className="text-xs">Комментарий</TableHead>
                <TableHead className="text-xs text-right">Сумма</TableHead>
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
                      <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-40 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-20 bg-muted rounded ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {selectedObjectId === '__none__' ? 'Выберите объект' : 'Платежей нет'}
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment, index) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-foreground">{payment.stage.name}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(payment.date)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{payment.user.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {payment.comment || '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-green-600 whitespace-nowrap">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
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
