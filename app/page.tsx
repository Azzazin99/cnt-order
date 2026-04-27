import Link from "next/link";
import Image from "next/image";

import { DocumentTable } from "@/components/document-table";
import { ThemeToggle } from "@/components/theme-toggle";
import { getDocuments } from "@/lib/documents";

export default async function Home() {
  const rows = await getDocuments({ kind: "public" });

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-100 to-amber-50/50 px-4 py-8 text-stone-800 dark:from-stone-950 dark:to-stone-900 dark:text-stone-100">
      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-lg shadow-stone-300/20 md:p-6 dark:border-stone-800 dark:bg-stone-950 dark:shadow-black/20">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            จัดการเอกสาร
          </Link>
          <ThemeToggle />
        </div>

        <header className="mb-7 text-center">
          <div className="mx-auto mb-3 flex h-28 w-28 items-center justify-center rounded-2xl border border-amber-100 bg-white shadow-sm shadow-amber-200/40 dark:border-amber-900/50 dark:bg-stone-900 dark:shadow-black/30">
            <Image
              src="/3D-Logo.png"
              alt="โลโก้หน่วยงาน"
              width={92}
              height={92}
              className="h-24 w-24 object-contain"
              priority
            />
          </div>
          <h1 className="notion-heading text-2xl font-bold tracking-[0.02em] text-stone-900 md:text-4xl dark:text-stone-100">
            คลังคำสั่ง
            <span className="bg-gradient-to-r from-amber-700 via-orange-600 to-rose-500 bg-clip-text text-transparent dark:from-amber-300 dark:via-orange-300 dark:to-rose-300">
              ออนไลน์
            </span>
          </h1>
          <p className="mx-auto mt-1 max-w-3xl text-base font-medium leading-relaxed text-stone-700 md:text-xl dark:text-stone-200">
            สำนักงานเขตพื้นที่การศึกษาประถมศึกษาชัยนาท
          </p>
          <p className="mx-auto mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800 md:text-base dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            เอกสารคำสั่งและหนังสือราชการ
          </p>
        </header>

        <DocumentTable rows={rows} />
      </div>
    </main>
  );
}
