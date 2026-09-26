import type { GameSave } from "../contract";
import { isGameSave } from "../contract";

export async function shareGame(game: GameSave): Promise<{ id: string; url: string }> {
  const data = await send("/api/share", "POST", game);
  const id = typeof data.id === "string" ? data.id : "";
  const url = typeof data.url === "string" && data.url ? data.url : `${window.location.origin}/s/${id}`;
  return { id, url };
}

export async function updateShared(id: string, game: GameSave): Promise<void> {
  await send(`/api/share/${encodeURIComponent(id)}`, "PUT", game);
}

export async function loadSharedGame(id: string): Promise<GameSave> {
  let response: Response;
  try {
    response = await fetch(`/api/share/${encodeURIComponent(id)}`);
  } catch {
    throw new Error("Can't reach the laptop. Check that it is still running.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "This game link did not open.");
  }
  if (!isGameSave(data)) throw new Error("This link is from an older app. Make the game again.");
  return data;
}

async function send(url: string, method: string, game: GameSave): Promise<{ id?: string; url?: string }> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(game),
    });
  } catch {
    throw new Error("The backend is not running. Start it on port 8000.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Could not keep this game link.");
  return data;
}
