"use client";

import { motion } from "framer-motion";
import type {
  GameState,
  Locale,
  PowerUpType,
  QuestionMedia,
  QuestionPublic,
  TeamId,
} from "@seen/shared";
import {
  POWER_UP_META,
  BEFORE_QUESTION_POWERUPS,
  AFTER_QUESTION_POWERUPS,
} from "@seen/shared";
import { tl, useT } from "@/lib/i18n";
import { Button } from "./ui";
import { useCountdown } from "@/lib/hooks";
import Link from "next/link";

function QuestionMediaPlayer({
  media,
  locale,
}: {
  media: QuestionMedia;
  locale: Locale;
}) {
  const label =
    media.type === "image"
      ? locale === "ar"
        ? "صورة السؤال"
        : "Question image"
      : media.type === "audio"
        ? locale === "ar"
          ? "مقطع صوتي"
          : "Audio clip"
        : locale === "ar"
          ? "مقطع فيديو"
          : "Video clip";

  return (
    <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-black/50">
      <div className="border-b border-white/10 px-3 py-1.5 text-center text-[11px] uppercase tracking-wide text-white/45">
        {label}
      </div>
      {media.type === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.url}
          alt={label}
          className="mx-auto max-h-[42vh] w-full object-contain"
        />
      )}
      {media.type === "audio" && (
        <div className="flex flex-col items-center gap-3 p-6">
          {media.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.thumbnailUrl}
              alt=""
              className="h-24 w-24 rounded-2xl object-cover opacity-80"
            />
          )}
          <audio controls autoPlay={false} className="w-full max-w-md" src={media.url}>
            {locale === "ar" ? "متصفحك لا يدعم الصوت" : "Audio not supported"}
          </audio>
        </div>
      )}
      {media.type === "video" && (
        <video
          controls
          playsInline
          poster={media.thumbnailUrl}
          className="mx-auto max-h-[42vh] w-full bg-black"
          src={media.url}
        >
          {locale === "ar" ? "متصفحك لا يدعم الفيديو" : "Video not supported"}
        </video>
      )}
    </div>
  );
}

