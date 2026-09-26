export type Accent = "ink" | "forest" | "clay" | "sea";

export type Block = {
  kind: "header" | "text" | "field" | "choices" | "button" | "image" | "toggle";
  title: string;
  body: string;
  placeholder: string;
  choice_mode: "one" | "many" | "none";
  items: { title: string; detail: string }[];
  box: number[];
};

export type Effect =
  | "hit"
  | "miss"
  | "critical"
  | "heal"
  | "itemFound"
  | "blocked"
  | "progress"
  | "setback"
  | "gameOver";

export type Genre = "duel" | "race" | "maze" | "shop" | "puzzle" | "dialogue" | "collect" | "explore";

export type Entity = {
  id: string;
  name: string;
  role: "player" | "opponent" | "obstacle" | "item" | "environment";
  shape: "figure" | "blob" | "box" | "circle" | "triangle" | "line";
  pose: "idle" | "ready" | "crouch" | "reach" | "fallen";
  color: "ink" | "clay" | "forest" | "sea" | "paper" | "gold" | "rust" | "night";
  size: "small" | "medium" | "large";
  x: number;
  y: number;
  accessory: string;
};

export type Stat = {
  id: string;
  label: string;
  value: number;
  maximum: number;
  win_at: number;
  lose_at: number;
};

export type Action = {
  id: string;
  label: string;
  hint: string;
};

export type PlayPiece = {
  id: string;
  name: string;
  role: "player" | "rival" | "ball" | "obstacle" | "goal" | "scenery";
  shape: "box" | "circle" | "line" | "figure";
  motion: "still" | "slide" | "drag" | "bounce" | "chase";
  solid: boolean;
  color: "ink" | "clay" | "forest" | "sea" | "paper" | "gold" | "rust" | "night";
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PlaySpec = {
  enabled: boolean;
  hint: string;
  win_score: number;
  score: "ball_exits" | "reach_goal" | "none";
  pieces: PlayPiece[];
};

export type Manifest = {
  title: string;
  tagline: string;
  visual_style: string;
  accent: Accent;
  genre: Genre;
  activity?: "story";
  play?: PlaySpec;
  mechanics: string;
  scene_setting: string;
  scene_layout: string;
  entities: Entity[];
  stats: Stat[];
  actions: Action[];
  win_text: string;
  lose_text: string;
  game_id?: string;
};

export type StatSnap = { id: string; value: number };

export type HistoryBeat = {
  action: string;
  narrative: string;
  effect: Effect;
};

export type GameSave = {
  manifest: Manifest;
  stats: StatSnap[];
  history: HistoryBeat[];
  actions: Action[];
  game_over: boolean;
  outcome: "win" | "lose" | "draw" | "none";
  closing: string;
  turn: number;
};

export type TurnResult = {
  narrative: string;
  state_delta: { id: string; delta: number }[];
  effect: Effect;
  actor_id: string;
  target_id: string;
  next_actions: Action[];
  game_over: boolean;
  outcome: "win" | "lose" | "draw" | "none";
  closing: string;
};

export function isGameSave(value: unknown): value is GameSave {
  const game = value as GameSave;
  return typeof game?.manifest?.title === "string" && Array.isArray(game.stats) && Array.isArray(game.actions);
}
