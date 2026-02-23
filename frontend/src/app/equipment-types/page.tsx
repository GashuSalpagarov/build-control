'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usePageHeader } from '@/hooks/use-page-header';
import { equipmentTypesApi } from '@/lib/api';
import { EquipmentType } from '@/lib/types';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
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

export default function EquipmentTypesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingType, setDeletingType] = useState<EquipmentType | null>(null);

  const loadEquipmentTypes = useCallback(() => {
    if (user) {
      setIsLoading(true);
      equipmentTypesApi
        .getAll()
        .then(setEquipmentTypes)
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
    loadEquipmentTypes();
  }, [loadEquipmentTypes]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await equipmentTypesApi.create(newName.trim());
      setNewName('');
      setIsAdding(false);
      loadEquipmentTypes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await equipmentTypesApi.update(id, editingName.trim());
      setEditingId(null);
      setEditingName('');
      loadEquipmentTypes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deletingType) return;
    try {
      await equipmentTypesApi.delete(deletingType.id);
      loadEquipmentTypes();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingType(null);
    }
  };

  const startEditing = (type: EquipmentType) => {
    setEditingId(type.id);
    setEditingName(type.name);
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const canManage = ['MINISTER', 'TECHNADZOR', 'SUPERADMIN'].includes(user?.role || '');

  const headerAction = useMemo(() => {
    if (!canManage || isAdding) return undefined;
    return (
      <Button onClick={() => { setIsAdding(true); setEditingId(null); }}>
        <Plus className="w-4 h-4 mr-2" />
        Добавить
      </Button>
    );
  }, [canManage, isAdding]);

  usePageHeader({
    title: 'Техника',
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
        {isAdding && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-blue-50">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Название типа техники"
              className="flex-1"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button size="sm" onClick={handleAdd}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setNewName(''); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">Название</TableHead>
                {canManage && <TableHead className="text-xs w-[100px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell><div className="h-4 w-48 bg-muted rounded" /></TableCell>
                    {canManage && <TableCell><div className="h-4 w-16 bg-muted rounded ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : equipmentTypes.length === 0 && !isAdding ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 2 : 1} className="h-24 text-center text-muted-foreground">
                    Типы техники не найдены
                  </TableCell>
                </TableRow>
              ) : (
                equipmentTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>
                      {editingId === type.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdate(type.id);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                          />
                          <Button size="sm" onClick={() => handleUpdate(type.id)}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEditing}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm font-medium">{type.name}</span>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        {editingId !== type.id && (
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => startEditing(type)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeletingType(type)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <AlertDialog open={!!deletingType} onOpenChange={() => setDeletingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить тип техники?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить &quot;{deletingType?.name}&quot;?
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
