'use client';

import { useEffect, ReactNode } from 'react';
import { usePageHeaderContext } from '@/contexts/page-header-context';

interface UsePageHeaderOptions {
  title: string;
  action?: ReactNode;
}

export function usePageHeader({ title, action }: UsePageHeaderOptions) {
  const { setHeaderData } = usePageHeaderContext();

  useEffect(() => {
    setHeaderData({ title, action });

    // Обновляем title вкладки браузера
    const previousTitle = document.title;
    document.title = `${title} | Контроль строительства`;

    return () => {
      setHeaderData(null);
      document.title = previousTitle;
    };
  }, [title, action, setHeaderData]);
}
