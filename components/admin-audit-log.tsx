type AuditEntry = {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
};

export function AdminAuditLog({ logs }: { logs: AuditEntry[] }) {
  return (
    <section>
      <h2 className="notion-heading mb-1 text-lg font-semibold text-stone-900 dark:text-stone-100">
        บันทึกระบบล่าสุด
      </h2>
      <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
        แสดง 20 รายการล่าสุด
      </p>
      <div className="space-y-2 text-sm">
        {logs.map((log) => (
          <div
            key={log.id}
            className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 dark:border-stone-800 dark:bg-stone-900"
          >
            <span className="mr-2 inline-block rounded bg-stone-200 px-2 py-0.5 text-xs font-semibold dark:bg-stone-700">
              {log.action}
            </span>
            <span>{log.detail}</span>
            <span className="ml-2 text-stone-500 dark:text-stone-400">
              ({log.createdAt})
            </span>
          </div>
        ))}
        {logs.length === 0 ? (
          <p className="text-stone-500 dark:text-stone-400">
            ยังไม่มีประวัติการทำรายการ
          </p>
        ) : null}
      </div>
    </section>
  );
}
