"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";

export function UnifiedLoginForm({ showLocalLogin = true }: { showLocalLogin?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorCode = searchParams.get("error");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const queryError =
    errorCode === "invalid_credentials"
      ? "รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
      : errorCode
        ? errorCode
        : null;

  const displayError = submitError ?? queryError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setSubmitError(data?.error ?? "รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900">
              <Image
                src="/3D-Logo.png"
                alt="โลโก้ สพป.ชัยนาท"
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="notion-heading text-xl font-semibold text-balance text-stone-900 dark:text-stone-100">
                คลังคำสั่งออนไลน์
              </h1>
              <p className="mt-0.5 text-sm text-stone-700 dark:text-stone-300">
                สำนักงานเขตพื้นที่การศึกษาประถมศึกษาชัยนาท
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="rounded-xl border border-stone-300 bg-white p-5 dark:border-stone-700 dark:bg-stone-900 md:p-6">
          <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
            เข้าสู่ระบบ
          </h2>

          {displayError ? (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
            >
              {displayError}
            </p>
          ) : null}

          {showLocalLogin ? (
            <form onSubmit={handleSubmit} className="grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
                  ชื่อผู้ใช้
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 outline-none transition placeholder:text-stone-600 focus:border-amber-600 focus:ring-2 focus:ring-amber-200 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
                  placeholder="ชื่อผู้ใช้"
                  required
                  autoComplete="username"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
                  รหัสผ่าน
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 outline-none transition placeholder:text-stone-600 focus:border-amber-600 focus:ring-2 focus:ring-amber-200 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
                  placeholder="รหัสผ่าน"
                  required
                  autoComplete="current-password"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="mt-1 rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-stone-900 focus:ring-2 focus:ring-amber-300 focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-400 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white dark:focus:ring-amber-500/40 dark:disabled:bg-stone-600 dark:disabled:text-stone-400"
              >
                {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
              </button>
            </form>
          ) : (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              การเข้าสู่ระบบด้วยรหัสผ่านถูกปิดใช้งานชั่วคราว
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
