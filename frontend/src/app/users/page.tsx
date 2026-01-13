'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usersApi } from '@/lib/api';
import { UserWithAssignments, roleLabels, Role } from '@/lib/types';
import { Plus, Pencil, Trash2, Users, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserFormDialog } from '@/components/users/user-form-dialog';
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

export default function UsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithAssignments[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithAssignments | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithAssignments | null>(null);

  const loadUsers = useCallback(() => {
    if (user) {
      setIsLoading(true);
      usersApi
        .getAll()
        .then(setUsers)
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
    loadUsers();
  }, [loadUsers]);

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      await usersApi.delete(deletingUser.id);
      loadUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingUser(null);
    }
  };

  const handleToggleActive = async (targetUser: UserWithAssignments) => {
    try {
      await usersApi.update(targetUser.id, { isActive: !targetUser.isActive });
      loadUsers();
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  const canManage = ['MINISTER', 'SUPERADMIN'].includes(user.role);

  return (
    <div className="flex-1 bg-background">
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Пользователи</h2>
            <p className="text-sm text-gray-500">Управление пользователями системы</p>
          </div>
          {canManage && (
            <Button onClick={() => { setEditingUser(null); setIsDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить
            </Button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_180px_120px_100px_100px] gap-4 px-6 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div>Пользователь</div>
            <div>Роль</div>
            <div>Объектов</div>
            <div>Статус</div>
            <div></div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Загрузка...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              Пользователи не найдены
            </div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-[1fr_180px_120px_100px_100px] gap-4 px-6 py-4 border-b last:border-b-0 items-center hover:bg-gray-50"
              >
                <div>
                  <div className="font-semibold text-gray-900">{u.name}</div>
                  <div className="text-sm text-gray-500">{u.email}</div>
                  {u.phone && <div className="text-sm text-gray-400">{u.phone}</div>}
                </div>
                <div>
                  <Badge variant="outline">{roleLabels[u.role as Role] || u.role}</Badge>
                </div>
                <div className="text-gray-600">{u._count?.objectAssignments || 0}</div>
                <div>
                  {u.isActive ? (
                    <Badge className="bg-green-100 text-green-700">Активен</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-500">Неактивен</Badge>
                  )}
                </div>
                <div className="flex gap-1 justify-end">
                  {canManage && u.id !== user.id && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(u)}
                        title={u.isActive ? 'Деактивировать' : 'Активировать'}
                      >
                        {u.isActive ? (
                          <UserX className="w-4 h-4 text-orange-500" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-green-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingUser(u); setIsDialogOpen(true); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingUser(u)}
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

      <UserFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        user={editingUser}
        onSuccess={loadUsers}
      />

      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить &quot;{deletingUser?.name}&quot;?
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
