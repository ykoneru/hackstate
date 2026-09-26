import type { Screen } from "../contract";

export async function shareScreen(screen: Screen): Promise<string> {
  let response: Response;
  try {
    response = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(screen),
    });
  } catch {
    throw new Error("The backend is not running. Start it on port 8000.");
  }
  if (!response.ok) throw new Error("Could not make a link for this app.");
  const data: { id: string; url: string } = await response.json();
  return data.url || `${window.location.origin}/s/${data.id}`;
}

export async function loadSharedScreen(id: string): Promise<Screen> {
  let response: Response;
  try {
    response = await fetch(`/api/share/${encodeURIComponent(id)}`);
  } catch {
    throw new Error("Can't reach the laptop. Check that it is still running.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "This app link did not open.");
  }
  return data as Screen;
}
