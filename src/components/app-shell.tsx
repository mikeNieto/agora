"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { usePreferences } from "@/components/preferences-provider";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { copy, toggleLanguage, toggleTheme, language, theme } =
    usePreferences();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header
        className="sticky top-0 z-30 border-b border-(--border-subtle) backdrop-blur-xl"
        style={{
          background: "color-mix(in srgb, var(--bg-panel) 88%, transparent)",
        }}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <span
                className="flex size-10 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-[0_18px_40px_rgba(16,24,40,0.24)]"
                style={{ background: "var(--brand-gradient)" }}
              >
                Ag
              </span>
              <div>
                <div className="font-display text-lg font-semibold tracking-tight">
                  {copy.appName}
                </div>
                <div className="text-xs text-(--text-muted)">
                  {copy.appSubtitle}
                </div>
              </div>
            </Link>
            <nav className="hidden items-center gap-2 rounded-full border border-(--border-subtle) bg-(--bg-elevated) p-1 md:flex">
              <NavLink href="/" active={pathname === "/"}>
                {copy.navForums}
              </NavLink>
              <NavLink href="/forums/new" active={pathname === "/forums/new"}>
                {copy.navNewForum}
              </NavLink>
              <NavLink href="/settings" active={pathname === "/settings"}>
                {copy.navSettings}
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="control-chip"
              type="button"
              onClick={toggleLanguage}
            >
              {language === "es" ? "EN" : "ES"}
            </button>
            <button
              className="control-chip"
              type="button"
              onClick={toggleTheme}
            >
              {theme === "dark" ? copy.themeLight : copy.themeDark}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={active ? "nav-pill nav-pill--active" : "nav-pill"}
    >
      {children}
    </Link>
  );
}
