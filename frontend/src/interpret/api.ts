import type { Screen } from "../contract";

export async function interpretSketch(_photo: Blob): Promise<Screen> {
  throw new Error("The interpret branch has not been merged yet.");
}

export async function checkHealth(): Promise<{ has_key: boolean; model: string }> {
  return { has_key: false, model: "unset" };
}
