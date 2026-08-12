// Shared types for the MCM PORTAL flow.
// Editable content that USES these types lives in /config/portal.config.ts —
// this file only defines the shapes, it shouldn't need to change often.

export type MoodKey = "excitement" | "confidence" | "ease" | "dreamy";

export type ColorKey = "pink" | "black" | "beige" | "vivid";

export type WorldId =
  | "paris_dawn"
  | "monaco_night"
  | "seoul_neon"
  | "milano_terrace"
  | "tokyo_mirage"
  | "ibiza_sunset"
  | "newyork_attitude"
  | "santorini_breeze";

export type StepId = "intro" | "guided" | "worldResult" | "mirror" | "result";

export interface WorldDef {
  id: WorldId;
  name: string;
  /** Short line shown under the world name on cards/thumbnails. */
  tagline: string;
  /** CSS gradient string, applied directly via style={{ backgroundImage }}. */
  gradient: string;
  /** Which text color reads best on top of this gradient. */
  textOn: "light" | "dark";
}

export interface QuestionOption<K extends string> {
  key: K;
  label: string;
}

export interface QuestionDef<K extends string> {
  id: "mood" | "color";
  prompt: string;
  options: QuestionOption<K>[];
}

export interface WorldMappingEntry {
  worldId: WorldId;
  /** Human-readable "왜 이 세계인지" sentence shown on the result screen. */
  reason: string;
}

export interface SavedMoment {
  id: string;
  worldId: WorldId;
  savedAt: number;
  productInterest: boolean;
}

export interface Answers {
  mood: MoodKey | null;
  color: ColorKey | null;
}
