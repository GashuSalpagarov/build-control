'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usePageHeader } from '@/hooks/use-page-header';
import { contractorsApi } from '@/lib/api';
import { Contractor } from '@/lib/types';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
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
      <main className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">Название</TableHead>
                <TableHead className="text-xs w-[150px]">ИНН</TableHead>
                <TableHead className="text-xs w-[150px]">Телефон</TableHead>
                <TableHead className="text-xs w-[100px]">Объектов</TableHead>
                {canManage && <TableHead className="text-xs w-[100px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell><div className="h-4 w-40 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-4 w-28 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-4 w-8 bg-muted rounded" /></TableCell>
                    {canManage && <TableCell><div className="h-4 w-16 bg-muted rounded ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : contractors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 5 : 4} className="h-24 text-center text-muted-foreground">
                    Подрядчики не найдены
                  </TableCell>
                </TableRow>
              ) : (
                contractors.map((contractor) => (
                  <TableRow key={contractor.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{contractor.name}</div>
                      {contractor.email && (
                        <div className="text-xs text-muted-foreground">{contractor.email}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{contractor.inn || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{contractor.phone || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{contractor._count?.objects || 0}</TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-1 justify-end">
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
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
