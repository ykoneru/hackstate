import { useState } from "react";
import { CapturePanel } from "./capture/CapturePanel";
import { saveSheet } from "./capture/sheets";
import { interpretSketch } from "./interpret/api";
import { Phone } from "./render/Phone";
import { SharePanel } from "./share/SharePanel";
import { applyTheme, initialTheme, type Theme } from "./theme";
import type { Screen } from "./contract";

type Phase = "idle" | "reading" | "ready" | "error";

export function App() {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [screen, setScreen] = useState<Screen | null>(null);
  const [screenId, setScreenId] = useState(0);
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
    setScreen(null);
    setActiveBlock(null);
    setPhase("idle");
    setError(null);
  }

  function handleReplay(sheetPhoto: Blob, sheetScreen: Screen) {
    setPhoto(sheetPhoto);
    setScreen(sheetScreen);
    setScreenId((value) => value + 1);
    setActiveBlock(null);
    setPhase("ready");
    setError(null);
  }

  async function makeApp() {
    if (!photo) return;
    setPhase("reading");
    setError(null);
    try {
      const next = await interpretSketch(photo);
      void saveSheet(photo, next).catch(() => undefined);
      setScreen(next);
      setActiveBlock(null);
      setScreenId((value) => value + 1);
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
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
        </div>
        <h1>Point it at the paper.</h1>
        <ol className="onboarding" aria-label="How to make your app">
          <li>
            <span className="step-number" aria-hidden="true">01</span>
            <div><strong>Draw your screen</strong><p>Sketch one app screen on a sheet of paper.</p></div>
          </li>
          <li>
            <span className="step-number" aria-hidden="true">02</span>
            <div><strong>Take a photo</strong><p>Use your camera or upload a photo of the page.</p></div>
          </li>
          <li>
            <span className="step-number" aria-hidden="true">03</span>
            <div><strong>Make the app</strong><p>Gemini reads the ink and creates a tappable preview.</p></div>
          </li>
        </ol>
      </header>

      <section className="workspace">
        <div className="pane capture-pane">
          <div className="pane-head">
            <span className="pane-number">01</span>
            <h2>Capture</h2>
            <span className="pane-detail">Your paper sketch</span>
          </div>
          <CapturePanel
            busy={phase === "reading"}
            onPhoto={handlePhoto}
            onReplay={handleReplay}
            blocks={screen && phase === "ready" ? screen.blocks : []}
            activeBlock={activeBlock}
            onHoverBlock={setActiveBlock}
          >
            <button
              type="button"
              className="primary make"
              disabled={!photo || phase === "reading"}
              onClick={() => void makeApp()}
            >
              {phase === "reading" ? "Reading the paper…" : "Make the app"}
            </button>
            {error && <p className="error">{error}</p>}
          </CapturePanel>
        </div>

        <div className="pane result">
          <div className="pane-head">
            <span className="pane-number">02</span>
            <h2>Preview</h2>
            <span className="pane-detail">Your working app</span>
          </div>
          <div className={phase === "reading" ? "phone-slot busy" : "phone-slot"}>
            <Phone key={screenId} screen={screen} />
            {phase === "reading" && <p className="veil">Reading the ink on the paper</p>}
          </div>
          {screen && phase === "ready" && <SharePanel key={screenId} screen={screen} />}
          {screen && phase === "ready" && (
            <details className="schema">
              <summary>What Gemini returned</summary>
              <pre>{JSON.stringify(screen, null, 2)}</pre>
            </details>
          )}
        </div>
      </section>
    </main>
  );
}
