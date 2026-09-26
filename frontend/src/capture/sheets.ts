import { useSyncExternalStore } from "react";
import type { Screen } from "../contract";

// Every photo Gemini read, with what it returned. If the wifi dies on stage, a real earlier result can be replayed.
export type Sheet = {
  id: string;
  savedAt: number;
  photo: string;
  screen: Screen;
};

const KEY = "napkin.sheets";
const LIMIT = 8;
const PHOTO_EDGE = 1100;

const listeners = new Set<() => void>();
let sheets: Sheet[] = read();

export function useSheets(): Sheet[] {
  return useSyncExternalStore(subscribe, () => sheets);
}

export async function saveSheet(photo: Blob, screen: Screen): Promise<void> {
  const sheet: Sheet = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    savedAt: Date.now(),
    photo: await shrink(photo),
    screen,
  };
  write([sheet, ...sheets].slice(0, LIMIT));
}

export function clearSheets() {
  write([]);
}

export async function photoFromSheet(sheet: Sheet): Promise<Blob> {
  return (await fetch(sheet.photo)).blob();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Keep every sheet for this visit, and store as many as fit. Storage can be full or blocked.
function write(next: Sheet[]) {
  sheets = next;
  listeners.forEach((listener) => listener());
  for (let kept = next; ; kept = kept.slice(0, -1)) {
    try {
      if (kept.length) localStorage.setItem(KEY, JSON.stringify(kept));
      else localStorage.removeItem(KEY);
      return;
    } catch {
      if (!kept.length) return;
    }
  }
}

function read(): Sheet[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isSheet).map(withBoxes) : [];
  } catch {
    return [];
  }
}

function isSheet(value: unknown): value is Sheet {
  const sheet = value as Sheet;
  return (
    typeof sheet?.id === "string" &&
    typeof sheet.photo === "string" &&
    sheet.photo.startsWith("data:image/") &&
    Array.isArray(sheet.screen?.blocks)
  );
}

function withBoxes(sheet: Sheet): Sheet {
  const blocks = sheet.screen.blocks.map((block) => ({ ...block, box: Array.isArray(block.box) ? block.box : [] }));
  return { ...sheet, screen: { ...sheet.screen, blocks } };
}

async function shrink(photo: Blob): Promise<string> {
  const bitmap = await createImageBitmap(photo);
  const scale = Math.min(1, PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}
