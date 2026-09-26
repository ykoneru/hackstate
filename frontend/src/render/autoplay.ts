import type { Effect, GameSave, Genre } from "../contract";

const SCRIPT: Record<Genre, Effect[]> = {
  duel: ["hit", "blocked", "critical", "gameOver"],
  race: ["progress", "setback", "progress", "gameOver"],
  maze: ["progress", "blocked", "progress", "gameOver"],
  shop: ["itemFound", "setback", "itemFound", "gameOver"],
  puzzle: ["progress", "blocked", "itemFound", "gameOver"],
  dialogue: ["progress", "setback", "progress", "gameOver"],
  collect: ["itemFound", "miss", "itemFound", "gameOver"],
  explore: ["progress", "setback", "progress", "gameOver"],
};

export function step(game: GameSave): GameSave {
  const manifest = game.manifest;
  const turn = game.turn;
  const script = SCRIPT[manifest.genre] ?? SCRIPT.explore;
  const effect = script[Math.min(turn, script.length - 1)];
  const last = turn >= script.length - 1 || effect === "gameOver";
  const action = manifest.actions[turn % Math.max(1, manifest.actions.length)];
  const label = action?.label ?? "Press on";
  const player = manifest.entities.find((entity) => entity.role === "player")?.name ?? "You";
  const other =
    manifest.entities.find((entity) => entity.role === "opponent")?.name ??
    manifest.entities.find((entity) => entity.role !== "player")?.name ??
    "the scene";

  return {
    ...game,
    stats: moveStats(game, turn, last),
    history: [...game.history, { action: label, narrative: line(effect, label, player, other, manifest.win_text), effect }],
    actions: [],
    game_over: last,
    outcome: last ? "win" : "none",
    closing: last ? manifest.win_text : "",
    turn: turn + 1,
  };
}

export function cast(game: GameSave, effect: Effect): { actor: string; target: string } {
  const entities = game.manifest.entities;
  const player = entities.find((entity) => entity.role === "player") ?? entities[0];
  const other = entities.find((entity) => entity.role === "opponent") ?? entities.find((entity) => entity.id !== player?.id) ?? player;
  const strikes = effect === "hit" || effect === "critical" || effect === "miss" || effect === "blocked";
  return { actor: player?.id ?? "", target: strikes ? (other?.id ?? "") : (player?.id ?? "") };
}

function line(effect: Effect, label: string, player: string, other: string, win: string): string {
  const move = label.toLowerCase();
  if (effect === "hit") return `${player} lands ${move} on ${other}.`;
  if (effect === "critical") return `${label} catches ${other} wide open.`;
  if (effect === "miss") return `${other} slips past ${move}.`;
  if (effect === "blocked") return `${other} turns aside ${move}.`;
  if (effect === "heal") return `${player} steadies with ${move}.`;
  if (effect === "itemFound") return `${player} comes away with something from ${move}.`;
  if (effect === "setback") return `${move} costs ${player} a step.`;
  if (effect === "gameOver") return win;
  return `${player} pushes on with ${move}.`;
}

function moveStats(game: GameSave, turn: number, last: boolean) {
  const goal = game.manifest.stats.find((stat) => stat.win_at > stat.value);
  return game.stats.map((snap) => {
    const stat = game.manifest.stats.find((item) => item.id === snap.id);
    if (!stat) return snap;
    if (goal && snap.id === goal.id) {
      const value = last ? goal.win_at : Math.round(stat.value + ((goal.win_at - stat.value) * (turn + 1)) / 4);
      return { id: snap.id, value: clamp(value, 0, stat.maximum) };
    }
    return snap;
  });
}

function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(high, value));
}
