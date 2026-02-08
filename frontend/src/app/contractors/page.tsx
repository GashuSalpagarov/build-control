'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usePageHeader } from '@/hooks/use-page-header';
import { contractorsApi } from '@/lib/api';
import { Contractor } from '@/lib/types';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContractorFormDialog } from '@/components/contractors/contractor-form-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ContractorsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [deletingContractor, setDeletingContractor] = useState<Contractor | null>(null);

  const loadContractors = useCallback(() => {
    if (user) {
      setIsLoading(true);
      contractorsApi
        .getAll()
        .then(setContractors)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    loadContractors();
  }, [loadContractors]);

  const handleDelete = async () => {
    if (!deletingContractor) return;
    try {
      await contractorsApi.delete(deletingContractor.id);
      loadContractors();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingContractor(null);
    }
  };

  const canManage = ['MINISTER', 'TECHNADZOR', 'SUPERADMIN'].includes(user?.role || '');

  const headerAction = useMemo(() => {
    if (!canManage) return undefined;
    return (
      <Button onClick={() => { setEditingContractor(null); setIsDialogOpen(true); }}>
        <Plus className="w-4 h-4 mr-2" />
        Добавить
      </Button>
    );
  }, [canManage]);

  usePageHeader({
    title: 'Подрядчики',
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
      <main className="max-w-5xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_150px_150px_150px_100px] gap-4 px-6 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div>Название</div>
            <div>ИНН</div>
            <div>Телефон</div>
            <div>Объектов</div>
            <div></div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Загрузка...</div>
          ) : contractors.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              Подрядчики не найдены
            </div>
          ) : (
            contractors.map((contractor) => (
              <div
                key={contractor.id}
                className="grid grid-cols-[1fr_150px_150px_150px_100px] gap-4 px-6 py-4 border-b last:border-b-0 items-center hover:bg-gray-50"
              >
                <div>
                  <div className="font-semibold text-gray-900">{contractor.name}</div>
                  {contractor.email && (
                    <div className="text-sm text-gray-500">{contractor.email}</div>
                  )}
                </div>
                <div className="text-gray-600">{contractor.inn || '—'}</div>
                <div className="text-gray-600">{contractor.phone || '—'}</div>
                <div className="text-gray-600">{contractor._count?.objects || 0}</div>
                <div className="flex gap-1 justify-end">
                  {canManage && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingContractor(contractor); setIsDialogOpen(true); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingContractor(contractor)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <ContractorFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        contractor={editingContractor}
        onSuccess={loadContractors}
      />

      <AlertDialog open={!!deletingContractor} onOpenChange={() => setDeletingContractor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить подрядчика?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить &quot;{deletingContractor?.name}&quot;?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
