import { useState } from "react";
import QRCode from "qrcode";
import type { Screen } from "../contract";
import { shareScreen } from "./api";
import "./share.css";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function SharePanel({ screen }: { screen: Screen }) {
  const [link, setLink] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setWorking(true);
    setError(null);
    try {
      const url = await shareScreen(screen);
      setCode(await QRCode.toDataURL(url, { margin: 1, width: 440, color: { dark: "#20221f", light: "#fffefa" } }));
      setLink(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not make a link for this app.");
    } finally {
      setWorking(false);
    }
  }

  const unreachable = link !== null && LOOPBACK.has(new URL(link).hostname);

  return (
    <div className="share">
      {code && link ? (
        <figure className="share-card">
          <img src={code} alt={`QR code that opens ${link}`} />
          <figcaption>
            <strong>Scan to try it on your phone.</strong>
            <a href={link} target="_blank" rel="noreferrer">
              {link}
            </a>
          </figcaption>
        </figure>
      ) : (
        <button type="button" className="secondary" disabled={working} onClick={() => void share()}>
          {working ? "Making a link…" : "Try it on your phone"}
        </button>
      )}
      {unreachable && (
        <p className="hint">
          Phones can't open {new URL(link).host}. Run <code>cloudflared tunnel --url http://127.0.0.1:5173</code> and
          open Napkin at the https address it prints, or set PUBLIC_URL in .env.
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
