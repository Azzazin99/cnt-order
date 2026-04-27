"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";

const errorMessages: Record<string, string> = {
  google_config: "ยังไม่ได้ตั้งค่า Google OAuth",
  google_oauth: "การเข้าสู่ระบบ Google ถูกยกเลิกหรือล้มเหลว",
  google_missing: "ข้อมูล callback จาก Google ไม่ครบ",
  google_state: "ตรวจสอบความปลอดภัย OAuth ไม่ผ่าน ลองเข้าใหม่",
  google_token: "แลก token กับ Google ไม่สำเร็จ",
  google_profile: "ดึงข้อมูลโปรไฟล์ Google ไม่สำเร็จ",
  google_email: "อีเมล Google ไม่พร้อมใช้หรือยังไม่ยืนยัน",
  microsoft_config: "ยังไม่ได้ตั้งค่า Microsoft OAuth",
  microsoft_oauth: "การเข้าสู่ระบบ Microsoft ถูกยกเลิกหรือล้มเหลว",
  microsoft_missing: "ข้อมูล callback จาก Microsoft ไม่ครบ",
  microsoft_state: "ตรวจสอบความปลอดภัย OAuth ไม่ผ่าน ลองเข้าใหม่",
  microsoft_token: "แลก token กับ Microsoft ไม่สำเร็จ",
  microsoft_profile: "ดึงข้อมูลโปรไฟล์ Microsoft ไม่สำเร็จ",
  microsoft_email: "อีเมล Microsoft ไม่พร้อมใช้หรือยังไม่ยืนยัน",
  domain_not_allowed: "โดเมนอีเมลของคุณยังไม่อยู่ในรายการที่อนุญาต ติดต่อผู้ดูแลระบบเขต",
};

export function LoginForm({ showLocalLogin }: { showLocalLogin: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const errorText = errorCode ? errorMessages[errorCode] ?? errorCode : null;

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      alert(data?.error ?? "รหัสผ่านไม่ถูกต้อง");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50/50 to-stone-100 px-4 py-8 text-stone-800 dark:from-stone-950 dark:via-stone-900 dark:to-stone-900 dark:text-stone-100 md:py-10">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white/95 p-5 shadow-xl shadow-stone-300/30 backdrop-blur transition duration-200 dark:border-stone-800 dark:bg-stone-950/90 dark:shadow-black/20 md:p-7">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
              CNT ORDER
            </p>
            <h1 className="notion-heading mt-1 text-xl font-semibold text-stone-900 md:text-2xl dark:text-stone-100">
              เข้าสู่ระบบผู้ดูแล
            </h1>
          </div>
          <ThemeToggle />
        </div>
        <p className="mb-5 text-sm text-stone-500 dark:text-stone-400">
          เข้าถึงแดชบอร์ดจัดการเอกสารและผู้ใช้งานในระบบ
        </p>

        {errorText ? (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
            {errorText}
          </p>
        ) : null}

        <div className="mb-5 grid gap-2">
        <a
          href="/api/auth/google"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </a>
        <a
          href="/api/auth/microsoft"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
        >
          <svg className="h-5 w-5" viewBox="0 0 21 21" aria-hidden>
            <rect x="0" y="0" width="10" height="10" fill="#f25022" />
            <rect x="11" y="0" width="10" height="10" fill="#7fba00" />
            <rect x="0" y="11" width="10" height="10" fill="#00a4ef" />
            <rect x="11" y="11" width="10" height="10" fill="#ffb900" />
          </svg>
          Sign in with Microsoft
        </a>
        </div>

        {showLocalLogin ? (
          <>
            <div className="relative mb-5 text-center text-xs text-stone-400">
              <span className="relative z-10 bg-white px-2 dark:bg-stone-950">หรือใช้รหัสผ่านในระบบ</span>
              <div className="absolute inset-x-0 top-1/2 z-0 h-px bg-stone-200 dark:bg-stone-700" />
            </div>
            <form onSubmit={handleSubmit} className="grid gap-3.5">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-800 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
                placeholder="ชื่อผู้ใช้"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-800 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
                placeholder="รหัสผ่านผู้ดูแล"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="mt-1 inline-flex items-center justify-center rounded-xl bg-stone-800 px-4 py-2.5 font-medium text-white shadow-sm shadow-stone-500/30 transition duration-200 hover:-translate-y-0.5 hover:bg-stone-900 focus:ring-2 focus:ring-amber-300 focus:outline-none disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
              </button>
            </form>
          </>
        ) : (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            การเข้าด้วยรหัสผ่านถูกปิด — ใช้ Google เท่านั้น
          </p>
        )}

        <p className="mt-5 text-xs text-stone-500 dark:text-stone-400">
          ตั้งค่า `AUTH_SESSION_SECRET`, Google/Microsoft OAuth และโดเมนโรงเรียนในแดชบอร์ด
        </p>
        {showLocalLogin ? (
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            บัญชีทดสอบ: admin/editor (รหัสผ่านตาม role + 1234) เมื่อยังไม่ได้ตั้งค่า hash
          </p>
        ) : null}
      </div>
    </main>
  );
}
