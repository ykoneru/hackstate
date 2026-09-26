import { useEffect, useState } from "react";
import { CapturePanel } from "./capture/CapturePanel";
import { checkHealth, interpretSketch } from "./interpret/api";
import { Phone } from "./render/Phone";
import type { Screen } from "./contract";

type Phase = "idle" | "reading" | "ready" | "error";

export function App() {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [screen, setScreen] = useState<Screen | null>(null);
  const [screenId, setScreenId] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    checkHealth()
      .then((health) => setHasKey(health.has_key))
      .catch(() => setHasKey(null));
  }, []);

  function handlePhoto(next: Blob | null) {
    setPhoto(next);
    setScreen(null);
    setPhase("idle");
    setError(null);
  }

  async function makeApp() {
    if (!photo) return;
    setPhase("reading");
    setError(null);
    try {
      const next = await interpretSketch(photo);
      setScreen(next);
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
        <p className="eyebrow">Napkin</p>
        <h1>Point it at the paper.</h1>
        <p className="lede">
          Draw the app on a sheet of paper. Take a photo of that page. Gemini reads the ink and this screen becomes the app.
        </p>
      </header>

      <section className="workspace">
        <div className="pane">
          <CapturePanel busy={phase === "reading"} onPhoto={handlePhoto} />
          <button
            type="button"
            className="primary make"
            disabled={!photo || phase === "reading"}
            onClick={() => void makeApp()}
          >
            {phase === "reading" ? "Reading the paper…" : "Make the app"}
          </button>
          {hasKey === false && (
            <p className="hint">Add GEMINI_API_KEY to .env before you photograph the paper.</p>
          )}
          {error && <p className="error">{error}</p>}
        </div>

        <div className="pane result">
          <div className={phase === "reading" ? "phone-slot busy" : "phone-slot"}>
            <Phone key={screenId} screen={screen} />
            {phase === "reading" && <p className="veil">Reading the ink on the paper</p>}
          </div>
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
