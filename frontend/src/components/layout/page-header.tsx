'use client';

import { usePageHeaderContext } from '@/contexts/page-header-context';

export function PageHeader() {
  const { headerData } = usePageHeaderContext();

  if (!headerData) {
    return null;
  }

  return (
    <div className="flex flex-1 items-center justify-between px-4">
      <h1 className="text-lg font-semibold text-primary-foreground">{headerData.title}</h1>
      {headerData.action && (
        <div className="flex items-center gap-2">
          {headerData.action}
        </div>
      )}
    </div>
  );
}
