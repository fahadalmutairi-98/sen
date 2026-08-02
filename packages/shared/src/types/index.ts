export type Locale = "ar" | "en";

export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "TEXT"
  | "TRUE_FALSE"
  | "IMAGE"
  | "AUDIO"
  | "VIDEO"
  | "DRAWING"
  | "ACTING"
  | "GUESS_PERSON"
  | "NO_WORDS";

export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "EXPERT";

export type GameMode = "CLASSIC" | "QUICK" | "CUSTOM" | "PARTY";

export type PowerUpType =
  | "CALL_FRIEND"
  | "TWO_ANSWERS"
  | "FREEZE"
  | "TRAP"
  | "DOUBLE_POINTS"
  | "STEAL"
  | "PIT"
  | "REST";

export type GamePhase =
  | "LOBBY"
  | "TEAM_SETUP"
  | "CATEGORY_SELECT"
  | "POWERUP_SELECT"
  | "BOARD"
  | "QUESTION"
  | "REVEAL"
  | "FINISHED";

export type TeamId = "A" | "B";

export interface LocalizedString {
  ar: string;
  en: string;
}

export interface CategoryDef {
  id: string;
  slug: string;
  name: LocalizedString;
  description: LocalizedString;
  icon: string;
  color: string;
  accentColor: string;
  /**
   * Cover art for category cards (admin upload or default SVG).
   * Prefer full URL or site-relative path.
   */
  image: string;
}

export interface QuestionOption {
  id: string;
  text: LocalizedString;
}

export interface QuestionMedia {
  type: "image" | "audio" | "video";
  url: string;
  thumbnailUrl?: string;
}

export interface QuestionDef {
  id: string;
  categoryId: string;
  difficulty: Difficulty;
  points: number;
  type: QuestionType;
  language: Locale;
  questionText: LocalizedString;
  answer: LocalizedString;
  acceptedAnswers: string[];
  options?: QuestionOption[];
  explanation?: LocalizedString;
  media?: QuestionMedia;
  hint?: LocalizedString;
}

/** Seen Jeem style: 2×200, 2×400, 2×600 per category (6 cells). */
export const POINT_VALUES = [200, 200, 400, 400, 600, 600] as const;
export type PointValue = (typeof POINT_VALUES)[number];
export const UNIQUE_POINT_VALUES = [200, 400, 600] as const;

export interface BoardCell {
  /** Unique slot within the category column (0–5). Required because points repeat. */
  slotIndex: number;
  categoryId: string;
  points: PointValue;
  questionId: string;
  answered: boolean;
  answeredBy?: TeamId;
  correct?: boolean;
}

export interface BoardColumn {
  categoryId: string;
  selectedBy: TeamId;
  cells: BoardCell[];
}

export interface TeamState {
  id: TeamId;
  name: string;
  color: string;
  score: number;
  players: string[];
  /** Remaining usable counts */
  powerUps: PowerUpInventory;
  /** Originally chosen power-ups for this game (order preserved) */
  chosenPowerUps: PowerUpType[];
  scoreHistory: ScoreEvent[];
  stats: TeamStats;
  frozenTurns: number;
}

export interface PowerUpInventory {
  CALL_FRIEND: number;
  TWO_ANSWERS: number;
  FREEZE: number;
  TRAP: number;
  DOUBLE_POINTS: number;
  STEAL: number;
  PIT: number;
  REST: number;
}

export interface ScoreEvent {
  questionId: string;
  points: number;
  correct: boolean;
  powerUp?: PowerUpType;
  timestamp: number;
}

export interface TeamStats {
  correct: number;
  wrong: number;
  powerUpsUsed: number;
  highestStreak: number;
  currentStreak: number;
}

