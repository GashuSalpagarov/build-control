'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { usePageHeader } from '@/hooks/use-page-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { appealsApi } from '@/lib/api';
import {
  Appeal,
  AppealMessage,
  AppealStatus,
  appealStatusLabels,
  appealStatusColors,
  appealTypeLabels,
  appealTypeColors,
} from '@/lib/types';
import { ArrowLeft, Send, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AppealDetailPage() {
  const { id } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const loadAppeal = useCallback(async () => {
    if (!user || !id) return;

    setIsLoading(true);
    try {
      const data = await appealsApi.getOne(id as string);
      setAppeal(data);
    } catch (err) {
      console.error('Error loading appeal:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadAppeal();
    }
  }, [user, authLoading, router, loadAppeal]);

  useEffect(() => {
    // Прокрутка к последнему сообщению
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [appeal?.messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !appeal) return;

    setIsSending(true);
    try {
      await appealsApi.addMessage(appeal.id, newMessage.trim());
      setNewMessage('');
      loadAppeal();
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (status: AppealStatus) => {
    if (!appeal) return;

    try {
      await appealsApi.updateStatus(appeal.id, status);
      loadAppeal();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const getStatusIcon = (status: AppealStatus) => {
    switch (status) {
      case 'NEW':
        return <AlertCircle className="w-4 h-4" />;
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4" />;
      case 'RESOLVED':
        return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4" />;
    }
  };

  usePageHeader({
    title: appeal?.subject || 'Загрузка...',
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 bg-background">
        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-gray-500">Загрузка...</div>
        </main>
      </div>
    );
  }

  if (!appeal) {
    return (
      <div className="flex-1 bg-background">
        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-gray-500">Обращение не найдено</div>
        </main>
      </div>
    );
  }

  const canChangeStatus = ['MINISTER', 'SUPERADMIN'].includes(user.role);
  const canSendMessage = ['CONTRACTOR', 'INSPECTOR', 'TECHNADZOR', 'ACCOUNTANT', 'MINISTER', 'SUPERADMIN'].includes(user.role);

  return (
    <div className="flex-1 bg-background">
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Навигация */}
        <Link
          href="/appeals"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          К списку обращений
        </Link>

        {/* Заголовок обращения */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={appealTypeColors[appeal.type]}>
                  {appealTypeLabels[appeal.type]}
                </Badge>
                <Badge className={appealStatusColors[appeal.status]}>
                  {getStatusIcon(appeal.status)}
                  <span className="ml-1">{appealStatusLabels[appeal.status]}</span>
                </Badge>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                {appeal.subject}
              </h1>
              {appeal.description && (
                <p className="text-gray-600 mb-4">{appeal.description}</p>
              )}
              <div className="text-sm text-gray-500">
                <p>
                  <span className="font-medium">Объект:</span> {appeal.object.name}
                  {appeal.stage && <span> • {appeal.stage.name}</span>}
                </p>
                <p>
                  <span className="font-medium">Автор:</span> {appeal.user.name} ({appeal.user.email})
                </p>
                <p>
                  <span className="font-medium">Создано:</span> {formatDate(appeal.createdAt)}
                </p>
              </div>
            </div>

            {/* Изменение статуса */}
            {canChangeStatus && (
              <div className="w-48">
                <Select value={appeal.status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">Новое</SelectItem>
                    <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                    <SelectItem value="RESOLVED">Решено</SelectItem>
                    <SelectItem value="REJECTED">Отклонено</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Переписка */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700">
            Переписка
          </div>

          {/* Сообщения */}
          <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
            {!appeal.messages || appeal.messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Сообщений пока нет
              </div>
            ) : (
              appeal.messages.map((message: AppealMessage) => {
                const isOwn = message.userId === user.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isOwn
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {!isOwn && (
                        <div className={`text-xs font-medium mb-1 ${isOwn ? 'text-indigo-200' : 'text-gray-500'}`}>
                          {message.user.name}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{message.text}</div>
                      <div className={`text-xs mt-1 ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Форма отправки */}
          {canSendMessage && (
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Введите сообщение..."
                  rows={2}
                  className="flex-1 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !newMessage.trim()}
                  className="self-end"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Enter для отправки, Shift+Enter для новой строки
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
