'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { stagesApi } from '@/lib/api';
import { Stage, StageScheduleChange } from '@/lib/types';
import { History, ArrowRight, User, Calendar } from 'lucide-react';

interface ScheduleHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: Stage | null;
}

export function ScheduleHistoryDialog({
  open,
  onOpenChange,
  stage,
}: ScheduleHistoryDialogProps) {
  const [history, setHistory] = useState<StageScheduleChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && stage) {
      setIsLoading(true);
      stagesApi
        .getScheduleHistory(stage.id)
        .then(setHistory)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [open, stage]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'не указана';
    return new Date(dateStr).toLocaleDateString('ru-RU');
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            История изменений сроков
          </DialogTitle>
          <DialogDescription>
            {stage?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Загрузка...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>История изменений пуста</p>
              <p className="text-sm mt-1">Сроки этапа ещё не менялись</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((change, index) => (
                <div
                  key={change.id}
                  className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                >
                  {/* Header with date and user */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <User className="w-4 h-4" />
                      <span className="font-medium text-gray-700">{change.user.name}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatDateTime(change.createdAt)}
                    </div>
                  </div>

                  {/* Date changes */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    {/* Start date */}
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500 font-medium">Дата начала</div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={change.oldStartDate !== change.newStartDate ? 'text-red-500 line-through' : 'text-gray-600'}>
                          {formatDate(change.oldStartDate)}
                        </span>
                        {change.oldStartDate !== change.newStartDate && (
                          <>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className="text-green-600 font-medium">
                              {formatDate(change.newStartDate)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* End date */}
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500 font-medium">Дата окончания</div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={change.oldEndDate !== change.newEndDate ? 'text-red-500 line-through' : 'text-gray-600'}>
                          {formatDate(change.oldEndDate)}
                        </span>
                        {change.oldEndDate !== change.newEndDate && (
                          <>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className="text-green-600 font-medium">
                              {formatDate(change.newEndDate)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-xs text-gray-500 mb-1">Причина:</div>
                    <div className="text-sm text-gray-700">{change.reason}</div>
                  </div>

                  {/* Number indicator */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium hidden">
                    {history.length - index}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
