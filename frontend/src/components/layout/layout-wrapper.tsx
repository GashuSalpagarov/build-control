'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { Separator } from '@/components/ui/separator';
import { PageHeaderProvider } from '@/contexts/page-header-context';
import { PageHeader } from './page-header';
import { PageTransition } from './page-transition';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Pages that don't need sidebar
  const noSidebarPages = ['/login'];
  const showSidebar = !noSidebarPages.includes(pathname);

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <PageHeaderProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-4" />
            </div>
            <PageHeader />
          </header>
          <PageTransition>
            {children}
          </PageTransition>
        </SidebarInset>
      </SidebarProvider>
    </PageHeaderProvider>
  );
}
