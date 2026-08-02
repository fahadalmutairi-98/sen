import type { LocalizedString, PowerUpType, PowerUpInventory, GameSettings } from "../types";

export const BRAND = {
  name: { ar: "سؤال جواب", en: "Su'al Jawab" } as LocalizedString,
  tagline: {
    ar: "الجواب عليك، والسؤال علينا",
    en: "You answer. We ask.",
  } as LocalizedString,
  colors: {
    primary: "#FFB7CE",
    primaryDark: "#E891A8",
    primaryLight: "#FFD4E0",
    gold: "#D4B8F0",
    cream: "#FFF5F8",
    navy: "#1A1218",
    boardBg: "#161018",
    teamA: "#7EB8D4",
    teamB: "#E8A87C",
  },
};

export const DEFAULT_SETTINGS: GameSettings = {
  mode: "CLASSIC",
  categoryCount: 6,
  timerSeconds: 90,
  powerUpsEnabled: true,
  maxPowerUpsPerTeam: 3,
  penaltyOnWrong: false,
  language: "ar",
};

export const MODE_PRESETS: Record<string, Partial<GameSettings>> = {
  CLASSIC: {
    mode: "CLASSIC",
    categoryCount: 6,
    timerSeconds: 90,
    powerUpsEnabled: true,
    maxPowerUpsPerTeam: 3,
  },
  QUICK: {
    mode: "QUICK",
    categoryCount: 4,
    timerSeconds: 60,
    powerUpsEnabled: true,
    maxPowerUpsPerTeam: 2,
  },
  PARTY: {
    mode: "PARTY",
    categoryCount: 6,
    timerSeconds: 90,
    powerUpsEnabled: true,
    maxPowerUpsPerTeam: 3,
  },
  CUSTOM: {
    mode: "CUSTOM",
  },
};

export const POWER_UP_META: Record<
  PowerUpType,
  {
    name: LocalizedString;
    description: LocalizedString;
    timing: "before" | "after" | "either";
    icon: string;
  }
> = {
  CALL_FRIEND: {
    name: { ar: "اتصال بصديق", en: "Call a Friend" },
    description: {
      ar: "صديقك اللي يعرف كل شي — هذا وقته! تظهر لك تلميحة بعد السؤال.",
      en: "Reveal a helpful hint after seeing the question.",
    },
    timing: "after",
    icon: "phone",
  },
  TWO_ANSWERS: {
    name: { ar: "جاوب جوابين", en: "Two Answers" },
    description: {
      ar: "متردد بجوابين؟ جاوب بالاثنين عشان تضمن النقاط.",
      en: "Allow the team to give two verbal answers.",
    },
    timing: "after",
    icon: "hand",
  },
  FREEZE: {
    name: { ar: "تجميد", en: "Freeze" },
    description: {
      ar: "منع الفريق المنافس من اللعب لجولة واحدة.",
      en: "Skip the opponent's next turn.",
    },
    timing: "before",
    icon: "snow",
  },
  TRAP: {
    name: { ar: "الفخ", en: "Trap" },
    description: {
      ar: "قبل ما تشوف السؤال: عط السؤال للفريق الثاني! وإذا جاوب غلط راح ينقص نقاط السؤال.",
      en: "Before seeing the question: force the opponent to answer. Wrong = they lose the points.",
    },
    timing: "before",
    icon: "trap",
  },
  DOUBLE_POINTS: {
    name: { ar: "نقاط مضاعفة", en: "Double Points" },
    description: {
      ar: "ضاعف نقاط السؤال إذا جاوبت صح.",
      en: "Double the points if you answer correctly.",
    },
    timing: "before",
    icon: "x2",
  },
  STEAL: {
    name: { ar: "سرقة", en: "Steal" },
    description: {
      ar: "حاول تجاوب على سؤال فاته الفريق المنافس.",
      en: "Attempt a question the opponent missed.",
    },
    timing: "either",
    icon: "steal",
  },
  PIT: {
    name: { ar: "الحفرة", en: "The Pit" },
    description: {
      ar: "احفر لهم! جاوب صح، واخصم عدد النقاط اللي فزت فيها من نقاط الفريق الثاني.",
      en: "Answer correctly and subtract those points from the opponent.",
    },
    timing: "before",
    icon: "pit",
  },
  REST: {
    name: { ar: "استريح", en: "Take a Rest" },
    description: {
      ar: "اختار أكثر شخص مثقف ضدك، وخله يستريح شوي عن المشاركة في إجابة هالسؤال.",
      en: "Bench one opposing player for this question.",
    },
    timing: "after",
    icon: "rest",
  },
};

export function emptyPowerUps(): PowerUpInventory {
  return {
    CALL_FRIEND: 0,
    TWO_ANSWERS: 0,
    FREEZE: 0,
    TRAP: 0,
    DOUBLE_POINTS: 0,
    STEAL: 0,
    PIT: 0,
    REST: 0,
  };
}

export const CLASSIC_POWER_UPS: PowerUpType[] = [
  "CALL_FRIEND",
  "TWO_ANSWERS",
  "PIT",
  "REST",
  "TRAP",
];

export const POINT_TO_DIFFICULTY = {
  200: "EASY",
  400: "MEDIUM",
  600: "HARD",
} as const;

/** Power-ups usable on the board before selecting a question */
export const BEFORE_QUESTION_POWERUPS: PowerUpType[] = [
  "PIT",
  "TRAP",
  "DOUBLE_POINTS",
  "FREEZE",
];

/** Power-ups usable after the question is revealed */
export const AFTER_QUESTION_POWERUPS: PowerUpType[] = [
  "CALL_FRIEND",
  "TWO_ANSWERS",
  "REST",
  "STEAL",
];

