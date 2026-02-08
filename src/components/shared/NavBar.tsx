'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/grid', label: 'Grid', icon: '▦' },
  { href: '/timer', label: 'Timer', icon: '◷' },
  { href: '/todos', label: 'Tasks', icon: '≡' },
  { href: '/settings', label: 'Settings', icon: '○' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-card-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        <Link href="/grid" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground/90 hover:text-foreground">
          <Image src="/favicon.ico" alt="PT" width={24} height={24} className="rounded" />
          <span>PT</span>
        </Link>
        <div className="flex gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-card border border-card-border text-accent'
                    : 'text-muted hover:text-foreground hover:bg-card/60'
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
