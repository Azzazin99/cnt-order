"use client";

import { FormEvent } from "react";

import { OrderDatePicker } from "@/components/order-date-picker";
import {
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
} from "@/lib/document-categories";
import {
  DISTRICT_ORG_KEY,
  DISTRICT_ORG_LABEL,
} from "@/lib/document-organization";
import { formatSchoolDisplayName } from "@/lib/school-display";
import { isPdfFileMeta, PDF_UPLOAD_ERROR } from "@/lib/pdf-upload";

export type DocumentFormState = {
  orderNo: string;
  title: string;
  organization: string;
  category: DocumentCategory | "";
  orderDate: string;
};

type Message = { type: "success" | "error"; text: string } | null;

const inputClass =
  "rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-800 outline-none transition placeholder:text-stone-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-amber-500 dark:focus:ring-amber-500/30";

export function AdminDocumentForm({
  mode,
  form,
  setForm,
  file,
  setFile,
  loading,
  canWrite,
  isPlatformAdmin,
  schools,
  lockedSchoolLabel,
  message,
  setMessage,
  onSubmit,
  onBack,
}: {
  mode: "create" | "edit";
  form: DocumentFormState;
  setForm: (next: DocumentFormState) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  loading: boolean;
  canWrite: boolean;
  isPlatformAdmin: boolean;
  schools: { id: string; name: string }[];
  lockedSchoolLabel: string;
  message: Message;
  setMessage: (message: Message) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="notion-heading text-lg font-semibold text-stone-900 dark:text-stone-100">
          {mode === "edit" ? "แก้ไขเอกสาร" : "เพิ่มเอกสารใหม่"}
        </h2>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          กลับรายการ
        </button>
      </div>

      <form onSubmit={onSubmit} className="grid max-w-2xl gap-3.5">
        {message ? (
          <p
            className={`rounded-lg border px-3 py-2 text-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
            }`}
          >
            {message.text}
          </p>
        ) : null}

        <input
          value={form.orderNo}
          onChange={(e) => setForm({ ...form, orderNo: e.target.value })}
          className={inputClass}
          placeholder="เลขที่คำสั่ง"
          required
          disabled={!canWrite}
        />
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={inputClass}
          placeholder="เรื่อง"
          required
          disabled={!canWrite}
        />
        {isPlatformAdmin ? (
          <label className="grid gap-1">
            <span className="text-sm text-stone-600 dark:text-stone-300">
              หน่วยงาน
            </span>
            <select
              value={form.organization}
              onChange={(e) =>
                setForm({ ...form, organization: e.target.value })
              }
              className={inputClass}
              required
              disabled={!canWrite}
            >
              <option value="">เลือกหน่วยงาน</option>
              <option value={DISTRICT_ORG_KEY}>{DISTRICT_ORG_LABEL}</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {formatSchoolDisplayName(school.name)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="grid gap-1">
            <span className="text-sm text-stone-600 dark:text-stone-300">
              หน่วยงาน
            </span>
            <div
              className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-stone-700 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-200"
              aria-readonly="true"
            >
              {lockedSchoolLabel || "—"}
            </div>
          </label>
        )}
        <label className="grid gap-1">
          <span className="text-sm text-stone-600 dark:text-stone-300">
            หมวดหมู่คำสั่ง
          </span>
          <select
            value={form.category}
            onChange={(e) =>
              setForm({
                ...form,
                category: e.target.value as DocumentCategory | "",
              })
            }
            className={inputClass}
            required
            disabled={!canWrite}
          >
            <option value="">เลือกหมวดหมู่</option>
            {DOCUMENT_CATEGORIES.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-stone-600 dark:text-stone-300">
            สั่ง ณ วันที่
          </span>
          <OrderDatePicker
            value={form.orderDate}
            onChange={(orderDate) => setForm({ ...form, orderDate })}
            required
            disabled={!canWrite}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-stone-600 dark:text-stone-300">
            ไฟล์คำสั่ง (PDF)
            {mode === "edit" ? " — ว่างไว้หากไม่เปลี่ยนไฟล์" : ""}
          </span>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              const selected = e.target.files?.[0] ?? null;
              if (!selected) {
                setFile(null);
                return;
              }
              if (!isPdfFileMeta(selected)) {
                setMessage({ type: "error", text: PDF_UPLOAD_ERROR });
                setFile(null);
                e.target.value = "";
                return;
              }
              setMessage(null);
              setFile(selected);
            }}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-stone-800 file:px-3 file:py-1.5 file:text-white hover:file:bg-stone-900 dark:border-stone-700 dark:bg-stone-900"
            disabled={!canWrite}
          />
        </label>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            disabled={loading || !canWrite}
            className="rounded-xl bg-stone-800 px-4 py-2.5 font-medium text-white transition hover:bg-stone-900 disabled:cursor-not-allowed disabled:bg-stone-400"
          >
            {loading
              ? "กำลังบันทึก..."
              : mode === "edit"
                ? "บันทึกการแก้ไข"
                : "บันทึกเอกสาร"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-stone-300 px-4 py-2.5 text-stone-700 transition hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            ยกเลิก
          </button>
        </div>
        {!canWrite ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            บัญชีนี้มีสิทธิ์ดูข้อมูลอย่างเดียว
          </p>
        ) : null}
      </form>
    </section>
  );
}
