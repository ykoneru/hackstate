import type { Effect, Entity, Genre } from "../contract";

const INK: Record<Entity["color"], string> = {
  ink: "#241c16",
  clay: "#9c3b28",
  forest: "#1f6b45",
  sea: "#1d4e89",
  paper: "#f4efe6",
  gold: "#c4a15a",
  rust: "#a34b32",
  night: "#2c3340",
};

const SCALE = { small: 0.72, medium: 1, large: 1.35 };

type SceneProps = {
  entities: Entity[];
  genre: Genre;
  setting: string;
  effect: Effect | null;
  effectKey: number;
  actorId: string;
  targetId: string;
  busy: boolean;
  outcome: "win" | "lose" | "draw" | "none";
  closing: string;
};

export function Scene({
  entities,
  genre,
  setting,
  effect,
  effectKey,
  actorId,
  targetId,
  busy,
  outcome,
  closing,
}: SceneProps) {
  const fx = effect ? `fx-${effect}` : "";
  return (
    <div className={busy ? `scene thinking ${fx}` : `scene ${fx}`} key={effectKey} aria-label={setting}>
      <svg viewBox="0 0 200 150" role="img">
        <Backdrop genre={genre} />
        {[...entities].sort((a, b) => rank(a) - rank(b)).map((entity) => (
          <g key={entity.id} transform={`translate(${placeX(entity)} ${placeY(entity)})`}>
            <g
              className={[
                "motion",
                entity.id === actorId ? "actor" : "",
                entity.id === targetId ? "target" : "",
              ].join(" ")}
            >
              <Body entity={entity} />
              <Accessory entity={entity} />
              <Spark />
            </g>
          </g>
        ))}
      </svg>
      {outcome !== "none" && closing && (
        <p className={`banner ${outcome}`}>
          <strong>{outcome === "win" ? "Won" : outcome === "lose" ? "Lost" : "Draw"}</strong>
          {closing}
        </p>
      )}
    </div>
  );
}

function rank(entity: Entity) {
  return entity.shape === "figure" ? 1 : 0;
}

function placeX(entity: Entity) {
  const x = 8 + entity.x * 1.84;
  if (entity.shape === "figure") return x;
  return Math.min(184, x + 22);
}

function placeY(entity: Entity) {
  return 18 + entity.y * 1.15;
}

function Backdrop({ genre }: { genre: Genre }) {
  if (genre === "maze") {
    return (
      <g className="backdrop" aria-hidden="true">
        <rect x="18" y="28" width="8" height="70" />
        <rect x="18" y="28" width="50" height="8" />
        <rect x="70" y="28" width="8" height="46" />
        <rect x="110" y="50" width="8" height="62" />
        <rect x="110" y="104" width="62" height="8" />
      </g>
    );
  }
  if (genre === "race") {
    return (
      <g className="backdrop" aria-hidden="true">
        <path d="M10 118 H190" />
        <path d="M10 108 H190" strokeDasharray="6 5" />
      </g>
    );
  }
  if (genre === "shop") {
    return (
      <g className="backdrop" aria-hidden="true">
        <rect x="108" y="78" width="74" height="28" rx="3" />
        <rect x="118" y="62" width="16" height="16" />
        <rect x="142" y="66" width="12" height="12" />
      </g>
    );
  }
  if (genre === "puzzle") {
    return (
      <g className="backdrop" aria-hidden="true">
        <rect x="128" y="36" width="22" height="22" />
        <rect x="154" y="36" width="22" height="22" />
        <rect x="128" y="62" width="22" height="22" />
        <rect x="154" y="62" width="22" height="22" />
      </g>
    );
  }
  return (
    <g className="backdrop" aria-hidden="true">
      <path d="M0 124 C 40 112, 70 130, 110 118 S 170 108, 200 120 V 150 H 0 Z" />
    </g>
  );
}

function Body({ entity }: { entity: Entity }) {
  const color = INK[entity.color] ?? INK.ink;
  const scale = (SCALE[entity.size] ?? 1) * (entity.shape === "figure" ? 1 : 0.45);
  const fallen = entity.pose === "fallen" ? "rotate(-70)" : "";
  const crouch = entity.pose === "crouch" ? "scale(1 0.72)" : "";
  return (
    <g
      style={{ color }}
      transform={`${fallen} ${crouch} scale(${scale})`}
      fill={color}
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      {entity.shape === "figure" && <Figure pose={entity.pose} />}
      {entity.shape === "blob" && <ellipse cx="0" cy="-8" rx="12" ry="9" stroke="none" />}
      {entity.shape === "box" && <rect x="-11" y="-18" width="22" height="18" rx="2" stroke="none" />}
      {entity.shape === "circle" && <circle cx="0" cy="-10" r="10" stroke="none" />}
      {entity.shape === "triangle" && <polygon points="0,-20 12,-2 -12,-2" stroke="none" />}
      {entity.shape === "line" && <line x1="-16" y1="-6" x2="16" y2="-14" strokeWidth="4" />}
    </g>
  );
}

function Figure({ pose }: { pose: Entity["pose"] }) {
  const arm = pose === "reach" ? "M0 -16 L16 -12" : pose === "ready" ? "M0 -16 L12 -20 M0 -16 L-12 -20" : "M0 -16 L8 -10 M0 -16 L-8 -10";
  return (
    <g fill="none">
      <circle cx="0" cy="-24" r="4.2" fill="currentColor" stroke="none" />
      <path d={`M0 -20 V-8 ${arm} M0 -8 L7 2 M0 -8 L-7 2`} />
    </g>
  );
}

function Accessory({ entity }: { entity: Entity }) {
  const color = INK[entity.color] ?? INK.ink;
  const word = entity.accessory;
  if (word === "none") return null;
  const y = entity.shape === "figure" ? -28 : -18;
  return (
    <g fill={color} stroke={color} strokeWidth="1.6" strokeLinejoin="round">
      {word === "hat" && <polygon points={`-6,${y} 6,${y} 0,${y - 7}`} />}
      {word === "crown" && <polygon points={`-6,${y} -3,${y - 6} 0,${y - 2} 3,${y - 6} 6,${y}`} />}
      {word === "sword" && <path d="M8 -14 L20 -22" fill="none" strokeWidth="2" />}
      {word === "shield" && <ellipse cx="-10" cy="-12" rx="4" ry="6" fill="none" />}
      {word === "bag" && <rect x="6" y="-12" width="7" height="8" rx="1" stroke="none" />}
      {word === "wings" && (
        <g fill="none">
          <path d="M-4 -16 Q-16 -24 -14 -12" />
          <path d="M4 -16 Q16 -24 14 -12" />
        </g>
      )}
    </g>
  );
}

function Spark() {
  return (
    <g className="spark" aria-hidden="true">
      <circle cx="14" cy="-20" r="2" />
      <circle cx="-12" cy="-16" r="1.5" />
      <circle cx="6" cy="-26" r="1.4" />
    </g>
  );
}
