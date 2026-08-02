"use client";

import { motion } from "framer-motion";
import type { CategoryDef, GameState, Locale } from "@seen/shared";
import { CategoryCard } from "./CategoryCard";

export function GameBoard({
  game,
  categories,
  locale,
  onSelect,
}: {
  game: GameState;
  categories: CategoryDef[];
  locale: Locale;
  onSelect: (categoryId: string, slotIndex: number) => void;
}) {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const canSelect = game.phase === "BOARD";

  return (
    <div className="board-enter h-full w-full overflow-auto">
      <div
        className="grid h-full min-h-0 gap-1.5 sm:gap-2 landscape:gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${game.board.length}, minmax(0, 1fr))`,
        }}
      >
        {game.board.map((col, ci) => {
          const cat = catMap[col.categoryId];
          const fallback: CategoryDef = {
            id: col.categoryId,
            slug: col.categoryId,
            name: { ar: col.categoryId, en: col.categoryId },
            description: { ar: "", en: "" },
            icon: "folder",
            color: "#FFB7CE",
            accentColor: "#D4B8F0",
            image: `/categories/${col.categoryId}.svg`,
          };
          return (
            <div key={col.categoryId} className="flex min-h-0 flex-col gap-1.5 sm:gap-2">
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ci * 0.04 }}
                className="shrink-0"
              >
                <CategoryCard
                  category={cat ?? fallback}
                  locale={locale}
                  compact
                  as="div"
                />
              </motion.div>

              {col.cells.map((cell, pi) => {
                const answered = cell.answered;
                return (
                  <motion.button
                    key={`${col.categoryId}-${cell.slotIndex}`}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: ci * 0.04 + pi * 0.02 }}
                    disabled={!canSelect || answered}
                    onClick={() => onSelect(col.categoryId, cell.slotIndex)}
                    className={`cell-glow relative flex min-h-0 max-h-[100px] flex-1 items-center justify-center rounded-xl border font-display text-lg font-black transition sm:text-xl md:text-2xl landscape:rounded-lg landscape:text-base ${
                      answered
                        ? "cursor-default border-white/5 bg-black/50 text-white/20"
                        : "border-[var(--sj-primary)]/35 bg-gradient-to-b from-[#2a1820] to-[#161018] text-[var(--sj-primary)] hover:border-[var(--sj-primary)] active:scale-95"
                    }`}
                  >
                    {answered ? (
                      <span
                        className={
                          cell.correct ? "text-emerald-400/50" : "text-red-400/40"
                        }
                      >
                        ✓
                      </span>
                    ) : (
                      cell.points
                    )}
                  </motion.button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
