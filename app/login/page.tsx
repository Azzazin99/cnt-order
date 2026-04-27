import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";
import { isLocalLoginEnabled } from "@/lib/auth";

export default function LoginPage() {
  const showLocalLogin = isLocalLoginEnabled();
  return (
    <Suspense fallback={null}>
      <LoginForm showLocalLogin={showLocalLogin} />
    </Suspense>
  );
}
