'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usePageHeader } from '@/hooks/use-page-header';
import { usersApi } from '@/lib/api';
import { UserWithAssignments, roleLabels, Role } from '@/lib/types';
import { Plus, Pencil, Trash2, UserCheck, UserX, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
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
  const { user, isLoading: authLoading, impersonate } = useAuth();
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

  const canManage = ['MINISTER', 'SUPERADMIN'].includes(user?.role || '');

  const headerAction = useMemo(() => {
    if (!canManage) return undefined;
    return (
      <Button onClick={() => { setEditingUser(null); setIsDialogOpen(true); }}>
        <Plus className="w-4 h-4 mr-2" />
        Добавить
      </Button>
    );
  }, [canManage]);

  usePageHeader({
    title: 'Пользователи',
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
                <TableHead className="text-xs">Пользователь</TableHead>
                <TableHead className="text-xs w-[180px]">Роль</TableHead>
                <TableHead className="text-xs w-[120px]">Объектов</TableHead>
                <TableHead className="text-xs w-[100px]">Статус</TableHead>
                <TableHead className="text-xs w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell><div className="h-4 w-40 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-4 w-8 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-4 w-16 bg-muted rounded" /></TableCell>
                    <TableCell><div className="h-4 w-16 bg-muted rounded ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Пользователи не найдены
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                      {u.phone && <div className="text-xs text-muted-foreground">{u.phone}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleLabels[u.role as Role] || u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u._count?.objectAssignments || 0}</TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Badge className="bg-green-100 text-green-700">Активен</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-500">Неактивен</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        {user.role === 'SUPERADMIN' && u.id !== user.id && u.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                await impersonate(u.id);
                                router.push('/objects');
                              } catch (err) {
                                console.error('Impersonation failed:', err);
                              }
                            }}
                            title="Войти как этот пользователь"
                          >
                            <Eye className="w-4 h-4 text-blue-500" />
                          </Button>
                        )}
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
