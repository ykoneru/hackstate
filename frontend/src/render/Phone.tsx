import { useEffect, useRef, useState } from "react";
import type { GameSave } from "../contract";
import { Arcade } from "./Arcade";
import { cast, step } from "./autoplay";
import { getGame } from "./catalog";
import { Playfield } from "./Playfield";
import { Scene } from "./Scene";
import "./game.css";
import "./phone.css";

type PhoneProps = {
  game: GameSave | null;
  onChange?: (game: GameSave) => void;
};

export function Phone({ game, onChange }: PhoneProps) {
  const [fx, setFx] = useState<{ effect: GameSave["history"][number]["effect"]; actor: string; target: string; key: number } | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!game || game.game_over || game.manifest.play?.enabled || game.manifest.game_id) return;
    const timer = window.setTimeout(() => {
      const next = step(game);
      const beat = next.history[next.history.length - 1];
      const roles = cast(game, beat.effect);
      setFx({ effect: beat.effect, actor: roles.actor, target: roles.target, key: next.turn });
      onChangeRef.current?.(next);
    }, game.turn === 0 ? 700 : 1400);
    return () => window.clearTimeout(timer);
  }, [game]);

  if (!game) {
    return (
      <div className="device">
        <div className="device-screen waiting">
          <p>Take a photo of the paper. The game lands here.</p>
        </div>
      </div>
    );
  }

  function again() {
    setFx(null);
    onChange?.({
      ...game!,
      stats: game!.manifest.stats.map((stat) => ({ id: stat.id, value: stat.value })),
      history: [],
      actions: game!.manifest.actions,
      game_over: false,
      outcome: "none",
      closing: "",
      turn: 0,
    });
  }

  const picked = game.manifest.game_id ? getGame(game.manifest.game_id) : undefined;
  if (picked) {
    return (
      <div className="device">
        <div className="device-screen" data-accent={game.manifest.accent}>
          <div className="game-top">
            <h2>{picked.title}</h2>
            <p>{picked.blurb}</p>
          </div>
          <Arcade
            spec={picked}
            onFinish={(outcome) =>
              onChange?.({
                ...game,
                game_over: true,
                outcome,
                closing: outcome === "win" ? picked.win : picked.lose,
              })
            }
            onReplay={again}
          />
        </div>
      </div>
    );
  }

  if (game.manifest.play?.enabled) {
    return (
      <div className="device">
        <div className="device-screen" data-accent={game.manifest.accent}>
          <div className="game-top">
            <h2>{game.manifest.title}</h2>
            <p>{game.manifest.tagline}</p>
          </div>
          <Playfield
            manifest={game.manifest}
            onFinish={(outcome) =>
              onChange?.({
                ...game,
                game_over: true,
                outcome,
                closing: outcome === "win" ? game.manifest.win_text : game.manifest.lose_text,
              })
            }
            onReplay={again}
          />
        </div>
      </div>
    );
  }

  const latest = game.history[game.history.length - 1];
  const player = game.manifest.entities.find((entity) => entity.role === "player");

  return (
    <div className="device">
      <div className="device-screen" data-accent={game.manifest.accent}>
        <div className="game-top">
          <h2>{game.manifest.title}</h2>
          <p>{game.manifest.tagline}</p>
        </div>
        <Scene
          entities={game.manifest.entities}
          genre={game.manifest.genre}
          setting={game.manifest.scene_setting}
          effect={fx?.effect ?? null}
          effectKey={fx?.key ?? 0}
          actorId={fx?.actor ?? player?.id ?? ""}
          targetId={fx?.target ?? ""}
          busy={!game.game_over && game.turn === 0}
          outcome={game.outcome}
          closing={game.closing}
        />
        <div className="hud">
          {game.manifest.stats.map((stat) => {
            const value = game.stats.find((snap) => snap.id === stat.id)?.value ?? stat.value;
            const width = Math.round((value / Math.max(1, stat.maximum)) * 100);
            return (
              <div className="stat" key={stat.id}>
                <span>{stat.label}</span>
                <span>
                  {value}/{stat.maximum}
                </span>
                <div className="bar">
                  <span style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="caption" aria-live="polite">
          {latest ? (
            <>
              <p className="you">{latest.action}</p>
              <p>{latest.narrative}</p>
            </>
          ) : (
            <p className="you">The ink starts to move</p>
          )}
        </div>
        {game.game_over && (
          <div className="moves">
            <button type="button" className="again" onClick={again}>
              Play again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
