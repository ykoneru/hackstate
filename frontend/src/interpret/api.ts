import type { GameSave, TurnResult, StatSnap } from "../contract";
import { isGameSave } from "../contract";

export async function interpretSketch(photo: Blob): Promise<GameSave> {
  const body = new FormData();
  body.append("file", photo, "paper.jpg");
  const data = await request("/api/screen", { method: "POST", body, signal: AbortSignal.timeout(60000) });
  if (!isGameSave(data)) throw new Error("Gemini could not turn that paper into a game. Try the photo again.");
  return data;
}

export async function playTurn(game: GameSave, actionId: string): Promise<{ stats: StatSnap[]; result: TurnResult }> {
  const data = await request("/api/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      manifest: game.manifest,
      stats: game.stats,
      history: game.history,
      actions: game.actions,
      action_id: actionId,
      turn: game.turn,
    }),
    signal: AbortSignal.timeout(45000),
  });
  const payload = data as { stats?: StatSnap[]; result?: TurnResult };
  if (!payload.result || !Array.isArray(payload.stats)) {
    throw new Error("The scene lost the thread. Try that action again.");
  }
  return { stats: payload.stats, result: payload.result };
}

export async function checkHealth(): Promise<{ has_key: boolean; model: string }> {
  const response = await fetch("/api/health");
  if (!response.ok) throw new Error("Backend unavailable");
  return response.json();
}

async function request(url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("That took too long. Try again.");
    }
    throw new Error("The backend is not running. Start it on port 8000.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof (data as { detail?: unknown }).detail === "string" ? (data as { detail: string }).detail : "Gemini could not keep the game going.";
    throw new Error(detail);
  }
  return data;
}
