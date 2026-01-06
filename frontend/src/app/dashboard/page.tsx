'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { objectsApi } from '@/lib/api';
import {
  DashboardStats,
  statusLabels,
  statusColors,
} from '@/lib/types';
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wallet,
  Download,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import * as XLSX from 'xlsx';

function formatCurrency(amount: number): string {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: '#9ca3af',
  IN_PROGRESS: '#3b82f6',
  COMPLETED: '#22c55e',
  SUSPENDED: '#f59e0b',
};

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const data = await objectsApi.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // Проверяем роль
    if (user && !['MINISTER', 'GOVERNMENT', 'SUPERADMIN'].includes(user.role)) {
      router.push('/objects');
      return;
    }

    if (user) {
      loadStats();
    }
  }, [user, authLoading, router, loadStats]);

  const exportToExcel = () => {
    if (!stats) return;

    // Подготовка данных для экспорта
    const objectsData = stats.objects.map((obj) => ({
      'Название': obj.name,
      'Статус': statusLabels[obj.status],
      'Подрядчик': obj.contractor || '—',
      'Бюджет': obj.budget,
      'Оплачено': obj.paid,
      'Прогресс (%)': obj.progress,
      'План (%)': obj.plannedProgress,
      'Отклонение (%)': obj.deviation,
      'Этапов': obj.stagesCount,
      'Завершено этапов': obj.completedStages,
    }));

    const summaryData = [
      { 'Показатель': 'Всего объектов', 'Значение': stats.summary.totalObjects },
      { 'Показатель': 'В работе', 'Значение': stats.summary.inProgressObjects },
      { 'Показатель': 'Завершено', 'Значение': stats.summary.completedObjects },
      { 'Показатель': 'Проблемных', 'Значение': stats.summary.problemObjects },
      { 'Показатель': 'Средний прогресс (%)', 'Значение': stats.summary.averageProgress },
      { 'Показатель': 'Общий бюджет', 'Значение': stats.summary.totalBudget },
      { 'Показатель': 'Оплачено', 'Значение': stats.summary.totalPaid },
      { 'Показатель': 'Освоение бюджета (%)', 'Значение': stats.summary.budgetUtilization },
    ];

    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Сводка');

    const wsObjects = XLSX.utils.json_to_sheet(objectsData);
    XLSX.utils.book_append_sheet(wb, wsObjects, 'Объекты');

    XLSX.writeFile(wb, `dashboard_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-gray-500">Загрузка данных...</div>
        </main>
      </div>
    );
  }

  // Данные для графиков
  const statusChartData = [
    { name: 'Запланировано', value: stats.summary.plannedObjects, color: STATUS_COLORS.PLANNED },
    { name: 'В работе', value: stats.summary.inProgressObjects, color: STATUS_COLORS.IN_PROGRESS },
    { name: 'Завершено', value: stats.summary.completedObjects, color: STATUS_COLORS.COMPLETED },
    { name: 'Приостановлено', value: stats.summary.suspendedObjects, color: STATUS_COLORS.SUSPENDED },
  ].filter(d => d.value > 0);

  const progressChartData = stats.objects
    .filter(obj => obj.status === 'IN_PROGRESS')
    .slice(0, 10)
    .map(obj => ({
      name: obj.name.length > 20 ? obj.name.substring(0, 20) + '...' : obj.name,
      progress: obj.progress,
      plan: obj.plannedProgress,
    }));

  const contractorChartData = stats.contractors
    .filter(c => c.objectsCount > 0)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Дашборд</h2>
            <p className="text-sm text-gray-500">Сводная аналитика по объектам</p>
          </div>
          <Button onClick={exportToExcel} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Выгрузить в Excel
          </Button>
        </div>

        {/* Карточки статистики */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">Всего объектов</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.summary.totalObjects}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">В работе</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.summary.inProgressObjects}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Завершено</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats.summary.completedObjects}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Проблемных</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {stats.summary.problemObjects}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Ср. прогресс</span>
            </div>
            <div className="text-2xl font-bold text-indigo-600">
              {stats.summary.averageProgress}%
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-sm">Освоено</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {stats.summary.budgetUtilization}%
            </div>
          </div>
        </div>

        {/* Финансовая сводка */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-sm text-gray-500 mb-1">Общий бюджет</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.summary.totalBudget)}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-sm text-gray-500 mb-1">Оплачено</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.summary.totalPaid)}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-sm text-gray-500 mb-1">Остаток</div>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.summary.totalBudget - stats.summary.totalPaid)}
            </div>
          </div>
        </div>

        {/* Графики */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Статусы объектов */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Статусы объектов</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Прогресс объектов */}
          {progressChartData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Прогресс объектов в работе</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={progressChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="progress" name="Факт" fill="#6366f1" />
                  <Bar dataKey="plan" name="План" fill="#d1d5db" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Обращения и подрядчики */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Обращения */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Обращения</h3>
              <Link href="/appeals" className="text-sm text-indigo-600 hover:underline">
                Все обращения
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Всего</div>
                <div className="text-xl font-bold">{stats.appeals.total}</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600">Новых</div>
                <div className="text-xl font-bold text-blue-600">{stats.appeals.new}</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="text-sm text-yellow-600">В работе</div>
                <div className="text-xl font-bold text-yellow-600">{stats.appeals.inProgress}</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600">Решено</div>
                <div className="text-xl font-bold text-green-600">{stats.appeals.resolved}</div>
              </div>
            </div>
          </div>

          {/* Подрядчики */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Топ подрядчиков</h3>
              <Link href="/contractors" className="text-sm text-indigo-600 hover:underline">
                Все подрядчики
              </Link>
            </div>
            <div className="space-y-2">
              {contractorChartData.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-medium">
                      {i + 1}
                    </div>
                    <span className="text-sm font-medium">{c.name}</span>
                  </div>
                  <Badge variant="secondary">{c.objectsCount} объектов</Badge>
                </div>
              ))}
              {contractorChartData.length === 0 && (
                <div className="text-center text-gray-500 py-4">Нет данных</div>
              )}
            </div>
          </div>
        </div>

        {/* Таблица объектов */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Все объекты</h3>
            <Link href="/objects" className="text-sm text-indigo-600 hover:underline">
              Подробнее
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Объект</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Подрядчик</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Прогресс</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Отклонение</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Бюджет</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.objects.map((obj) => (
                  <tr key={obj.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/objects/${obj.id}`} className="font-medium text-indigo-600 hover:underline">
                        {obj.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusColors[obj.status]}>
                        {statusLabels[obj.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {obj.contractor || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              obj.progress >= 80 ? 'bg-green-500' :
                              obj.progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(obj.progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-10 text-right">{obj.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${
                        obj.deviation > 0 ? 'text-green-600' :
                        obj.deviation < -10 ? 'text-red-600' :
                        obj.deviation < 0 ? 'text-orange-600' : 'text-gray-600'
                      }`}>
                        {obj.deviation > 0 ? '+' : ''}{obj.deviation}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatCurrency(obj.budget)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
