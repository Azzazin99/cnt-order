"use client";

import { FormEvent, useState } from "react";

import type { SchoolRecord } from "@/lib/schools";
import type { UserRole } from "@/lib/users";

type SafeUser = {
  username: string;
  role: UserRole;
  email: string | null;
  schoolId: string | null;
};

type NewUserForm = {
  username: string;
  password: string;
  role: UserRole;
  schoolId: string;
  email: string;
};

const initialForm: NewUserForm = {
  username: "",
  password: "",
  role: "editor",
  schoolId: "",
  email: "",
};

function userApiPath(username: string) {
  return `/api/users/${encodeURIComponent(username)}`;
}

export function UserManagement({
  initialUsers,
  currentUsername,
  isPlatformAdmin,
  schools,
  embedded = false,
}: {
  initialUsers: SafeUser[];
  currentUsername: string;
  isPlatformAdmin: boolean;
  schools: SchoolRecord[];
  embedded?: boolean;
}) {
  const [users, setUsers] = useState<SafeUser[]>(initialUsers);
  const [form, setForm] = useState<NewUserForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [resetPassword, setResetPassword] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSaving(true);
    const body: Record<string, unknown> = {
      username: form.username,
      password: form.password,
      role: form.role,
    };
    if (isPlatformAdmin) {
      body.schoolId =
        form.schoolId === "" || form.schoolId === "__platform__"
          ? null
          : form.schoolId;
    }
    if (form.email.trim()) {
      body.email = form.email.trim();
    }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setMessage({ type: "error", text: data?.error ?? "เพิ่มผู้ใช้ไม่สำเร็จ" });
      return;
    }

    const created = (await res.json()) as SafeUser;
    setUsers((prev) => [...prev, created]);
    setForm(initialForm);
    setMessage({ type: "success", text: `เพิ่มผู้ใช้ ${created.username} เรียบร้อย` });
  }

  async function handleChangeRole(username: string, role: UserRole) {
    setMessage(null);
    const res = await fetch(userApiPath(username), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setMessage({ type: "error", text: data?.error ?? "เปลี่ยนสิทธิ์ไม่สำเร็จ" });
      return;
    }

    setUsers((prev) =>
      prev.map((user) => (user.username === username ? { ...user, role } : user)),
    );
    setMessage({ type: "success", text: `เปลี่ยนสิทธิ์ของ ${username} เป็น ${role} แล้ว` });
  }

  async function handleResetPassword(username: string) {
    setMessage(null);
    const password = resetPassword[username] || "";
    if (!password) {
      setMessage({ type: "error", text: "กรอกรหัสผ่านใหม่ก่อน" });
      return;
    }

    const res = await fetch(userApiPath(username), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setMessage({ type: "error", text: data?.error ?? "รีเซ็ตรหัสผ่านไม่สำเร็จ" });
      return;
    }

    setResetPassword((prev) => ({ ...prev, [username]: "" }));
    setMessage({ type: "success", text: `รีเซ็ตรหัสผ่านของ ${username} สำเร็จ` });
  }

  async function handleDelete(username: string) {
    setMessage(null);
    if (!window.confirm(`ยืนยันการลบผู้ใช้ ${username}?`)) return;
    const res = await fetch(userApiPath(username), { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setMessage({ type: "error", text: data?.error ?? "ลบผู้ใช้ไม่สำเร็จ" });
      return;
    }
    setUsers((prev) => prev.filter((user) => user.username !== username));
    setMessage({ type: "success", text: `ลบผู้ใช้ ${username} เรียบร้อย` });
  }

  const sectionClass = embedded
    ? ""
    : "mt-8 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950/60";

  return (
    <section className={sectionClass}>
      <h2 className="notion-heading mb-3 text-lg font-semibold text-stone-900 dark:text-stone-100">
        จัดการผู้ใช้ระบบ
      </h2>
      {message ? (
        <p
          className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <form
        onSubmit={handleCreate}
        className="mb-5 grid gap-2.5 md:grid-cols-2 lg:grid-cols-6"
      >
        <input
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-800 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
          placeholder="username"
          required
        />
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-800 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
          placeholder="password"
          required
        />
        <input
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-800 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
          placeholder="email (ไม่บังคับ)"
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
          className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-800 shadow-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
        >
          <option value="editor">editor</option>
          <option value="admin">admin</option>
        </select>
        {isPlatformAdmin ? (
          <select
            value={form.schoolId}
            onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-800 shadow-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
          >
            <option value="__platform__">ระดับเขต (ไม่ผูกโรงเรียน)</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="self-center text-xs text-stone-500 dark:text-stone-400">
            ผูกโรงเรียนของคุณอัตโนมัติ
          </span>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-stone-800 px-4 py-2.5 font-medium text-white shadow-sm shadow-stone-500/25 transition hover:bg-stone-900 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {saving ? "กำลังเพิ่ม..." : "เพิ่มผู้ใช้"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-stone-50 text-left text-stone-700 dark:bg-stone-900 dark:text-stone-200">
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">โรงเรียน</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">รีเซ็ตรหัสผ่าน</th>
              <th className="px-3 py-2 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isCurrent = user.username === currentUsername;
              const schoolName =
                schools.find((s) => s.id === (user.schoolId || ""))?.name ??
                (user.schoolId ? user.schoolId : "—");
              return (
                <tr
                  key={user.username}
                  className="border-t border-stone-200 transition hover:bg-stone-50/80 dark:border-stone-800 dark:hover:bg-stone-900/70"
                >
                  <td className="px-3 py-2">
                    {user.username}
                    {isCurrent ? (
                      <span className="ml-2 text-xs text-amber-700 dark:text-amber-400">
                        (บัญชีที่กำลังใช้)
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-2 text-xs">
                    {user.email ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">{schoolName}</td>
                  <td className="px-3 py-2">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleChangeRole(user.username, e.target.value as UserRole)
                      }
                      className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
                    >
                      <option value="editor">editor</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={resetPassword[user.username] || ""}
                        onChange={(e) =>
                          setResetPassword((prev) => ({
                            ...prev,
                            [user.username]: e.target.value,
                          }))
                        }
                        disabled={false}
                        className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
                        placeholder="รหัสผ่านใหม่"
                      />
                      <button
                        type="button"
                        onClick={() => handleResetPassword(user.username)}
                        className="rounded-lg border border-stone-300 bg-stone-100 px-3 py-1.5 text-stone-700 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                      >
                        รีเซ็ต
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(user.username)}
                      disabled={isCurrent}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-900/40"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
