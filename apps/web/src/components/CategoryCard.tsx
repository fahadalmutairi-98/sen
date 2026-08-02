"use client";

import type { CSSProperties, MouseEvent } from "react";
import type { CategoryDef, Locale } from "@seen/shared";
import { tl } from "@/lib/i18n";

type Props = {
  category: CategoryDef;
  locale: Locale;
  selected?: boolean;
  selectedLabel?: string;
  selectedColor?: string;
  onClick?: () => void;
  onContextMenu?: (e: MouseEvent) => void;
  /** Compact for game board column headers */
  compact?: boolean;
  className?: string;
  as?: "button" | "div";
};

/**
 * Tahdani-style category card: portrait cover + title over gradient.
 * @see https://www.tahdani.sa/#categories
 */
export function CategoryCard({
  category,
  locale,
  selected,
  selectedLabel,
  selectedColor,
  onClick,
  onContextMenu,
  compact,
  className = "",
  as = "button",
}: Props) {
  const title = tl(category.name, locale);
  const cover = category.image || `/categories/${category.id}.svg`;
  const Tag = as === "div" ? "div" : "button";

  return (
    <Tag
      type={as === "button" ? "button" : undefined}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`group relative block w-full overflow-hidden rounded-2xl text-start shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition duration-200 ${
        compact ? "rounded-xl" : "hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(255,183,206,0.18)]"
      } ${
        selected
          ? "ring-2 ring-offset-2 ring-offset-[var(--sj-navy)]"
          : "ring-1 ring-white/10"
      } ${className}`}
      style={
        selected && selectedColor
          ? ({ "--tw-ring-color": selectedColor } as CSSProperties)
          : undefined
      }
    >
      <div
        className={`relative w-full overflow-hidden ${
          compact ? "aspect-[4/3]" : "aspect-[3/4] sm:aspect-[3/4]"
        }`}
        style={{
          background: `linear-gradient(160deg, ${category.color}, ${category.accentColor})`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = "0";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <div
          className={`absolute inset-x-0 bottom-0 z-10 ${
            compact ? "px-1.5 py-2" : "px-3 py-3 sm:px-4 sm:py-4"
          }`}
        >
          <div
            className={`text-center font-display font-extrabold leading-tight text-white drop-shadow-md ${
              compact
                ? "text-[10px] sm:text-xs landscape:text-[9px]"
                : "text-sm sm:text-base md:text-lg"
            }`}
          >
            {title}
          </div>
          {selectedLabel && (
            <div
              className="mt-1 text-center text-[10px] font-bold sm:text-xs"
              style={{ color: selectedColor ?? "var(--sj-primary)" }}
            >
              {selectedLabel}
            </div>
          )}
        </div>
      </div>
    </Tag>
  );
}
