"use client";

import { useMemo, useState } from "react";

import type { DocumentItem } from "@/lib/documents";

export function DocumentTable({ rows }: { rows: DocumentItem[] }) {
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(
    null,
  );

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((item) =>
      [item.orderNo, item.title, item.department, item.orderDate]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [query, rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pagedRows = filtered.slice(start, start + pageSize);

  return (
    <>
      <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 text-sm shadow-sm dark:border-stone-800 dark:bg-stone-950/60 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
          <span className="font-medium">แสดง</span>
          <select
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            aria-label="จำนวนแถวที่แสดง"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
          </select>
          <span className="font-medium">แถว</span>
        </div>

        <label className="flex items-center gap-2">
          <span className="text-stone-600 dark:text-stone-300">ค้นหา:</span>
          <input
            type="text"
            className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/30 md:w-64"
            placeholder="เลขที่คำสั่ง / เรื่อง"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-950/60">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-stone-50 text-left text-stone-700 dark:bg-stone-900 dark:text-stone-200">
              <th className="px-3 py-3 font-semibold">วันเวลา</th>
              <th className="px-3 py-3 font-semibold">เลขที่คำสั่ง</th>
              <th className="px-3 py-3 font-semibold">เรื่อง</th>
              <th className="px-3 py-3 font-semibold">กลุ่มงาน</th>
              <th className="px-3 py-3 font-semibold">วันที่ลงคำสั่ง</th>
              <th className="px-3 py-3 text-center font-semibold">ไฟล์คำสั่ง</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-stone-200 align-top transition hover:bg-stone-50/80 dark:border-stone-800 dark:hover:bg-stone-900/70"
              >
                <td className="px-3 py-3">{row.issuedAt}</td>
                <td className="px-3 py-3">{row.orderNo}</td>
                <td className="px-3 py-3 leading-6">{row.title}</td>
                <td className="px-3 py-3">{row.department}</td>
                <td className="px-3 py-3">{row.orderDate}</td>
                <td className="px-3 py-3 text-center">
                  {row.fileUrl !== "#" ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPreview({
                          url: row.fileUrl,
                          title: `ไฟล์คำสั่ง ${row.orderNo}`,
                        })
                      }
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-stone-700 text-xl text-white shadow-sm shadow-stone-400/30 transition hover:bg-stone-800"
                      aria-label={`ดูไฟล์คำสั่ง ${row.orderNo}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-5 w-5"
                        aria-hidden
                      >
                        <path d="M6.75 2.25A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V8.56a2.25 2.25 0 00-.659-1.59l-3.81-3.81a2.25 2.25 0 00-1.59-.659H6.75z" />
                        <path d="M15 3.75v3a1.5 1.5 0 001.5 1.5h3" />
                      </svg>
                    </button>
                  ) : (
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-stone-300 text-lg text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                      -
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {pagedRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-stone-500 dark:text-stone-400">
                  <p className="text-sm">ไม่พบข้อมูลที่ค้นหา</p>
                  <p className="mt-1 text-xs">ลองค้นหาด้วยคำสั้นลง หรือเปลี่ยนคำค้น</p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 text-sm shadow-sm dark:border-stone-800 dark:bg-stone-950/60 md:flex-row md:items-center md:justify-between">
        <p className="text-stone-600 dark:text-stone-300">
          แสดง {filtered.length === 0 ? 0 : start + 1} ถึง{" "}
          {Math.min(start + pageSize, filtered.length)} จาก {filtered.length} แถว
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
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-lg border border-stone-300 bg-stone-100 px-3 py-1.5 text-stone-600 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            ถัดไป
          </button>
        </div>
      </section>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-4 backdrop-blur-sm">
          <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-950">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800">
              <h3 className="notion-heading font-medium text-stone-800 dark:text-stone-100">{preview.title}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm transition hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
                >
                  เปิดแท็บใหม่
                </a>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm text-white transition hover:bg-stone-700 dark:bg-stone-700 dark:hover:bg-stone-600"
                >
                  ปิด
                </button>
              </div>
            </div>

            <iframe
              src={preview.url}
              title={preview.title}
              className="h-full w-full"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
