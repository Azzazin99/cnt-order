"use client";

import { FormEvent, useState } from "react";

import type { DocumentItem } from "@/lib/documents";
import type { UserRole } from "@/lib/users";

type FormState = {
  orderNo: string;
  title: string;
  department: string;
  orderDate: string;
};

const initialForm: FormState = {
  orderNo: "",
  title: "",
  department: "",
  orderDate: "",
};

export function AdminClient({
  initialItems,
  currentRole,
}: {
  initialItems: DocumentItem[];
  currentRole: UserRole | "unknown";
}) {
  const [items, setItems] = useState<DocumentItem[]>(initialItems);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const canWrite = currentRole === "admin" || currentRole === "editor";
  const canDelete = currentRole === "admin";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      setMessage({ type: "error", text: "บัญชีของคุณไม่มีสิทธิ์เพิ่ม/แก้ไขเอกสาร" });
      return;
    }
    setMessage(null);
    setLoading(true);

    const payload = new FormData();
    payload.append("orderNo", form.orderNo);
    payload.append("title", form.title);
    payload.append("department", form.department);
    payload.append("orderDate", form.orderDate);
    if (file) {
      payload.append("file", file);
    }

    const endpoint = editingId ? `/api/documents/${editingId}` : "/api/documents";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      body: payload,
    });
    setLoading(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setMessage({
        type: "error",
        text:
          data?.error ??
          `${editingId ? "แก้ไข" : "เพิ่ม"}เอกสารไม่สำเร็จ กรุณาตรวจสอบข้อมูล`,
      });
      return;
    }

    const saved = (await res.json()) as DocumentItem;
    if (editingId) {
      setItems((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
    } else {
      setItems((prev) => [saved, ...prev]);
    }
    setForm(initialForm);
    setFile(null);
    setEditingId(null);
    setMessage({
      type: "success",
      text: editingId ? "บันทึกการแก้ไขเอกสารเรียบร้อย" : "เพิ่มเอกสารใหม่เรียบร้อย",
    });
  }

  async function handleDelete(id: string) {
    if (!canDelete) {
      setMessage({ type: "error", text: "บัญชีของคุณไม่มีสิทธิ์ลบเอกสาร" });
      return;
    }
    const confirmed = window.confirm("ยืนยันการลบเอกสารนี้?");
    if (!confirmed) {
      return;
    }
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage({ type: "error", text: "ลบเอกสารไม่สำเร็จ" });
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    setMessage({ type: "success", text: "ลบเอกสารเรียบร้อย" });
  }

  function handleEdit(item: DocumentItem) {
    setEditingId(item.id);
    setForm({
      orderNo: item.orderNo,
      title: item.title,
      department: item.department,
      orderDate: item.orderDate,
    });
    setFile(null);
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
    setFile(null);
    setMessage(null);
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="mb-6 grid gap-3.5 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-950/60"
      >
        <h2 className="notion-heading text-lg font-semibold text-stone-900 dark:text-stone-100">
          {editingId ? "แก้ไขเอกสาร" : "เพิ่มเอกสารใหม่"}
        </h2>
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
          className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-800 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
          placeholder="เลขที่คำสั่ง"
          required
          disabled={!canWrite}
        />
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-800 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
          placeholder="เรื่อง"
          required
          disabled={!canWrite}
        />
        <input
          value={form.department}
          onChange={(e) => setForm({ ...form, department: e.target.value })}
          className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-800 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
          placeholder="กลุ่มงาน"
          required
          disabled={!canWrite}
        />
        <input
          value={form.orderDate}
          onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
          className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-800 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
          placeholder="วันที่ลงคำสั่ง (เช่น 1/6/2023)"
          required
          disabled={!canWrite}
        />
        <label className="grid gap-1">
          <span className="text-sm text-stone-600 dark:text-stone-300">
            ไฟล์คำสั่ง (PDF)
          </span>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm file:mr-3 file:rounded-lg file:border-0 file:bg-stone-800 file:px-3 file:py-1.5 file:text-white hover:file:bg-stone-900 dark:border-stone-700 dark:bg-stone-900"
            disabled={!canWrite}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-stone-800 px-4 py-2.5 font-medium text-white shadow-sm shadow-stone-500/25 transition hover:bg-stone-900 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {loading
            ? "กำลังบันทึก..."
            : editingId
              ? "บันทึกการแก้ไข"
              : "บันทึกเอกสาร"}
        </button>
        {editingId ? (
          <button
            type="button"
            onClick={cancelEdit}
            className="rounded-xl border border-stone-300 px-4 py-2.5 text-stone-700 transition hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            ยกเลิกแก้ไข
          </button>
        ) : null}
        {!canWrite ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            บัญชีนี้มีสิทธิ์ดูข้อมูลอย่างเดียว
          </p>
        ) : null}
      </form>

      <section>
        <h2 className="notion-heading mb-3 text-lg font-semibold text-stone-900 dark:text-stone-100">
          รายการเอกสารทั้งหมด ({items.length})
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-800">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-stone-50 text-left text-stone-700 dark:bg-stone-900 dark:text-stone-200">
                <th className="px-3 py-2">เลขที่คำสั่ง</th>
                <th className="px-3 py-2">เรื่อง</th>
                <th className="px-3 py-2">หน่วยงาน</th>
                <th className="px-3 py-2">วันที่</th>
                <th className="px-3 py-2">ไฟล์</th>
                <th className="px-3 py-2 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-stone-200 transition hover:bg-stone-50/80 dark:border-stone-800 dark:hover:bg-stone-900/70"
                >
                  <td className="px-3 py-2">{item.orderNo}</td>
                  <td className="px-3 py-2">{item.title}</td>
                  <td className="px-3 py-2">{item.department}</td>
                  <td className="px-3 py-2">{item.orderDate}</td>
                  <td className="px-3 py-2">
                    {item.fileUrl !== "#" ? (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-700 underline hover:text-amber-800 dark:text-amber-300"
                      >
                        เปิดไฟล์
                      </a>
                    ) : (
                      <span className="text-stone-500">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      disabled={!canWrite}
                      className="mr-2 rounded-lg border border-stone-300 bg-stone-100 px-3 py-1.5 text-stone-700 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:bg-stone-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={!canDelete}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-900/40"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
