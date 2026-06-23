import { redirect } from "next/navigation";
import { Suspense } from "react";

import { UnifiedLoginForm } from "@/components/unified-login-form";
import { isAuthenticated, isLocalLoginEnabled } from "@/lib/auth";

export default async function Home() {
  if (await isAuthenticated()) {
    redirect("/admin");
  }

  const showLocalLogin = isLocalLoginEnabled();

  return (
    <Suspense fallback={null}>
      <UnifiedLoginForm showLocalLogin={showLocalLogin} />
    </Suspense>
  );
}
