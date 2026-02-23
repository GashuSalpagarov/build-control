'use client';

import { forwardRef, useImperativeHandle, useState, useEffect, useMemo, Dispatch } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usersApi } from '@/lib/api';
import { UserWithAssignments, Role, roleLabels } from '@/lib/types';
import { WizardUsersData } from './wizard-types';
import { Search, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { UserFormDialog } from '@/components/users/user-form-dialog';

export interface WizardStepUsersRef {
  validate: () => Promise<boolean>;
}

interface WizardStepUsersProps {
  data: WizardUsersData;
  dispatch: Dispatch<any>;
}

export const WizardStepUsers = forwardRef<WizardStepUsersRef, WizardStepUsersProps>(
  function WizardStepUsers({ data, dispatch }, ref) {
    const { user: currentUser } = useAuth();
    const [allUsers, setAllUsers] = useState<UserWithAssignments[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);

    const canCreateUsers = currentUser
      ? ['MINISTER', 'SUPERADMIN'].includes(currentUser.role)
      : false;

    const loadUsers = () => {
      usersApi.getAll().then(setAllUsers).catch(console.error);
    };

    useEffect(() => {
      loadUsers();
    }, []);

    const filteredUsers = useMemo(() => {
      const q = searchQuery.toLowerCase();
      return allUsers.filter(
        (u) =>
          u.isActive &&
          (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      );
    }, [allUsers, searchQuery]);

    useImperativeHandle(ref, () => ({
      validate: async () => true, // selection is optional
    }));

    const handleUserCreated = (created: UserWithAssignments) => {
      setAllUsers((prev) => [...prev, created]);
      dispatch({ type: 'TOGGLE_SELECTED_USER', userId: created.id });
    };

    return (
      <div className="space-y-4">
        {/* Select existing users */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Назначить существующих пользователей</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени или email..."
              className="pl-9 text-sm"
            />
          </div>

          <div className="max-h-[200px] overflow-y-auto border rounded-lg">
            {filteredUsers.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                {searchQuery ? 'Пользователи не найдены' : 'Нет доступных пользователей'}
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = data.selectedUserIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-accent cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() =>
                        dispatch({ type: 'TOGGLE_SELECTED_USER', userId: u.id })
                      }
                      className="rounded border-input text-primary focus:ring-ring"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{u.name}</div>
                      <div className="text-xs text-gray-500 truncate">{u.email}</div>
                    </div>
                    <Badge className="bg-gray-100 text-gray-600 text-xs">
                      {roleLabels[u.role as Role] || u.role}
                    </Badge>
                  </label>
                );
              })
            )}
          </div>

          {data.selectedUserIds.length > 0 && (
            <p className="text-xs text-gray-500">
              Выбрано: {data.selectedUserIds.length}
            </p>
          )}
        </div>

        {/* Create new user button (only for MINISTER/SUPERADMIN) */}
        {canCreateUsers && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Создать нового пользователя
          </Button>
        )}

        <p className="text-xs text-gray-400">
          Этот шаг необязательный — можно пропустить и назначить пользователей позже
        </p>

        <UserFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={loadUsers}
          onCreated={handleUserCreated}
        />
      </div>
    );
  }
);
