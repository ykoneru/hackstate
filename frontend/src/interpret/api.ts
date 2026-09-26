import type { Screen } from "../contract";

export async function interpretSketch(photo: Blob): Promise<Screen> {
  const body = new FormData();
  body.append("file", photo, "paper.jpg");
  let response: Response;
  try {
    response = await fetch("/api/screen", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(45000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("That took too long. Take the photo again.");
    }
    throw new Error("The backend is not running. Start it on port 8000.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "Gemini could not read the paper.";
    throw new Error(detail);
  }
  return data as Screen;
}

export async function checkHealth(): Promise<{ has_key: boolean; model: string }> {
  const response = await fetch("/api/health");
  if (!response.ok) {
    throw new Error("Backend unavailable");
  }
  return response.json();
}