function TeamBlock({
  game,
  teamId,
  locale,
  onAdjustScore,
  onUsePowerUp,
}: {
  game: GameState;
  teamId: TeamId;
  locale: Locale;
  onAdjustScore: (teamId: TeamId, delta: number) => void;
  onUsePowerUp: (p: PowerUpType, teamId: TeamId) => void;
}) {
  const t = useT(locale);
  const team = game.teams[teamId];
  const isTurn = game.currentTurn === teamId;
  const chosen = team.chosenPowerUps?.length
    ? team.chosenPowerUps
    : (Object.entries(team.powerUps) as [PowerUpType, number][])
        .filter(([, n]) => n > 0)
        .map(([p]) => p);

  const phase = game.phase;
  const canUseNow = (p: PowerUpType) => {
    const left = (team.powerUps[p] ?? 0) > 0;
    if (!left || !isTurn) return false;
    if (phase === "BOARD") return BEFORE_QUESTION_POWERUPS.includes(p);
    if (phase === "QUESTION") return AFTER_QUESTION_POWERUPS.includes(p);
    return false;
  };

  return (
    <div
      className={`rounded-2xl border p-3 landscape:rounded-xl landscape:p-2.5 ${
        isTurn
          ? "border-[var(--sj-primary)] bg-black/50 shadow-[0_0_20px_rgba(255,183,206,0.2)]"
          : "border-white/10 bg-black/30"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div
          className="truncate font-display text-sm font-bold sm:text-base"
          style={{ color: team.color }}
        >
          {team.name}
        </div>
        {isTurn && (
          <span className="shrink-0 rounded-full bg-[var(--sj-gold)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--sj-gold)]">
            {t("yourTurn")}
          </span>
        )}
      </div>

      <div className="mb-3 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onAdjustScore(teamId, -100)}
          className="rounded-xl border border-white/15 bg-black/40 px-2.5 py-1.5 font-display text-sm font-bold text-red-300 transition hover:bg-red-500/20 active:scale-95"
        >
          −
        </button>
        <div className="min-w-[4.5rem] text-center font-display text-3xl font-black text-white landscape:text-2xl">
          {team.score}
        </div>
        <button
          type="button"
          onClick={() => onAdjustScore(teamId, 100)}
          className="rounded-xl border border-white/15 bg-black/40 px-2.5 py-1.5 font-display text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/20 active:scale-95"
        >
          +
        </button>
      </div>

      <div className="mb-1.5 text-[10px] uppercase tracking-wide text-white/45">
        {t("powerUps")}
      </div>
      <div className="flex flex-col gap-1.5">
        {chosen.length === 0 && <p className="text-[11px] text-white/35">—</p>}
        {chosen.map((p) => {
          const remaining = team.powerUps[p] ?? 0;
          const used = remaining <= 0;
          const armed = game.armedPowerUps.includes(p) && isTurn;
          const usable = canUseNow(p);
          return (
            <button
              key={`${teamId}-${p}`}
              type="button"
              disabled={!usable}
              onClick={() => onUsePowerUp(p, teamId)}
              className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-start transition ${
                used
                  ? "border-white/5 bg-black/20 opacity-45"
                  : armed
                    ? "border-[var(--sj-gold)] bg-[var(--sj-gold)]/20"
                    : usable
                      ? "border-white/20 bg-black/40 hover:border-[var(--sj-gold)]/60"
                      : "border-white/10 bg-black/25"
              }`}
            >
              <span
                className={`font-display text-xs font-bold ${
                  used ? "line-through text-white/40" : "text-[var(--sj-gold)]"
                }`}
              >
                {tl(POWER_UP_META[p].name, locale)}
              </span>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  used
                    ? "bg-white/5 text-white/40"
                    : armed
                      ? "bg-[var(--sj-gold)] text-[var(--sj-navy)]"
                      : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                {used ? t("used") : armed ? t("armed") : t("available")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GameSidebar({
  game,
  locale,
  onUsePowerUp,
  onAdjustScore,
  onFinish,
  powerUpMessage,
}: {
  game: GameState;
  locale: Locale;
  onUsePowerUp: (p: PowerUpType, teamId?: TeamId) => void;
  onAdjustScore: (teamId: TeamId, delta: number) => void;
  onFinish: () => void;
  powerUpMessage?: string;
}) {
  const t = useT(locale);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-2.5 landscape:gap-2">
      <div className="rounded-2xl border border-[var(--sj-gold)]/30 bg-gradient-to-b from-[var(--sj-gold)]/15 to-black/40 px-3 py-2.5 text-center landscape:rounded-xl">
        <div className="text-[10px] uppercase tracking-wide text-white/50">
          {t("yourTurn")}
        </div>
        <div className="font-display text-base font-black text-[var(--sj-gold)] sm:text-lg">
          {game.teams[game.currentTurn].name}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto landscape:space-y-2">
        <TeamBlock
          game={game}
          teamId="A"
          locale={locale}
          onAdjustScore={onAdjustScore}
          onUsePowerUp={(p, id) => onUsePowerUp(p, id)}
        />
        <TeamBlock
          game={game}
          teamId="B"
          locale={locale}
          onAdjustScore={onAdjustScore}
          onUsePowerUp={(p, id) => onUsePowerUp(p, id)}
        />
      </div>

      {powerUpMessage && (
        <p className="rounded-xl bg-white/10 px-2 py-1.5 text-center text-[11px] text-[var(--sj-gold)]">
          {powerUpMessage}
        </p>
      )}

      <div className="mt-auto flex shrink-0 gap-2">
        <Link href="/" className="flex-1">
          <button
            type="button"
            className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 font-display text-sm font-bold text-white/80 transition hover:bg-white/10"
          >
            {t("home")}
          </button>
        </Link>
        <button
          type="button"
          onClick={onFinish}
          className="flex-1 rounded-xl border border-[var(--sj-primary)]/50 bg-[var(--sj-primary)] px-3 py-2.5 font-display text-sm font-bold text-[var(--sj-navy)] transition hover:bg-[var(--sj-primary-light)]"
        >
          {t("finishGame")}
        </button>
      </div>
    </aside>
  );
}

export function QuestionScreen({
  game,
  question,
  locale,
  onReveal,
  onAward,
  onUsePowerUp,
  onAdjustScore,
  onFinish,
  powerUpMessage,
}: {
  game: GameState;
  question: QuestionPublic;
  locale: Locale;
  onReveal: () => void;
  onAward: (awardedTo: TeamId | null) => void;
  onUsePowerUp: (p: PowerUpType, teamId?: TeamId) => void;
  onAdjustScore: (teamId: TeamId, delta: number) => void;
  onFinish: () => void;
  powerUpMessage?: string;
}) {
  const t = useT(locale);
  const aq = game.activeQuestion!;
  const revealed = game.phase === "REVEAL" || aq.answerRevealed;
  const remaining = useCountdown(!revealed, aq.timerSeconds);
  const warn = !revealed && remaining <= 10;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 landscape:flex-row landscape:gap-4">
      <div className="order-2 w-full shrink-0 landscape:order-none landscape:w-64 landscape:overflow-y-auto md:w-72">
        <GameSidebar
          game={game}
          locale={locale}
          onUsePowerUp={onUsePowerUp}
          onAdjustScore={onAdjustScore}
          onFinish={onFinish}
          powerUpMessage={powerUpMessage}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="order-1 flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto landscape:order-none"
      >
        {!revealed && (
          <div
            className={`font-display text-5xl font-black landscape:text-4xl ${warn ? "timer-warn" : "text-[var(--sj-primary)]"}`}
          >
            {remaining}
          </div>
        )}

        <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-black/40 p-5 text-center landscape:p-4 md:p-8">
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-sm text-[var(--sj-gold)]">
            <span>
              {aq.points} {t("score")}
            </span>
            <span>·</span>
            <span>{game.teams[aq.answeringTeam].name}</span>
            {aq.pitActive && (
              <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-orange-300">
                {tl(POWER_UP_META.PIT.name, locale)}
              </span>
            )}
            {aq.doubleActive && (
              <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-yellow-300">
                ×2
              </span>
            )}
            {aq.trapActive && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-red-300">
                {tl(POWER_UP_META.TRAP.name, locale)}
              </span>
            )}
            {aq.restActive && (
              <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-cyan-300">
                {tl(POWER_UP_META.REST.name, locale)}
              </span>
            )}
            {aq.twoAnswersActive && (
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-violet-300">
                {t("twoAnswers")}
              </span>
            )}
          </div>
          <h2 className="font-display text-xl font-bold leading-relaxed md:text-3xl landscape:text-lg landscape:md:text-2xl">
            {tl(question.questionText, locale)}
          </h2>
          {question.media && (
            <div className="mt-4">
              <QuestionMediaPlayer media={question.media} locale={locale} />
            </div>
          )}
          {aq.hintRevealed && question.hint && (
            <p className="mt-4 rounded-xl bg-[var(--sj-gold)]/10 p-3 text-[var(--sj-gold)]">
              {t("hint")}: {tl(question.hint, locale)}
            </p>
          )}
        </div>

        {!revealed ? (
          <Button variant="gold" className="min-w-[12rem] text-lg" onClick={onReveal}>
            {t("showAnswer")}
          </Button>
        ) : (
          <div className="flex w-full max-w-3xl flex-col items-center gap-4">
            <div className="w-full rounded-3xl border border-[var(--sj-gold)]/40 bg-[var(--sj-gold)]/10 p-5 text-center md:p-6">
              <div className="text-sm text-white/60">{t("reveal")}</div>
              <div className="mt-2 font-display text-2xl font-bold text-[var(--sj-gold)] md:text-4xl">
                {tl(question.answer, locale)}
              </div>
              {question.explanation && (
                <p className="mt-3 text-white/70">{tl(question.explanation, locale)}</p>
              )}
            </div>

            <p className="text-white/70">{t("whoScored")}</p>
            <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => onAward("A")}
                style={{ backgroundColor: game.teams.A.color }}
              >
                {game.teams.A.name}
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => onAward("B")}
                style={{ backgroundColor: game.teams.B.color }}
              >
                {game.teams.B.name}
              </Button>
              <Button variant="ghost" className="flex-1" onClick={() => onAward(null)}>
                {t("neither")}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
