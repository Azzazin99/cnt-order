"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  dateToIso,
  formatOrderDateThai,
  parseOrderDate,
  THAI_MONTHS_FULL,
  THAI_WEEKDAYS_SHORT,
  toBuddhistYear,
} from "@/lib/thai-date";

type OrderDatePickerProps = {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  required?: boolean;
};

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number; inMonth: boolean }> = [];

  for (let i = 0; i < firstDay; i += 1) {
    cells.push({ day: 0, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: 0, inMonth: false });
  }

  return cells;
}

export function OrderDatePicker({
  value,
  onChange,
  disabled = false,
  required = false,
}: OrderDatePickerProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const parsed = parseOrderDate(value);
  const today = new Date();

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    () => parsed?.getFullYear() ?? today.getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    () => parsed?.getMonth() ?? today.getMonth(),
  );

  useEffect(() => {
    const next = parseOrderDate(value);
    if (!next) return;
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }, [value]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const cells = getMonthGrid(viewYear, viewMonth);
  const selectedIso = parsed ? dateToIso(parsed) : "";

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function selectDay(day: number) {
    const iso = dateToIso(new Date(viewYear, viewMonth, day));
    onChange(iso);
    setOpen(false);
  }

  const displayValue = value ? formatOrderDateThai(value) : "เลือกวันที่";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-left text-stone-800 shadow-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
      >
        <span className={value ? "" : "text-stone-400"}>{displayValue}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-5 w-5 text-stone-500"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>
      <input type="hidden" value={value} required={required} readOnly />

      {open ? (
        <div
          id={listboxId}
          role="dialog"
          aria-label="เลือกสั่ง ณ วันที่"
          className="absolute left-0 z-20 mt-2 w-full min-w-[280px] rounded-2xl border border-stone-200 bg-white p-3 shadow-lg shadow-stone-300/30 dark:border-stone-700 dark:bg-stone-950 dark:shadow-black/40"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-lg border border-stone-300 px-2.5 py-1 text-stone-700 transition hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
              aria-label="เดือนก่อนหน้า"
            >
              ‹
            </button>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              {THAI_MONTHS_FULL[viewMonth]} {toBuddhistYear(viewYear)}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-lg border border-stone-300 px-2.5 py-1 text-stone-700 transition hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
              aria-label="เดือนถัดไป"
            >
              ›
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium text-stone-500 dark:text-stone-400">
            {THAI_WEEKDAYS_SHORT.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, index) => {
              if (!cell.inMonth) {
                return <div key={`empty-${index}`} className="h-9" />;
              }

              const iso = dateToIso(new Date(viewYear, viewMonth, cell.day));
              const isSelected = iso === selectedIso;
              const isToday =
                viewYear === today.getFullYear() &&
                viewMonth === today.getMonth() &&
                cell.day === today.getDate();

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => selectDay(cell.day)}
                  className={`h-9 rounded-lg text-sm transition ${
                    isSelected
                      ? "bg-stone-800 font-semibold text-white dark:bg-stone-200 dark:text-stone-900"
                      : isToday
                        ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/40"
                        : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                  }`}
                  aria-label={`เลือกวันที่ ${cell.day} ${THAI_MONTHS_FULL[viewMonth]} ${toBuddhistYear(viewYear)}`}
                  aria-pressed={isSelected}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
