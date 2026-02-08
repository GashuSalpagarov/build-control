'use client';

import { forwardRef, useImperativeHandle, useState, useEffect, useMemo, Dispatch } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usersApi } from '@/lib/api';
import { UserWithAssignments, Role, roleLabels } from '@/lib/types';
import { WizardUsersData, WizardNewUser } from './wizard-types';
import { Plus, Trash2, Search, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export interface WizardStepUsersRef {
  validate: () => Promise<boolean>;
}

interface WizardStepUsersProps {
  data: WizardUsersData;
  dispatch: Dispatch<any>;
}

const assignableRoles: Role[] = ['MINISTER', 'TECHNADZOR', 'ACCOUNTANT', 'INSPECTOR', 'CONTRACTOR', 'GOVERNMENT'];

export const WizardStepUsers = forwardRef<WizardStepUsersRef, WizardStepUsersProps>(
  function WizardStepUsers({ data, dispatch }, ref) {
    const { user: currentUser } = useAuth();
    const [allUsers, setAllUsers] = useState<UserWithAssignments[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState('');

    const canCreateUsers = currentUser
      ? ['MINISTER', 'SUPERADMIN'].includes(currentUser.role)
      : false;

    useEffect(() => {
      usersApi.getAll().then(setAllUsers).catch(console.error);
    }, []);

    const filteredUsers = useMemo(() => {
      const q = searchQuery.toLowerCase();
      return allUsers.filter(
        (u) =>
          u.isActive &&
          (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      );
    }, [allUsers, searchQuery]);

    // Group by role
    const groupedUsers = useMemo(() => {
      const groups: Record<string, UserWithAssignments[]> = {};
      for (const u of filteredUsers) {
        if (!groups[u.role]) groups[u.role] = [];
        groups[u.role].push(u);
      }
      return groups;
    }, [filteredUsers]);

    useImperativeHandle(ref, () => ({
      validate: async () => {
        setError('');
        // Validate new users
        for (const u of data.newUsers) {
          if (!u.name.trim()) {
            setError('Заполните имя для всех новых пользователей');
            return false;
          }
          if (!u.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email)) {
            setError(`Некорректный email: ${u.email || '(пусто)'}`);
            return false;
          }
          if (!u.password || u.password.length < 6) {
            setError(`Пароль должен быть минимум 6 символов (${u.name || u.email})`);
            return false;
          }
          if (!u.role) {
            setError('Выберите роль для всех новых пользователей');
            return false;
          }
        }
        return true;
      },
    }));

    const addNewUser = () => {
      dispatch({
        type: 'ADD_NEW_USER',
        user: {
          tempId: crypto.randomUUID(),
          name: '',
          email: '',
          password: '',
          phone: '',
          role: 'INSPECTOR',
        },
      });
    };

    return (
      <div className="space-y-4">
        {/* Section 1: Select existing users */}
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
            {Object.keys(groupedUsers).length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                {searchQuery ? 'Пользователи не найдены' : 'Нет доступных пользователей'}
              </div>
            ) : (
              Object.entries(groupedUsers).map(([role, users]) => (
                <div key={role}>
                  <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky top-0">
                    {roleLabels[role as Role] || role}
                  </div>
                  {users.map((u) => {
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
                  })}
                </div>
              ))
            )}
          </div>

          {data.selectedUserIds.length > 0 && (
            <p className="text-xs text-gray-500">
              Выбрано: {data.selectedUserIds.length}
            </p>
          )}
        </div>

        {/* Section 2: Create new users (only for MINISTER/SUPERADMIN) */}
        {canCreateUsers && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Создать нового пользователя</Label>
              <Button type="button" variant="outline" size="sm" onClick={addNewUser}>
                <UserPlus className="w-4 h-4 mr-1" />
                Добавить
              </Button>
            </div>

            {data.newUsers.length === 0 ? (
              <p className="text-xs text-gray-500">
                Можно создать нового пользователя и сразу назначить на объект
              </p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {data.newUsers.map((newUser) => (
                  <NewUserCard
                    key={newUser.tempId}
                    user={newUser}
                    onUpdate={(field, value) =>
                      dispatch({
                        type: 'UPDATE_NEW_USER',
                        tempId: newUser.tempId,
                        data: { [field]: value },
                      })
                    }
                    onRemove={() =>
                      dispatch({ type: 'REMOVE_NEW_USER', tempId: newUser.tempId })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <p className="text-xs text-gray-400">
          Этот шаг необязательный — можно пропустить и назначить пользователей позже
        </p>
      </div>
    );
  }
);

function NewUserCard({
  user,
  onUpdate,
  onRemove,
}: {
  user: WizardNewUser;
  onUpdate: (field: keyof WizardNewUser, value: string) => void;
  onRemove: () => void;
}) {
  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Новый пользователь</span>
        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onRemove}>
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Имя *</Label>
          <Input
            value={user.name}
            onChange={(e) => onUpdate('name', e.target.value)}
            placeholder="ФИО"
            className="text-sm h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email *</Label>
          <Input
            type="email"
            value={user.email}
            onChange={(e) => onUpdate('email', e.target.value)}
            placeholder="user@example.com"
            className="text-sm h-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Пароль *</Label>
          <Input
            type="password"
            value={user.password}
            onChange={(e) => onUpdate('password', e.target.value)}
            placeholder="******"
            className="text-sm h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Телефон</Label>
          <Input
            value={user.phone}
            onChange={(e) => onUpdate('phone', e.target.value)}
            placeholder="+7..."
            className="text-sm h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Роль *</Label>
          <Select value={user.role} onValueChange={(v) => onUpdate('role', v)}>
            <SelectTrigger className="text-sm h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assignableRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {roleLabels[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
