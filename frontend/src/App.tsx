import { useEffect, useState } from "react";
import { CapturePanel } from "./capture/CapturePanel";
import { saveSheet, updateSheet } from "./capture/sheets";
import { checkHealth, interpretSketch } from "./interpret/api";
import { Phone } from "./render/Phone";
import { SharePanel } from "./share/SharePanel";
import { updateShared } from "./share/api";
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
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  // The block pointed at on either side: the ink on the photo or the control in the phone.
  const [activeBlock, setActiveBlock] = useState<number | null>(null);

  useEffect(() => {
    checkHealth()
      .then((health) => setHasKey(health.has_key))
      .catch(() => setHasKey(null));
  }, []);

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
        <p className="eyebrow">Napkin</p>
        <h1>Point it at the paper.</h1>
        <p className="lede">
          Draw anything on a sheet of paper. Take a photo of that page. Gemini turns the ink into a game you can play.
        </p>
      </header>

      <section className="workspace">
        <div className="pane">
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
            {hasKey === false && (
              <p className="hint">Add GEMINI_API_KEY to .env before you photograph the paper.</p>
            )}
            {error && <p className="error">{error}</p>}
          </CapturePanel>
        </div>

        <div className="pane result">
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
