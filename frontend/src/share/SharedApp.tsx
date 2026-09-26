import { useEffect, useState } from "react";
import type { Screen } from "../contract";
import { Phone } from "../render/Phone";
import { loadSharedScreen } from "./api";
import "./share.css";

// What a phone opens from the QR code: only the app, filling the screen.
export function SharedApp({ id }: { id: string }) {
  const [screen, setScreen] = useState<Screen | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSharedScreen(id)
      .then((next) => {
        setScreen(next);
        document.title = next.app_name;
      })
      .catch((caught: Error) => setError(caught.message));
  }, [id]);

  return (
    <main className="shared">
      {screen ? <Phone screen={screen} /> : <p className="shared-note">{error ?? "Opening the app…"}</p>}
    </main>
  );
}
