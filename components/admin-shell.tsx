"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode, useCallback, useMemo } from "react";

import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

export type AdminTabId = "documents" | "users" | "audit";

type TabDef = {
  id: AdminTabId;
  label: string;
  content: ReactNode;
};

const TAB_DESCRIPTIONS: Record<AdminTabId, string> = {
  documents: "ค้นหาและจัดการเอกสารคำสั่งตามหมวดหมู่",
  users: "เพิ่มและจัดการผู้ใช้ระบบ",
  audit: "ประวัติการทำรายการล่าสุด",
};

function AdminShellInner({
  currentUsername,
  roleBadge,
  tabs,
  defaultTab,
}: {
  currentUsername: string;
  roleBadge: string;
  tabs: TabDef[];
  defaultTab: AdminTabId;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabIds = useMemo(() => new Set(tabs.map((tab) => tab.id)), [tabs]);
  const paramTab = searchParams.get("tab") as AdminTabId | null;
  const activeTab =
    paramTab && tabIds.has(paramTab) ? paramTab : defaultTab;

  const setTab = useCallback(
    (id: AdminTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", id);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-100 to-amber-50/40 px-4 py-8 text-stone-800 dark:from-stone-950 dark:to-stone-900 dark:text-stone-100">
      <div className="mx-auto w-full max-w-5xl rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
        <header className="border-b border-stone-200 px-4 py-5 md:px-6 dark:border-stone-800">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="notion-heading text-2xl font-semibold text-balance text-stone-900 dark:text-stone-100">
                แดชบอร์ดจัดการเอกสาร
              </h1>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                {TAB_DESCRIPTIONS[activeTab]}
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              {currentUsername} ({roleBadge})
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <LogoutButton />
            <ThemeToggle />
          </div>
        </header>

        <nav
          className="flex gap-1 overflow-x-auto border-b border-stone-200 px-4 md:px-6 dark:border-stone-800"
          aria-label="เมนูจัดการระบบ"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? "border-amber-600 text-stone-900 dark:border-amber-500 dark:text-stone-100"
                    : "border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-5 md:px-6">{activeContent}</div>
      </div>
    </main>
  );
}

export function AdminShell(
  props: Omit<React.ComponentProps<typeof AdminShellInner>, "defaultTab"> & {
    defaultTab?: AdminTabId;
  },
) {
  const { defaultTab = "documents", ...rest } = props;
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-stone-100 text-sm text-stone-500 dark:bg-stone-950 dark:text-stone-400">
          กำลังโหลด…
        </main>
      }
    >
      <AdminShellInner defaultTab={defaultTab} {...rest} />
    </Suspense>
  );
}
