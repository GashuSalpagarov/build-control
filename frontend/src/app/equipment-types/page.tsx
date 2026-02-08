'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usePageHeader } from '@/hooks/use-page-header';
import { equipmentTypesApi } from '@/lib/api';
import { EquipmentType } from '@/lib/types';
import { Plus, Pencil, Trash2, Truck, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      <main className="max-w-3xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {isAdding && (
            <div className="flex items-center gap-2 px-6 py-4 border-b bg-blue-50">
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

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Загрузка...</div>
          ) : equipmentTypes.length === 0 && !isAdding ? (
            <div className="p-8 text-center text-gray-500">
              <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              Типы техники не найдены
            </div>
          ) : (
            equipmentTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-center gap-4 px-6 py-4 border-b last:border-b-0 hover:bg-gray-50"
              >
                {editingId === type.id ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <Truck className="w-5 h-5 text-gray-400" />
                    <span className="flex-1 font-medium text-gray-900">{type.name}</span>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEditing(type)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeletingType(type)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
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
