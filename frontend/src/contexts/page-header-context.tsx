'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface PageHeaderData {
  title: string;
  action?: ReactNode;
}

interface PageHeaderContextType {
  headerData: PageHeaderData | null;
  setHeaderData: (data: PageHeaderData | null) => void;
}

const PageHeaderContext = createContext<PageHeaderContextType | undefined>(undefined);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [headerData, setHeaderData] = useState<PageHeaderData | null>(null);

  return (
    <PageHeaderContext.Provider value={{ headerData, setHeaderData }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeaderContext() {
  const context = useContext(PageHeaderContext);
  if (context === undefined) {
    throw new Error('usePageHeaderContext must be used within PageHeaderProvider');
  }
  return context;
}
