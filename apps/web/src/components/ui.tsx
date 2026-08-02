"use client";

import { motion } from "framer-motion";
import { type CSSProperties, type ReactNode } from "react";

export function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "gold" | "ghost" | "teamA" | "teamB";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  style?: CSSProperties;
}) {
  const styles = {
    primary:
      "bg-[var(--sj-primary)] hover:bg-[var(--sj-primary-light)] text-[var(--sj-navy)] shadow-lg shadow-pink-900/30",
    gold: "bg-[var(--sj-gold)] hover:brightness-110 text-[var(--sj-navy)] shadow-lg shadow-purple-900/25",
    ghost:
      "bg-white/5 hover:bg-white/10 text-[var(--sj-cream)] border border-[var(--sj-primary)]/25",
    teamA: "bg-[var(--sj-team-a)] hover:brightness-110 text-white",
    teamB: "bg-[var(--sj-team-b)] hover:brightness-110 text-white",
  };

  return (
    <motion.button
      type={type}
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={`rounded-2xl px-6 py-3 font-display text-lg font-bold transition disabled:opacity-40 ${styles[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  /** Stacked سؤال / جواب mark — taller than wide */
  const sizes = {
    sm: "h-9 w-auto",
    md: "h-14 w-auto",
    lg: "h-24 w-auto md:h-28",
  };
  return (
    <img
      src="/logo.svg"
      alt="سؤال جواب"
      width={32}
      height={28}
      className={`${sizes[size]} select-none`}
      draggable={false}
    />
  );
}

export function Screen({
  children,
  className = "",
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className={`sj-gradient sj-pattern min-h-dvh ${className}`}>
      <div
        className={`mx-auto flex min-h-dvh w-full flex-col px-3 py-3 md:px-6 md:py-5 landscape:px-3 landscape:py-2 ${
          wide ? "max-w-[1400px]" : "max-w-6xl"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-black/30 p-5 backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}
