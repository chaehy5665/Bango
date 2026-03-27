'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, Search, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: '지도', href: '/map', icon: Map },
    { label: '검색', href: '/search', icon: Search },
    { label: '어드민', href: '/admin', icon: Settings },
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background md:hidden">
        <div className="flex h-16 items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
          <div className="flex items-center justify-center flex-1 py-2">
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Desktop Top Navigation */}
      <nav className="hidden md:flex border-b border-border bg-background">
        <div className="flex h-16 items-center gap-1 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Mobile safe area spacer */}
      <div className="h-16 md:hidden" />
    </>
  );
}
