import { useState } from "react";
import { CapturePanel } from "./capture/CapturePanel";
import { saveSheet, updateSheet } from "./capture/sheets";
import { interpretSketch } from "./interpret/api";
import { Phone } from "./render/Phone";
import { SharePanel } from "./share/SharePanel";
import { updateShared } from "./share/api";
import { applyTheme, initialTheme, type Theme } from "./theme";
import type { GameSave } from "./contract";

type Phase = "idle" | "reading" | "ready" | "error";

export function App() {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [game, setGame] = useState<GameSave | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [session, setSession] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  // The block pointed at on either side: the ink on the photo or the control in the phone.
  const [activeBlock, setActiveBlock] = useState<number | null>(null);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  }

  function handlePhoto(next: Blob | null) {
    setPhoto(next);
    setGame(null);
    setSheetId(null);
    setShareId(null);
    setActiveBlock(null);
    setPhase("idle");
    setError(null);
  }

  function handleReplay(sheetPhoto: Blob, sheetGame: GameSave, id: string) {
    setPhoto(sheetPhoto);
    setGame(sheetGame);
    setSheetId(id);
    setShareId(null);
    setSession((value) => value + 1);
    setActiveBlock(null);
    setPhase("ready");
    setError(null);
  }

  function handleGame(next: GameSave) {
    setGame(next);
    if (sheetId) updateSheet(sheetId, next);
    if (shareId) void updateShared(shareId, next).catch(() => undefined);
  }

  async function makeApp() {
    if (!photo) return;
    setPhase("reading");
    setError(null);
    try {
      const next = await interpretSketch(photo);
      const id = await saveSheet(photo, next).catch(() => null);
      setSheetId(id);
      setShareId(null);
      setGame(next);
      setActiveBlock(null);
      setSession((value) => value + 1);
      setPhase("ready");
    } catch (caught) {
      setPhase("error");
      setError(caught instanceof Error ? caught.message : "Gemini could not read the paper.");
    }
  }

  return (
    <main className="studio">
      <header className="intro">
        <div className="topbar">
          <p className="eyebrow">Napkin</p>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {theme === "light" ? (
                <path d="M20.9 13.2A9 9 0 0 1 10.8 3.1 9 9 0 1 0 20.9 13.2Z" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                </>
              )}
            </svg>
          </button>
        </div>
        <h1>Point it at the paper.</h1>
        <p className="lede">
          Draw anything on a sheet of paper. Take a photo of that page. Gemini turns the ink into a game you can play.
        </p>
      </header>

      <section className="workspace">
        <div className="pane capture-pane">
          <div className="pane-head">
            <h2>Capture</h2>
          </div>
          <CapturePanel
            busy={phase === "reading"}
            onPhoto={handlePhoto}
            onReplay={handleReplay}
            blocks={[]}
            activeBlock={activeBlock}
            onHoverBlock={setActiveBlock}
          >
            <button
              type="button"
              className="primary make"
              disabled={!photo || phase === "reading"}
              onClick={() => void makeApp()}
            >
              {phase === "reading" ? "Reading the paper…" : "Make the game"}
            </button>
            {error && <p className="error">{error}</p>}
          </CapturePanel>
        </div>

        <div className="pane result">
          <div className="pane-head">
            <h2>Preview</h2>
          </div>
          <div className={phase === "reading" ? "phone-slot busy" : "phone-slot"}>
            <Phone key={session} game={game} onChange={handleGame} />
            {phase === "reading" && <p className="veil">Reading the ink on the paper</p>}
          </div>
          {game && phase === "ready" && (
            <SharePanel key={session} game={game} onShared={setShareId} />
          )}
          {game && phase === "ready" && (
            <details className="schema">
              <summary>What Gemini returned</summary>
              <pre>{JSON.stringify(game, null, 2)}</pre>
            </details>
          )}
        </div>
      </section>
    </main>
  );
}
