import { useEffect, useState } from "react";
import type { GameSave } from "../contract";
import { Phone } from "../render/Phone";
import { loadSharedGame, updateShared } from "./api";
import "./share.css";

// What a phone opens from the QR code: the game, filling the screen, resumable mid-play.
export function SharedApp({ id }: { id: string }) {
  const [game, setGame] = useState<GameSave | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSharedGame(id)
      .then((next) => {
        setGame(next);
        document.title = next.manifest.title;
      })
      .catch((caught: Error) => setError(caught.message));
  }, [id]);

  function handleGame(next: GameSave) {
    setGame(next);
    void updateShared(id, next).catch(() => undefined);
  }

  return (
    <main className="shared">
      {game ? <Phone game={game} onChange={handleGame} /> : <p className="shared-note">{error ?? "Opening the game…"}</p>}
    </main>
  );
}