export interface ActiveQuestion {
  questionId: string;
  categoryId: string;
  slotIndex: number;
  points: PointValue;
  askedBy: TeamId;
  answeringTeam: TeamId;
  startedAt: number;
  timerSeconds: number;
  activePowerUps: PowerUpType[];
  removedOptionIds: string[];
  hintRevealed: boolean;
  /** Host clicked "show answer" — waiting to award points */
  answerRevealed: boolean;
  /** Verbal two-answers power-up active */
  twoAnswersActive: boolean;
  doubleActive: boolean;
  trapActive: boolean;
  pitActive: boolean;
  stealAvailable: boolean;
  restActive: boolean;
}

export interface GameSettings {
  mode: GameMode;
  categoryCount: number;
  timerSeconds: number;
  powerUpsEnabled: boolean;
  maxPowerUpsPerTeam: number;
  penaltyOnWrong: boolean;
  language: Locale;
}

export interface GameState {
  id: string;
  roomCode: string;
  phase: GamePhase;
  settings: GameSettings;
  teams: Record<TeamId, TeamState>;
  board: BoardColumn[];
  currentTurn: TeamId;
  activeQuestion: ActiveQuestion | null;
  /** Power-ups armed on the board (before picking a cell), e.g. PIT / DOUBLE */
  armedPowerUps: PowerUpType[];
  selectedCategoryIds: string[];
  winner: TeamId | "DRAW" | null;
  createdAt: number;
  updatedAt: number;
  hostId: string;
}

export interface PlayerSession {
  id: string;
  displayName: string;
  teamId: TeamId | null;
  isHost: boolean;
  isGuest: boolean;
  connected: boolean;
}

export interface RoomState {
  code: string;
  gameId: string | null;
  players: PlayerSession[];
  isLocal: boolean;
  createdAt: number;
}

export type ClientEvent =
  | { type: "ROOM_JOIN"; payload: { code: string; displayName: string; guestId?: string } }
  | { type: "ROOM_CREATE"; payload: { displayName: string; isLocal?: boolean } }
  | { type: "TEAM_ASSIGN"; payload: { playerId: string; teamId: TeamId } }
  | { type: "TEAM_RENAME"; payload: { teamId: TeamId; name: string } }
  | { type: "SET_SETTINGS"; payload: Partial<GameSettings> }
  | { type: "SELECT_CATEGORIES"; payload: { teamId: TeamId; categoryIds: string[] } }
  | { type: "SELECT_POWERUPS"; payload: { teamId: TeamId; powerUps: PowerUpType[] } }
  | { type: "START_GAME" }
  | { type: "SELECT_CELL"; payload: { categoryId: string; slotIndex: number } }
  | { type: "USE_POWERUP"; payload: { powerUp: PowerUpType; targetPlayerId?: string } }
  | { type: "REVEAL_ANSWER" }
  | { type: "AWARD_POINTS"; payload: { awardedTo: TeamId | null } }
  | { type: "SKIP_QUESTION" }
  | { type: "NEXT_TURN" }
  | { type: "REMATCH" };

export type ServerEvent =
  | { type: "ROOM_STATE"; payload: RoomState }
  | { type: "GAME_STATE"; payload: GameState }
  | { type: "QUESTION_DATA"; payload: QuestionPublic }
  | { type: "ERROR"; payload: { message: string; code?: string } }
  | { type: "TIMER_TICK"; payload: { remaining: number } }
  | { type: "ANSWER_RESULT"; payload: AnswerResult };

export interface QuestionPublic {
  id: string;
  categoryId: string;
  difficulty: Difficulty;
  points: number;
  type: QuestionType;
  language: Locale;
  questionText: LocalizedString;
  options?: QuestionOption[];
  media?: QuestionMedia;
  hint?: LocalizedString;
  explanation?: LocalizedString;
  answer?: LocalizedString;
  acceptedAnswers?: string[];
}

export interface AnswerResult {
  correct: boolean;
  pointsDelta: number;
  opponentDelta: number;
  answer: LocalizedString;
  explanation?: LocalizedString;
  answeringTeam: TeamId;
  stealAvailable: boolean;
  /** Who received the points: A, B, or null if neither */
  awardedTo: TeamId | null;
}
