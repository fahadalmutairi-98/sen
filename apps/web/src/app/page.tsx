"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Button, Logo, Screen } from "@/components/ui";

export default function HomePage() {
  const [splash, setSplash] = useState(true);
  const locale = useApp((s) => s.locale);
  const setLocale = useApp((s) => s.setLocale);
  const t = useT(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  useEffect(() => {
    const id = setTimeout(() => setSplash(false), 1800);
    return () => clearTimeout(id);
  }, []);

  return (
    <Screen>
      <AnimatePresence mode="wait">
        {splash ? (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-1 flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 160 }}
            >
              <Logo size="lg" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 font-display text-xl text-[var(--sj-primary)]"
            >
              {t("tagline")}
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col"
          >
            <header className="flex items-center justify-between">
              <Logo size="sm" />
              <button
                onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
                className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/80 hover:bg-white/5"
              >
                {t("language")}
              </button>
            </header>

            <main className="flex flex-1 flex-col items-center justify-center gap-8 py-10 text-center">
              <div>
                <Logo size="lg" />
                <p className="mt-4 font-display text-2xl text-[var(--sj-primary)] md:text-3xl">
                  {t("tagline")}
                </p>
                <p className="mx-auto mt-3 max-w-md text-white/65">{t("subtitle")}</p>
              </div>

              <div className="flex w-full max-w-sm flex-col gap-3">
                <Link href="/play" className="w-full">
                  <Button className="w-full" variant="primary">
                    {t("createGame")}
                  </Button>
                </Link>
                <Link href="/admin" className="w-full">
                  <Button className="w-full" variant="ghost">
                    {t("admin")}
                  </Button>
                </Link>
              </div>
            </main>

            <footer className="pb-2 text-center text-xs text-white/35">
              © {new Date().getFullYear()} سؤال جواب — Su&apos;al Jawab
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}
