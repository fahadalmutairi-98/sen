"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type {
  CategoryDef,
  GameState,
  PowerUpType,
  QuestionPublic,
  TeamId,
} from "@seen/shared";
import { POWER_UP_META } from "@seen/shared";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { tl, useT } from "@/lib/i18n";
import { Screen, Logo, Button } from "@/components/ui";
import { GameBoard } from "@/components/GameBoard";
import { GameSidebar, QuestionScreen } from "@/components/QuestionFlow";
import { WinnerScreen } from "@/components/WinnerScreen";
import Link from "next/link";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const locale = useApp((s) => s.locale);
  const t = useT(locale);
  const categories = useApp((s) => s.categories);
  const setCategories = useApp((s) => s.setCategories);
  const storedGame = useApp((s) => s.game);
  const setGame = useApp((s) => s.setGame);
  const question = useApp((s) => s.question);
  const setQuestion = useApp((s) => s.setQuestion);
  const setAnswerResult = useApp((s) => s.setAnswerResult);

  const [game, setLocalGame] = useState<GameState | null>(
    storedGame?.id === gameId ? storedGame : null
  );
  const [loading, setLoading] = useState(!game);
  const [powerUpMessage, setPowerUpMessage] = useState("");

  const syncGame = useCallback(
    (g: GameState) => {
      setLocalGame(g);
      setGame(g);
    },
    [setGame]
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  useEffect(() => {
    if (!categories.length) {
      api<CategoryDef[]>("/categories").then(setCategories).catch(console.error);
    }
  }, [categories.length, setCategories]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ game: GameState; question?: QuestionPublic | null }>(
          `/games/${gameId}`
        );
        if (!cancelled) {
          syncGame(res.game);
          if (res.question) setQuestion(res.question);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
          if (!game) router.push("/play");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  async function selectCell(categoryId: string, slotIndex: number) {
    if (!game || game.phase !== "BOARD") return;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/games/${gameId}/select`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, slotIndex }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      syncGame(data.game);
      setQuestion(data.question);
      setAnswerResult(null);
      setPowerUpMessage("");
    } else {
      const err = await res.json().catch(() => ({}));
      setPowerUpMessage(err.error ?? "Error");
    }
  }

  async function revealAnswer() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/games/${gameId}/reveal`,
      { method: "POST" }
    );
    if (res.ok) {
      const data = (await res.json()) as {
        game: GameState;
        question: QuestionPublic | null;
      };
      syncGame(data.game);
      if (data.question) setQuestion(data.question);
      setPowerUpMessage("");
    }
  }

  async function awardPoints(awardedTo: TeamId | null) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/games/${gameId}/award`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awardedTo }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      syncGame(data.game);
      setAnswerResult(data.result);
      setQuestion(null);
      setPowerUpMessage("");
    }
  }

  async function usePowerUp(powerUp: PowerUpType, teamId?: TeamId) {
    if (!game) return;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/games/${gameId}/powerup`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: teamId ?? game.currentTurn,
          powerUp,
        }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPowerUpMessage(
        data.error ?? (locale === "ar" ? "تعذر استخدام الوسيلة" : "Power-up failed")
      );
      return;
    }
    syncGame(data.game);
    if (data.question) {
      setQuestion({
        ...data.question,
        hint: data.question.hint ?? question?.hint,
      });
    }
    setPowerUpMessage(
      locale === "ar"
        ? `تم تفعيل: ${tl(POWER_UP_META[powerUp].name, locale)}`
        : `Activated: ${tl(POWER_UP_META[powerUp].name, locale)}`
    );
  }

  async function adjustScore(teamId: TeamId, delta: number) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/games/${gameId}/score`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, delta }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      syncGame(data.game);
    }
  }

  async function finishEarly() {
    const ok =
      typeof window === "undefined" ||
      window.confirm(
        locale === "ar"
          ? "هل تريد إنهاء اللعبة الآن؟"
          : "Finish the game now?"
      );
    if (!ok) return;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/games/${gameId}/finish`,
      { method: "POST" }
    );
    if (res.ok) {
      const data = await res.json();
      syncGame(data.game);
      setQuestion(null);
      setAnswerResult(null);
    }
  }

  async function continueGame() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/games/${gameId}/continue`,
      { method: "POST" }
    );
    if (res.ok) {
      const data = await res.json();
      syncGame(data.game);
      setQuestion(null);
      setAnswerResult(null);
      setPowerUpMessage("");
    }
  }

  if (loading || !game) {
    return (
      <Screen>
        <div className="flex flex-1 items-center justify-center font-display text-2xl text-[var(--sj-gold)]">
          {t("loading")}
        </div>
      </Screen>
    );
  }

  const onQuestion =
    (game.phase === "QUESTION" || game.phase === "REVEAL") && question;

  return (
    <Screen wide className="game-screen">
      <header className="mb-2 flex shrink-0 items-center justify-between landscape:mb-1">
        <Link href="/">
          <Logo size="sm" />
        </Link>
      </header>

      {game.phase === "FINISHED" ? (
        <WinnerScreen game={game} locale={locale} />
      ) : onQuestion ? (
        <div className="min-h-0 flex-1">
          <QuestionScreen
            game={game}
            question={question}
            locale={locale}
            onReveal={revealAnswer}
            onAward={awardPoints}
            onUsePowerUp={usePowerUp}
            onAdjustScore={adjustScore}
            onFinish={finishEarly}
            powerUpMessage={powerUpMessage}
          />
        </div>
      ) : game.phase === "BOARD" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 landscape:flex-row landscape:gap-4">
          <div className="w-full shrink-0 landscape:w-60 landscape:overflow-y-auto md:w-72 lg:w-80">
            <GameSidebar
              game={game}
              locale={locale}
              onUsePowerUp={usePowerUp}
              onAdjustScore={adjustScore}
              onFinish={finishEarly}
              powerUpMessage={powerUpMessage}
            />
          </div>
          <div className="min-h-0 min-w-0 flex-1">
            <GameBoard
              game={game}
              categories={categories}
              locale={locale}
              onSelect={selectCell}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-white/60">{t("loading")}</p>
          <Button variant="ghost" onClick={() => continueGame()}>
            {t("back")}
          </Button>
        </div>
      )}
    </Screen>
  );
}
