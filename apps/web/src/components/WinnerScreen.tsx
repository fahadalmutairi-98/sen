"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import type { GameState, Locale } from "@seen/shared";
import { useT } from "@/lib/i18n";
import { Button, Logo } from "./ui";
import Link from "next/link";

export function WinnerScreen({
  game,
  locale,
}: {
  game: GameState;
  locale: Locale;
}) {
  const t = useT(locale);

  useEffect(() => {
    const end = Date.now() + 2500;
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#FFB7CE", "#D4B8F0", "#ffffff"],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#FFB7CE", "#D4B8F0", "#ffffff"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const winner =
    game.winner === "DRAW"
      ? null
      : game.winner
        ? game.teams[game.winner]
        : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-1 flex-col items-center justify-center gap-8 text-center"
    >
      <Logo size="md" />
      <div className="font-display text-xl text-white/70">{t("finished")}</div>
      {winner ? (
        <>
          <div className="text-lg text-[var(--sj-gold)]">{t("winner")}</div>
          <h1 className="font-display text-5xl font-black md:text-7xl">
            {winner.name}
          </h1>
          <div className="font-display text-4xl text-[var(--sj-gold)]">
            {winner.score}
          </div>
        </>
      ) : (
        <h1 className="font-display text-5xl font-black">{t("draw")}</h1>
      )}

      <div className="grid w-full max-w-md grid-cols-2 gap-4">
        {(["A", "B"] as const).map((id) => (
          <div
            key={id}
            className="rounded-2xl border border-white/10 bg-black/40 p-4"
          >
            <div className="font-display font-bold">{game.teams[id].name}</div>
            <div className="text-2xl text-[var(--sj-gold)]">
              {game.teams[id].score}
            </div>
            <div className="mt-2 text-xs text-white/50">
              ✓ {game.teams[id].stats.correct} · ✗ {game.teams[id].stats.wrong}
            </div>
          </div>
        ))}
      </div>

      <Link href="/play">
        <Button variant="gold">{t("playAgain")}</Button>
      </Link>
    </motion.div>
  );
}
