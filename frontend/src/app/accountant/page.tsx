'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usePageHeader } from '@/hooks/use-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
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
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { Plus, AlertTriangle, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

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
  const [selectedObject, setSelectedObject] = useState<ConstructionObject | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentObjectSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

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

  // Загрузка данных при выборе объекта
  const loadObjectData = useCallback(async (objectId: string) => {
    setIsLoadingData(true);
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
      setIsLoadingData(false);
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

  // При выборе объекта — загрузить данные
  useEffect(() => {
    if (selectedObject) {
      loadObjectData(selectedObject.id);
    }
  }, [selectedObject, loadObjectData]);

  const handleSelectObject = (obj: ConstructionObject) => {
    setSelectedObject(obj);
    setStages([]);
    setPayments([]);
    setSummary(null);
  };

  const handleBack = () => {
    setSelectedObject(null);
    setStages([]);
    setPayments([]);
    setSummary(null);
  };

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
      if (selectedObject) {
        loadObjectData(selectedObject.id);
      }
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

  // Page header
  const headerAction = useMemo(() => {
    if (!selectedObject) return undefined;
    return (
      <Button onClick={() => setIsFormOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Добавить платёж
      </Button>
    );
  }, [selectedObject]);

  usePageHeader({
    title: selectedObject ? selectedObject.name : 'Платежи',
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
              <p className="text-lg">Объекты не найдены</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {objects.map((obj) => (
                <Card
                  key={obj.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => handleSelectObject(obj)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base leading-tight">{obj.name}</CardTitle>
                    {obj.address && (
                      <CardDescription className="mt-1">{obj.address}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- Режим 2: Этапы и платежи выбранного объекта ---
  return (
    <div className="flex-1 bg-background">
      <main className="max-w-7xl mx-auto p-4">
        {/* Навигация назад */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Назад
          </Button>
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
                {isLoadingData ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell><div className="h-4 w-32 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-20 bg-muted rounded ml-auto" /></TableCell>
                      <TableCell><div className="h-4 w-20 bg-muted rounded ml-auto" /></TableCell>
                      <TableCell><div className="h-4 w-20 bg-muted rounded ml-auto" /></TableCell>
                      <TableCell><div className="h-4 w-8 bg-muted rounded mx-auto" /></TableCell>
                      <TableCell><div className="h-4 w-10 bg-muted rounded mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : summary && summary.stages.length > 0 ? (
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
                      Этапов нет
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
              {isLoadingData ? (
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
                    Платежей нет
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
              <MoneyInput
                value={formData.amount}
                onChange={(v) => setFormData({ ...formData, amount: v })}
                allowDecimals
                placeholder="0"
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
