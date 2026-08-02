"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CategoryDef,
  GameState,
  Locale,
  PowerUpType,
  QuestionPublic,
  AnswerResult,
  GameMode,
} from "@seen/shared";

export type SetupStep =
  | "mode"
  | "teams"
  | "categories"
  | "powerups"
  | "ready";

interface AppState {
  locale: Locale;
  setLocale: (l: Locale) => void;

  token: string | null;
  user: { id: string; displayName: string; role?: string } | null;
  setAuth: (token: string, user: AppState["user"]) => void;
  logout: () => void;

  mode: GameMode;
  setMode: (m: GameMode) => void;
  timerSeconds: number;
  setTimerSeconds: (n: number) => void;

  teamAName: string;
  teamBName: string;
  setTeamNames: (a: string, b: string) => void;

  categories: CategoryDef[];
  setCategories: (c: CategoryDef[]) => void;
  selectedA: string[];
  selectedB: string[];
  toggleCategory: (team: "A" | "B", id: string) => void;
  setRandomCategories: () => void;

  powerUpsA: PowerUpType[];
  powerUpsB: PowerUpType[];
  togglePowerUp: (team: "A" | "B", p: PowerUpType) => void;

  roomCode: string | null;
  hostId: string | null;
  game: GameState | null;
  question: QuestionPublic | null;
  answerResult: AnswerResult | null;
  setRoom: (code: string, hostId: string) => void;
  setGame: (g: GameState | null) => void;
  setQuestion: (q: QuestionPublic | null) => void;
  setAnswerResult: (r: AnswerResult | null) => void;
  resetSetup: () => void;
}

const MAX_CATS = 3;
const MAX_PU = 3;

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      locale: "ar",
      setLocale: (locale) => set({ locale }),

      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),

      mode: "CLASSIC",
      setMode: (mode) =>
        set({
          mode,
          timerSeconds: mode === "QUICK" ? 45 : mode === "PARTY" ? 60 : 90,
        }),
      timerSeconds: 90,
      setTimerSeconds: (timerSeconds) => set({ timerSeconds }),

      teamAName: "الفريق الأول",
      teamBName: "الفريق الثاني",
      setTeamNames: (teamAName, teamBName) => set({ teamAName, teamBName }),

      categories: [],
      setCategories: (categories) => set({ categories }),
      selectedA: [],
      selectedB: [],
      toggleCategory: (team, id) => {
        const key = team === "A" ? "selectedA" : "selectedB";
        const other = team === "A" ? get().selectedB : get().selectedA;
        const current = get()[key];
        if (other.includes(id)) return;
        if (current.includes(id)) {
          set({ [key]: current.filter((x) => x !== id) });
        } else if (current.length < MAX_CATS) {
          set({ [key]: [...current, id] });
        }
      },
      setRandomCategories: () => {
        const cats = [...get().categories].sort(() => Math.random() - 0.5);
        set({
          selectedA: cats.slice(0, 3).map((c) => c.id),
          selectedB: cats.slice(3, 6).map((c) => c.id),
        });
      },

      powerUpsA: [],
      powerUpsB: [],
      togglePowerUp: (team, p) => {
        const key = team === "A" ? "powerUpsA" : "powerUpsB";
        const current = get()[key];
        if (current.includes(p)) {
          set({ [key]: current.filter((x) => x !== p) });
        } else if (current.length < MAX_PU) {
          set({ [key]: [...current, p] });
        }
      },

      roomCode: null,
      hostId: null,
      game: null,
      question: null,
      answerResult: null,
      setRoom: (roomCode, hostId) => set({ roomCode, hostId }),
      setGame: (game) => set({ game }),
      setQuestion: (question) => set({ question }),
      setAnswerResult: (answerResult) => set({ answerResult }),
      resetSetup: () =>
        set({
          selectedA: [],
          selectedB: [],
          powerUpsA: [],
          powerUpsB: [],
          game: null,
          question: null,
          answerResult: null,
          roomCode: null,
          hostId: null,
        }),
    }),
    {
      name: "seen-jeem-app",
      partialize: (s) => ({
        locale: s.locale,
        token: s.token,
        user: s.user,
        teamAName: s.teamAName,
        teamBName: s.teamBName,
      }),
    }
  )
);
