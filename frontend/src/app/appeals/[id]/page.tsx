'use client';

import { useEffect, useState, useCallback, useRef, ChangeEvent } from 'react';
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
  Attachment,
  AppealStatus,
  appealStatusLabels,
  appealStatusColors,
  appealTypeLabels,
  appealTypeColors,
} from '@/lib/types';
import { ArrowLeft, Send, Clock, AlertCircle, CheckCircle, XCircle, Paperclip, Download, Trash2, FileText, Image as ImageIcon } from 'lucide-react';

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

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function getFileIcon(mimeType?: string) {
  if (mimeType?.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
  return <FileText className="w-5 h-5 text-gray-500" />;
}

const ALLOWED_FILE_TYPES = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function AppealDetailPage() {
  const { id } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !appeal) return;

    setUploadError('');

    // Валидация размера на клиенте
    const oversized = Array.from(files).find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      setUploadError(`Файл "${oversized.name}" превышает максимальный размер 10 МБ`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      await appealsApi.uploadAttachments(appeal.id, Array.from(files));
      loadAppeal();
    } catch (err: any) {
      setUploadError(err.message || 'Ошибка загрузки файлов');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await appealsApi.deleteAttachment(attachmentId);
      loadAppeal();
    } catch (err) {
      console.error('Error deleting attachment:', err);
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
        <main className="max-w-7xl mx-auto p-4">
          <div className="text-gray-500">Загрузка...</div>
        </main>
      </div>
    );
  }

  if (!appeal) {
    return (
      <div className="flex-1 bg-background">
        <main className="max-w-7xl mx-auto p-4">
          <div className="text-gray-500">Обращение не найдено</div>
        </main>
      </div>
    );
  }

  const canChangeStatus = ['MINISTER', 'SUPERADMIN'].includes(user.role);
  const canSendMessage = ['CONTRACTOR', 'TECHNADZOR', 'MINISTER', 'SUPERADMIN'].includes(user.role);
  const canUploadFiles = ['CONTRACTOR', 'INSPECTOR', 'TECHNADZOR', 'ACCOUNTANT', 'MINISTER', 'SUPERADMIN'].includes(user.role);
  const canDeleteAttachment = (attachment: Attachment) =>
    appeal.userId === user.id || ['SUPERADMIN', 'MINISTER'].includes(user.role);

  return (
    <div className="flex-1 bg-background">
      <main className="max-w-7xl mx-auto p-4">
        {/* Навигация */}
        <Link
          href="/appeals"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          К списку обращений
        </Link>

        <div className="flex flex-col lg:flex-row gap-4">
        {/* Левая колонка: информация + вложения */}
        <div className="lg:w-1/2">
        {/* Заголовок обращения */}
        <div className="pb-4">
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
                <p className="text-gray-600 mb-2">{appeal.description}</p>
              )}
              <p className="text-sm text-gray-500">
                {appeal.object.name}{appeal.stage && <span> • {appeal.stage.name}</span>}
                <span className="mx-2">•</span>
                {appeal.user.name} ({appeal.user.email})
                <span className="mx-2">•</span>
                {formatDate(appeal.createdAt)}
              </p>
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

        {/* Вложения */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Вложения
              {appeal.attachments && appeal.attachments.length > 0 && (
                <span className="text-gray-400">({appeal.attachments.length})</span>
              )}
            </h2>
            {canUploadFiles && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_FILE_TYPES}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Paperclip className="w-4 h-4 mr-1" />
                  {isUploading ? 'Загрузка...' : 'Прикрепить файл'}
                </Button>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="text-sm text-red-600 mb-3 bg-red-50 rounded-lg px-3 py-2">
              {uploadError}
            </div>
          )}

          {!appeal.attachments || appeal.attachments.length === 0 ? (
            <p className="text-sm text-gray-400">Нет вложений</p>
          ) : (
            <div className="space-y-2">
              {appeal.attachments.map((attachment) => {
                const url = appealsApi.getAttachmentUrl(attachment.path);
                const isImage = attachment.mimeType?.startsWith('image/');
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:bg-gray-50"
                  >
                    {isImage ? (
                      <img
                        src={url}
                        alt={attachment.filename}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      getFileIcon(attachment.mimeType)
                    )}
                    <div className="flex-1 min-w-0">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:underline truncate block"
                      >
                        {attachment.filename}
                      </a>
                      <span className="text-xs text-gray-400">
                        {formatFileSize(attachment.size)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      {canDeleteAttachment(attachment) && (
                        <button
                          onClick={() => handleDeleteAttachment(attachment.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>

        {/* Правая колонка: переписка */}
        <div className="lg:w-1/2">
        {/* Переписка */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
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
              <div className="flex items-end gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  placeholder="Введите сообщение..."
                  rows={1}
                  className="flex-1 resize-none min-h-0 overflow-hidden"
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
        </div>
        </div>
      </main>
    </div>
  );
}
