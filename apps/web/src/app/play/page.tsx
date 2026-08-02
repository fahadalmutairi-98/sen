"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CLASSIC_POWER_UPS,
  MODE_PRESETS,
  POWER_UP_META,
  type CategoryDef,
  type PowerUpType,
} from "@seen/shared";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { tl, useT } from "@/lib/i18n";
import { Button, Card, Logo, Screen } from "@/components/ui";
import { CategoryCard } from "@/components/CategoryCard";
import Link from "next/link";

type Step = "mode" | "teams" | "categories" | "powerups";

export default function PlaySetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("mode");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const locale = useApp((s) => s.locale);
  const t = useT(locale);
  const mode = useApp((s) => s.mode);
  const setMode = useApp((s) => s.setMode);
  const timerSeconds = useApp((s) => s.timerSeconds);
  const setTimerSeconds = useApp((s) => s.setTimerSeconds);
  const teamAName = useApp((s) => s.teamAName);
  const teamBName = useApp((s) => s.teamBName);
  const setTeamNames = useApp((s) => s.setTeamNames);
  const categories = useApp((s) => s.categories);
  const setCategories = useApp((s) => s.setCategories);
  const selectedA = useApp((s) => s.selectedA);
  const selectedB = useApp((s) => s.selectedB);
  const toggleCategory = useApp((s) => s.toggleCategory);
  const setRandomCategories = useApp((s) => s.setRandomCategories);
  const powerUpsA = useApp((s) => s.powerUpsA);
  const powerUpsB = useApp((s) => s.powerUpsB);
  const togglePowerUp = useApp((s) => s.togglePowerUp);
  const setRoom = useApp((s) => s.setRoom);
  const setGame = useApp((s) => s.setGame);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  useEffect(() => {
    api<CategoryDef[]>("/categories")
      .then(setCategories)
      .catch(() => setError(locale === "ar" ? "تعذر تحميل الفئات" : "Failed to load categories"));
  }, [setCategories, locale]);

  async function startLocal() {
    setLoading(true);
    setError("");
    try {
      const categoryIds = [...selectedA, ...selectedB];
      const selectedBy: Record<string, "A" | "B"> = {};
      selectedA.forEach((id) => (selectedBy[id] = "A"));
      selectedB.forEach((id) => (selectedBy[id] = "B"));

      const res = await api<{
        room: { code: string };
        game: import("@seen/shared").GameState;
        hostId: string;
      }>("/games/local", {
        method: "POST",
        body: JSON.stringify({
          teamAName,
          teamBName,
          categoryIds,
          selectedBy,
          powerUpsA,
          powerUpsB,
          settings: {
            mode,
            timerSeconds,
            ...MODE_PRESETS[mode],
            language: locale,
          },
        }),
      });

      setRoom(res.room.code, res.hostId);
      setGame(res.game);
      router.push(`/game/${res.game.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const modes = [
    { id: "CLASSIC" as const, label: t("classic") },
    { id: "QUICK" as const, label: t("quick") },
    { id: "PARTY" as const, label: t("party") },
    { id: "CUSTOM" as const, label: t("custom") },
  ];

  return (
    <Screen>
      <header className="mb-6 flex items-center justify-between">
        <Link href="/">
          <Logo size="sm" />
        </Link>
        <div className="text-sm text-white/50">
          {step === "mode" && "1/4"}
          {step === "teams" && "2/4"}
          {step === "categories" && "3/4"}
          {step === "powerups" && "4/4"}
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/20 px-4 py-2 text-red-200">{error}</div>
      )}

      {step === "mode" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 flex-col gap-6">
          <h1 className="font-display text-3xl font-bold">{t("createGame")}</h1>
          <div className="grid gap-3 sm:grid-cols-2">
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-3xl border p-6 text-start transition ${
                  mode === m.id
                    ? "border-[var(--sj-gold)] bg-[var(--sj-gold)]/10"
                    : "border-white/10 bg-black/30 hover:border-white/25"
                }`}
              >
                <div className="font-display text-2xl font-bold">{m.label}</div>
              </button>
            ))}
          </div>
          {mode === "CUSTOM" && (
            <Card>
              <label className="block text-sm text-white/60">{t("timer")}</label>
              <input
                type="range"
                min={10}
                max={60}
                value={timerSeconds}
                onChange={(e) => setTimerSeconds(Number(e.target.value))}
                className="mt-2 w-full"
              />
              <div className="mt-1 font-display text-xl text-[var(--sj-gold)]">
                {timerSeconds}s
              </div>
            </Card>
          )}
          <Button variant="primary" onClick={() => setStep("teams")}>
            {t("next")}
          </Button>
        </motion.div>
      )}

      {step === "teams" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 flex-col gap-6">
          <h1 className="font-display text-3xl font-bold">{t("teamSetup")}</h1>
          <Card>
            <label className="text-sm text-[var(--sj-team-a)]">{t("teamA")}</label>
            <input
              value={teamAName}
              onChange={(e) => setTeamNames(e.target.value, teamBName)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-[var(--sj-team-a)]"
            />
          </Card>
          <Card>
            <label className="text-sm text-[var(--sj-team-b)]">{t("teamB")}</label>
            <input
              value={teamBName}
              onChange={(e) => setTeamNames(teamAName, e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-[var(--sj-team-b)]"
            />
          </Card>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep("mode")}>
              {t("back")}
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => setStep("categories")}>
              {t("next")}
            </Button>
          </div>
        </motion.div>
      )}

      {step === "categories" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 flex-col gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">{t("pickCategories")}</h1>
            <p className="mt-1 text-white/60">{t("pickCategoriesHint")}</p>
          </div>
          <Button variant="ghost" onClick={setRandomCategories}>
            {t("randomCats")}
          </Button>
          <div className="flex gap-4 text-sm">
            <span className="text-[var(--sj-team-a)]">
              {teamAName}: {selectedA.length}/3
            </span>
            <span className="text-[var(--sj-team-b)]">
              {teamBName}: {selectedB.length}/3
            </span>
          </div>
          <div className="grid max-h-[58vh] grid-cols-2 gap-3 overflow-y-auto pb-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {categories.map((c) => {
              const inA = selectedA.includes(c.id);
              const inB = selectedB.includes(c.id);
              return (
                <CategoryCard
                  key={c.id}
                  category={c}
                  locale={locale}
                  selected={inA || inB}
                  selectedColor={
                    inA ? "var(--sj-team-a)" : inB ? "var(--sj-team-b)" : undefined
                  }
                  selectedLabel={inA ? teamAName : inB ? teamBName : undefined}
                  onClick={() => {
                    if (inA) toggleCategory("A", c.id);
                    else if (inB) toggleCategory("B", c.id);
                    else if (selectedA.length < 3) toggleCategory("A", c.id);
                    else if (selectedB.length < 3) toggleCategory("B", c.id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (inB) toggleCategory("B", c.id);
                    else if (!inA && selectedB.length < 3) toggleCategory("B", c.id);
                  }}
                />
              );
            })}
          </div>
          <p className="text-xs text-white/40">
            {locale === "ar"
              ? "اضغط لاختيار فئة للفريق الأول، كليك يمين للفريق الثاني"
              : "Click for Team A, right-click for Team B"}
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep("teams")}>
              {t("back")}
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              disabled={selectedA.length !== 3 || selectedB.length !== 3}
              onClick={() => setStep("powerups")}
            >
              {t("next")}
            </Button>
          </div>
        </motion.div>
      )}

      {step === "powerups" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 flex-col gap-6">
          <div>
            <h1 className="font-display text-3xl font-bold">{t("pickPowerUps")}</h1>
            <p className="mt-1 text-white/60">{t("pickPowerUpsHint")}</p>
          </div>

          {(["A", "B"] as const).map((team) => (
            <div key={team}>
              <h2
                className="mb-2 font-display text-lg"
                style={{
                  color: team === "A" ? "var(--sj-team-a)" : "var(--sj-team-b)",
                }}
              >
                {team === "A" ? teamAName : teamBName} (
                {(team === "A" ? powerUpsA : powerUpsB).length}/3)
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {CLASSIC_POWER_UPS.map((p) => {
                  const selected = (team === "A" ? powerUpsA : powerUpsB).includes(p);
                  return (
                    <button
                      key={`${team}-${p}`}
                      onClick={() => togglePowerUp(team, p as PowerUpType)}
                      className={`rounded-2xl border p-3 text-start ${
                        selected
                          ? "border-[var(--sj-gold)] bg-[var(--sj-gold)]/15"
                          : "border-white/10 bg-black/30"
                      }`}
                    >
                      <div className="font-display font-bold">
                        {tl(POWER_UP_META[p].name, locale)}
                      </div>
                      <div className="mt-1 text-xs text-white/55">
                        {tl(POWER_UP_META[p].description, locale)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep("categories")}>
              {t("back")}
            </Button>
            <Button
              variant="gold"
              className="flex-1"
              disabled={
                loading || powerUpsA.length !== 3 || powerUpsB.length !== 3
              }
              onClick={startLocal}
            >
              {loading ? t("loading") : t("start")}
            </Button>
          </div>
        </motion.div>
      )}
    </Screen>
  );
}
