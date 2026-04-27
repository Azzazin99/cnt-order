"use client";

import { FormEvent, useEffect, useState } from "react";

import type { SchoolRecord } from "@/lib/schools";

type DomainRow = {
  id: string;
  schoolId: string;
  domain: string;
  isVerified: boolean;
  isPrimary: boolean;
};

export function SchoolDomainManagement({
  initialSchools,
}: {
  initialSchools: SchoolRecord[];
}) {
  const [schools, setSchools] = useState<SchoolRecord[]>(initialSchools);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [domainSchoolId, setDomainSchoolId] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function refresh() {
    const res = await fetch("/api/schools");
    if (!res.ok) return;
    const data = (await res.json()) as {
      schools: SchoolRecord[];
      domains: DomainRow[];
    };
    setSchools(data.schools);
    setDomains(data.domains);
    setDomainSchoolId((prev) => prev || data.schools[0]?.id || "");
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refresh();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAddSchool(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: schoolName }),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => null)) as { error?: string } | null;
      setMessage({ type: "error", text: d?.error ?? "เพิ่มโรงเรียนไม่สำเร็จ" });
      return;
    }
    setSchoolName("");
    setMessage({ type: "success", text: "เพิ่มโรงเรียนแล้ว" });
    await refresh();
  }

  async function handleAddDomain(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/schools/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId: domainSchoolId,
        domain: domainInput,
        isVerified: true,
      }),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => null)) as { error?: string } | null;
      setMessage({ type: "error", text: d?.error ?? "เพิ่มโดเมนไม่สำเร็จ" });
      return;
    }
    setDomainInput("");
    setMessage({ type: "success", text: "เพิ่มโดเมนแล้ว" });
    await refresh();
  }

  async function toggleVerified(d: DomainRow) {
    setMessage(null);
    const res = await fetch(`/api/schools/domains/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVerified: !d.isVerified }),
    });
    if (!res.ok) {
      setMessage({ type: "error", text: "อัปเดตไม่สำเร็จ" });
      return;
    }
    await refresh();
  }

  async function removeDomain(id: string) {
    if (!window.confirm("ลบโดเมนนี้?")) return;
    setMessage(null);
    const res = await fetch(`/api/schools/domains/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage({ type: "error", text: "ลบไม่สำเร็จ" });
      return;
    }
    await refresh();
  }

  if (loading) {
    return (
      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-500 shadow-sm dark:border-stone-800 dark:bg-stone-950/60 dark:text-stone-400">
        กำลังโหลดข้อมูลโรงเรียน…
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-950/60">
      <h2 className="notion-heading mb-3 text-lg font-semibold text-stone-900 dark:text-stone-100">
        โรงเรียนและโดเมนอีเมล (Google login)
      </h2>
      {message ? (
        <p
          className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={handleAddSchool} className="grid gap-2">
          <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300">
            เพิ่มโรงเรียน
          </h3>
          <input
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="ชื่อโรงเรียน"
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
            required
          />
          <button
            type="submit"
            className="rounded-xl bg-stone-800 px-3 py-2 text-sm font-medium text-white dark:bg-stone-700"
          >
            เพิ่มโรงเรียน
          </button>
        </form>

        <form onSubmit={handleAddDomain} className="grid gap-2">
          <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300">
            เพิ่มโดเมนอีเมลที่อนุญาต
          </h3>
          <select
            value={domainSchoolId}
            onChange={(e) => setDomainSchoolId(e.target.value)}
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
            required
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="เช่น student.school.ac.th"
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
            required
          />
          <button
            type="submit"
            disabled={!schools.length}
            className="rounded-xl bg-amber-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-amber-600"
          >
            เพิ่มโดเมน
          </button>
        </form>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-left dark:bg-stone-900">
            <tr>
              <th className="px-3 py-2">โรงเรียน</th>
              <th className="px-3 py-2">โดเมน</th>
              <th className="px-3 py-2">ยืนยันแล้ว</th>
              <th className="px-3 py-2 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((d) => {
              const school = schools.find((s) => s.id === d.schoolId);
              return (
                <tr
                  key={d.id}
                  className="border-t border-stone-200 dark:border-stone-800"
                >
                  <td className="px-3 py-2">{school?.name ?? d.schoolId}</td>
                  <td className="px-3 py-2 font-mono text-xs">{d.domain}</td>
                  <td className="px-3 py-2">{d.isVerified ? "ใช่" : "ไม่"}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => void toggleVerified(d)}
                      className="mr-2 rounded border border-stone-300 px-2 py-1 text-xs dark:border-stone-600"
                    >
                      สลับยืนยัน
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeDomain(d.id)}
                      className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700 dark:border-rose-900/50"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {domains.length === 0 ? (
          <p className="p-4 text-center text-xs text-stone-500">
            ยังไม่มีโดเมน — ครูจะล็อกอิน Google ไม่ได้จนกว่าจะเพิ่มโดเมนที่นี่
          </p>
        ) : null}
      </div>
    </section>
  );
}
