import { Suspense } from "react";
import LoginPage from "./modules";

export default function Page() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPage />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center">
      <div className="text-sm text-gray-500">Loading...</div>
    </div>
  );
}
