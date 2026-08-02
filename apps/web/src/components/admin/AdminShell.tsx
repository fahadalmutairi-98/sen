"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { Logo } from "@/components/ui";
import { useApp } from "@/lib/store";

const NAV = [
  { href: "/admin", labelAr: "نظرة عامة", labelEn: "Overview", exact: true },
  { href: "/admin/categories", labelAr: "الفئات", labelEn: "Categories" },
  { href: "/admin/questions", labelAr: "كل الأسئلة", labelEn: "All questions" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const token = useApp((s) => s.token);
  const user = useApp((s) => s.user);
  const logout = useApp((s) => s.logout);
  const locale = useApp((s) => s.locale);
  const pathname = usePathname();
  const router = useRouter();
  const ar = locale === "ar";

  useEffect(() => {
    if (!token) router.replace("/admin/login");
  }, [token, router]);

  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[var(--sj-gold)]">
        {ar ? "جاري التحويل..." : "Redirecting..."}
      </div>
    );
  }

  return (
    <div className="sj-gradient sj-pattern min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-[1400px] flex-col md:flex-row">
        <aside className="shrink-0 border-b border-white/10 bg-black/40 p-4 md:w-64 md:border-b-0 md:border-e md:p-5">
          <div className="mb-6 flex items-center justify-between gap-3 md:mb-8 md:block">
            <Link href="/">
              <Logo size="sm" />
            </Link>
            <p className="mt-0 text-xs text-white/45 md:mt-2">
              {ar ? "لوحة التحكم" : "Admin"} · {user?.displayName}
            </p>
          </div>

          <nav className="flex gap-2 overflow-x-auto md:flex-col md:gap-1.5">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    active
                      ? "bg-[var(--sj-gold)]/20 text-[var(--sj-gold)]"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {ar ? item.labelAr : item.labelEn}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/admin/login");
            }}
            className="mt-6 w-full rounded-xl border border-white/10 px-3 py-2 text-sm text-white/60 transition hover:bg-white/5"
          >
            {ar ? "خروج" : "Logout"}
          </button>
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
