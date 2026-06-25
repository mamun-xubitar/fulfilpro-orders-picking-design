'use client';

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { isDecoratorRole } from "@/lib/roles";
import DecorationPage from "./modules";

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user?.role as string) ?? "";
  const allowed = role === "admin" || isDecoratorRole(role);

  useEffect(() => {
    if (status === "authenticated" && !allowed) router.replace("/");
  }, [status, allowed, router]);

  if (status !== "authenticated" || !allowed) return null;
  return <DecorationPage />;
}
