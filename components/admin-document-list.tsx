"use client";

import { useMemo, useState } from "react";

import {
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
  getCategoryLabel,
} from "@/lib/document-categories";
import { getOrganizationLabel } from "@/lib/document-organization";
import type { DocumentItem } from "@/lib/documents";
import { formatOrderDateThai } from "@/lib/thai-date";

type Message = { type: "success" | "error"; text: string } | null;

function DocumentRow({
  item,
  showOrganization,
  schoolNameMap,
  canWrite,
  canDelete,
  onEdit,
  onDelete,
}: {
  item: DocumentItem;
  showOrganization: boolean;
  schoolNameMap: Map<string, string>;
  canWrite: boolean;
  canDelete: boolean;
  onEdit: (item: DocumentItem) => void;
  onDelete: (id: string) => void;
}) {
  const metaParts = [
    item.orderNo,
    formatOrderDateThai(item.orderDate),
    getCategoryLabel(item.category),
  ];
  if (showOrganization) {
    metaParts.push(getOrganizationLabel(item.schoolId, schoolNameMap));
  }

  return (
    <li className="flex flex-col gap-3 border-b border-stone-200 px-3 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between dark:border-stone-800">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-stone-900 dark:text-stone-100">
          {item.title}
        </p>
        <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">
          {metaParts.join(" · ")}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {item.fileUrl !== "#" ? (
          <a
            href={item.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-amber-800 transition hover:bg-stone-50 dark:border-stone-600 dark:text-amber-300 dark:hover:bg-stone-800"
          >
            เปิดไฟล์
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => onEdit(item)}
          disabled={!canWrite}
          className="rounded-lg border border-stone-300 bg-stone-100 px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
        >
          แก้ไข
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          disabled={!canDelete}
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-900/40"
        >
          ลบ
        </button>
      </div>
    </li>
  );
}

export function AdminDocumentList({
  items,
  schoolNameMap,
  showOrganization,
  canWrite,
  canDelete,
  listMessage,
  onAdd,
  onEdit,
  onDelete,
}: {
  items: DocumentItem[];
  schoolNameMap: Map<string, string>;
  showOrganization: boolean;
  canWrite: boolean;
  canDelete: boolean;
  listMessage: Message;
  onAdd: () => void;
  onEdit: (item: DocumentItem) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | DocumentCategory
  >("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const categoryCounts = useMemo(() => {
    const counts = new Map<DocumentCategory | "all", number>();
    counts.set("all", items.length);
    for (const cat of DOCUMENT_CATEGORIES) {
      counts.set(
        cat.slug,
        items.filter((item) => item.category === cat.slug).length,
      );
    }
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false;
      }
      if (!keyword) return true;
      const orgLabel = showOrganization
        ? getOrganizationLabel(item.schoolId, schoolNameMap)
        : "";
      return [
        item.orderNo,
        item.title,
        getCategoryLabel(item.category),
        formatOrderDateThai(item.orderDate),
        orgLabel,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [categoryFilter, items, query, schoolNameMap, showOrganization]);

  const useGroupedView =
    categoryFilter === "all" && query.trim() === "" && filtered.length > 0;

  const grouped = useMemo(() => {
    if (!useGroupedView) return null;
    return DOCUMENT_CATEGORIES.map((cat) => ({
      slug: cat.slug,
      label: cat.label,
      items: filtered.filter((item) => item.category === cat.slug),
    })).filter((group) => group.items.length > 0);
  }, [filtered, useGroupedView]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pagedRows = useGroupedView
    ? filtered
    : filtered.slice(start, start + pageSize);

  const emptyCategory =
    categoryFilter !== "all" &&
    query.trim() === "" &&
    filtered.length === 0 &&
    items.some((item) => item.category === categoryFilter) === false;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="notion-heading text-lg font-semibold text-stone-900 dark:text-stone-100">
          รายการเอกสาร ({items.length})
        </h2>
        {canWrite ? (
          <button
            type="button"
            onClick={onAdd}
            className="rounded-xl bg-stone-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-900"
          >
            เพิ่มเอกสาร
          </button>
        ) : null}
      </div>

      {listMessage ? (
        <p
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            listMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
          }`}
        >
          {listMessage.text}
        </p>
      ) : null}

      <div
        className="mb-4 flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="กรองตามหมวดหมู่"
      >
        <CategoryPill
          active={categoryFilter === "all"}
          label="ทั้งหมด"
          count={categoryCounts.get("all") ?? 0}
          onClick={() => {
            setCategoryFilter("all");
            setPage(1);
          }}
        />
        {DOCUMENT_CATEGORIES.map((cat) => (
          <CategoryPill
            key={cat.slug}
            active={categoryFilter === cat.slug}
            label={cat.label}
            count={categoryCounts.get(cat.slug) ?? 0}
            onClick={() => {
              setCategoryFilter(cat.slug);
              setPage(1);
            }}
          />
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-stone-200 p-3 text-sm dark:border-stone-800 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-stone-600 dark:text-stone-300">
          {!useGroupedView ? (
            <div className="flex items-center gap-2">
              <span className="font-medium">แสดง</span>
              <select
                className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                aria-label="จำนวนรายการต่อหน้า"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="font-medium">รายการ</span>
            </div>
          ) : (
            <span className="text-stone-600 dark:text-stone-400">
              จัดกลุ่มตามหมวดหมู่
            </span>
          )}
        </div>
        <label className="flex items-center gap-2">
          <span className="text-stone-600 dark:text-stone-300">ค้นหา:</span>
          <input
            type="search"
            className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 outline-none transition placeholder:text-stone-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-amber-500 dark:focus:ring-amber-500/30 md:w-64"
            placeholder="เลขที่ / เรื่อง / หมวดหมู่"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          emptyCategory={emptyCategory}
          hasSearch={query.trim() !== ""}
          canWrite={canWrite}
          onAdd={onAdd}
        />
      ) : useGroupedView && grouped ? (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.slug}>
              <h3 className="notion-heading mb-2 text-base font-semibold text-stone-800 dark:text-stone-200">
                {group.label}{" "}
                <span className="font-normal text-stone-500 dark:text-stone-400">
                  ({group.items.length})
                </span>
              </h3>
              <ul className="rounded-xl border border-stone-200 dark:border-stone-800">
                {group.items.map((item) => (
                  <DocumentRow
                    key={item.id}
                    item={item}
                    showOrganization={showOrganization}
                    schoolNameMap={schoolNameMap}
                    canWrite={canWrite}
                    canDelete={canDelete}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <>
          <ul className="rounded-xl border border-stone-200 dark:border-stone-800">
            {pagedRows.map((item) => (
              <DocumentRow
                key={item.id}
                item={item}
                showOrganization={showOrganization}
                schoolNameMap={schoolNameMap}
                canWrite={canWrite}
                canDelete={canDelete}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-stone-200 p-3 text-sm dark:border-stone-800 md:flex-row md:items-center md:justify-between">
            <p className="text-stone-600 dark:text-stone-300">
              แสดง {filtered.length === 0 ? 0 : start + 1} ถึง{" "}
              {Math.min(start + pageSize, filtered.length)} จาก {filtered.length}{" "}
              รายการ
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="rounded-lg border border-stone-300 bg-stone-100 px-3 py-1.5 text-stone-600 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                ก่อนหน้า
              </button>
              <span className="rounded-lg bg-stone-800 px-3 py-1.5 font-medium text-white">
                {currentPage}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage >= totalPages}
                className="rounded-lg border border-stone-300 bg-stone-100 px-3 py-1.5 text-stone-600 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function CategoryPill({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? "border-amber-300 bg-amber-50 font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
          : "border-stone-300 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-900"
      }`}
    >
      {label} ({count})
    </button>
  );
}

function EmptyState({
  emptyCategory,
  hasSearch,
  canWrite,
  onAdd,
}: {
  emptyCategory: boolean;
  hasSearch: boolean;
  canWrite: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 px-4 py-10 text-center dark:border-stone-700">
      {hasSearch ? (
        <>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            ไม่พบเอกสารที่ตรงกับคำค้น
          </p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-500">
            ลองค้นหาด้วยคำสั้นลง หรือเปลี่ยนหมวดหมู่
          </p>
        </>
      ) : emptyCategory ? (
        <>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            ยังไม่มีเอกสารในหมวดนี้
          </p>
          {canWrite ? (
            <button
              type="button"
              onClick={onAdd}
              className="mt-4 rounded-xl bg-stone-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-900"
            >
              เพิ่มเอกสารในหมวดนี้
            </button>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-stone-600 dark:text-stone-400">
          ยังไม่มีเอกสารในระบบ
        </p>
      )}
    </div>
  );
}
