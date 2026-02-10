"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSyncStatusStore } from "@/stores/useSyncStatusStore";

const NAV_ITEMS = [
  { href: "/grid", label: "Grid", icon: "▦" },
  { href: "/timer", label: "Timer", icon: "◷" },
  { href: "/todos", label: "Tasks", icon: "≡" },
  { href: "/settings", label: "Settings", icon: "○" },
];

export default function NavBar() {
  const pathname = usePathname();
  const syncStatus = useSyncStatusStore((state) => state.status);

  const syncClasses = {
    idle: "bg-muted/30 shadow-none",
    syncing: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]",
    saved: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]",
    error: "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.6)]",
  } as const;

  return (
    <nav className="sticky top-0 z-50 border-b border-card-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        <Link
          href="/grid"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground/90 hover:text-foreground"
        >
          <Image
            src="/favicon.ico"
            alt="PT"
            width={24}
            height={24}
            className="rounded"
          />
          <span>PT</span>
        </Link>
        <div className="flex items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 sm:px-3 sm:py-2 text-base sm:text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-card border border-card-border text-accent"
                    : "text-muted hover:text-foreground hover:bg-card/60"
                }`}
              >
                <span className="text-lg sm:text-base leading-none">
                  {item.icon}
                </span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
