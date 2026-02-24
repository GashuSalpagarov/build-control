'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Mail, Lock, Building2, Shield, Eye, Calculator, ClipboardCheck, HardHat, Briefcase, Users, ChevronDown } from 'lucide-react';

const TEST_USERS = [
  {
    email: 'admin@build-control.ru',
    password: 'admin123',
    role: 'Суперадмин',
    name: 'Суперадмин',
    icon: Shield,
  },
  {
    email: 'minister@kchr.ru',
    password: 'minister123',
    role: 'Министр',
    name: 'Министр строительства',
    icon: Building2,
  },
  {
    email: 'government@kchr.ru',
    password: 'gov123',
    role: 'Правительство',
    name: 'Представитель правительства',
    icon: Eye,
  },
  {
    email: 'accountant@kchr.ru',
    password: 'acc123',
    role: 'Бухгалтер',
    name: 'Бухгалтер',
    icon: Calculator,
  },
  {
    email: 'technadzor@kchr.ru',
    password: 'tech123',
    role: 'Технадзор',
    name: 'Технический надзор',
    icon: ClipboardCheck,
  },
  {
    email: 'inspector@kchr.ru',
    password: 'insp123',
    role: 'Проверяющий',
    name: 'Проверяющий',
    icon: HardHat,
  },
  {
    email: 'contractor@kchr.ru',
    password: 'contr123',
    role: 'Подрядчик',
    name: 'Подрядчик',
    icon: Briefcase,
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      setDebugLog(prev => [...prev, `API: ${process.env.NEXT_PUBLIC_API_URL || 'не задан'}`, `Login: ${email}`]);
      await login(email, password);
      router.push('/objects');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setDebugLog(prev => [...prev, `Error: ${msg}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (userEmail: string, userPassword: string) => {
    setError('');
    setIsLoading(true);

    try {
      setDebugLog(prev => [...prev, `API: ${process.env.NEXT_PUBLIC_API_URL || 'не задан'}`, `QuickLogin: ${userEmail}`]);
      await login(userEmail, userPassword);
      router.push('/objects');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setDebugLog(prev => [...prev, `Error: ${msg}`]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-primary text-primary-foreground shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight leading-none text-primary">
              <div>Контроль</div>
              <div>строительства</div>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="pl-9"
                  required
                />
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? 'Вход...' : 'Войти'}
            </Button>
          </form>

          {(
            <div className="pt-4 border-t">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Быстрый вход</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {TEST_USERS.map((user) => {
                    const IconComponent = user.icon;
                    return (
                      <DropdownMenuItem
                        key={user.email}
                        onSelect={(e) => {
                          e.preventDefault();
                          handleQuickLogin(user.email, user.password);
                        }}
                        className="cursor-pointer py-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                            <IconComponent className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {user.name}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {user.role}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </CardContent>
      </Card>
      {debugLog.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 text-green-400 text-xs font-mono p-3 max-h-40 overflow-auto">
          {debugLog.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
