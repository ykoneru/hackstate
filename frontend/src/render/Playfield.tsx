import { useEffect, useRef, useState } from "react";
import type { Manifest, PlayPiece } from "../contract";

type PlayfieldProps = {
  manifest: Manifest;
  onFinish: (outcome: "win" | "lose") => void;
  onReplay: () => void;
};

type Edge = "left" | "right" | "top" | "bottom";

type Body = PlayPiece & { vx: number; vy: number; homeX: number; homeY: number };

const INK: Record<PlayPiece["color"], string> = {
  ink: "#241c16",
  clay: "#c47a5a",
  forest: "#1f7a45",
  sea: "#2f6f86",
  paper: "#f4efe6",
  gold: "#d7a441",
  rust: "#b5523a",
  night: "#243044",
};

export function Playfield({ manifest, onFinish, onReplay }: PlayfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ you: 0, them: 0 });
  const [winner, setWinner] = useState<"win" | "lose" | null>(null);
  const [live, setLive] = useState(false);
  const [round, setRound] = useState(0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const play = manifest.play;
  const playerName = play?.pieces.find((piece) => piece.role === "player")?.name || "You";
  const rivalName = play?.pieces.find((piece) => piece.role === "rival")?.name || "Rival";

  useEffect(() => {
    const canvas = canvasRef.current;
    const spec = manifest.play;
    if (!canvas || !spec?.enabled) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bodies: Body[] = spec.pieces.map((piece) => ({
      ...piece,
      vx: 0,
      vy: 0,
      homeX: piece.x,
      homeY: piece.y,
    }));
    const ball = bodies.find((body) => body.motion === "bounce");
    const player =
      bodies.find((body) => body.role === "player" && (body.motion === "slide" || body.motion === "drag")) ??
      bodies.find((body) => body.motion === "slide" || body.motion === "drag");
    const edges = openEdges(bodies);
    const pointer = { x: player?.x ?? 50, y: player?.y ?? 50, down: false };
    let moving = false;
    let you = 0;
    let them = 0;
    let over: "win" | "lose" | null = null;
    let frame = 0;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas!.height = Math.max(1, Math.floor(rect.height * dpr));
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    function place(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 100;
      pointer.y = ((clientY - rect.top) / rect.height) * 100;
      pointer.down = true;
      if (!moving && !over) {
        moving = true;
        setLive(true);
        if (ball && spec!.score === "ball_exits") serve(ball, player);
      }
      movePlayer();
    }

    function onPointer(event: PointerEvent) {
      if (event.type === "pointerdown") canvas!.setPointerCapture(event.pointerId);
      place(event.clientX, event.clientY);
    }

    function onKey(event: KeyboardEvent) {
      const step = event.key.startsWith("Arrow") ? 3 : 0;
      if (!step) return;
      event.preventDefault();
      if (event.key === "ArrowLeft") pointer.x -= step;
      if (event.key === "ArrowRight") pointer.x += step;
      if (event.key === "ArrowUp") pointer.y -= step;
      if (event.key === "ArrowDown") pointer.y += step;
      placeFromPointer();
    }

    function placeFromPointer() {
      pointer.down = true;
      if (!moving && !over) {
        moving = true;
        setLive(true);
        if (ball && spec!.score === "ball_exits") serve(ball, player);
      }
      movePlayer();
    }

    function movePlayer() {
      if (!player || over) return;
      const next = { ...player, x: pointer.x, y: pointer.y };
      const axis = travelAxis(player);
      if (axis === "x") next.y = player.homeY;
      if (axis === "y") next.x = player.homeX;
      next.x = clamp(next.x, 4, 96);
      next.y = clamp(next.y, 4, 96);
      if (spec!.score === "reach_goal" && hitsSolid(next, bodies, player.id)) return;
      player.x = next.x;
      player.y = next.y;
    }

    function stepBodies() {
      if (!moving || over) return;
      for (const body of bodies) {
        if (body.motion !== "chase") continue;
        const quarry = ball ?? player;
        if (!quarry) continue;
        const axis = travelAxis(body);
        const speed = 0.72;
        if (axis === "x") body.x = clamp(body.x + clamp(quarry.x - body.x, -speed, speed), 6, 94);
        else if (axis === "y") body.y = clamp(body.y + clamp(quarry.y - body.y, -speed, speed), 6, 94);
        else {
          body.x = clamp(body.x + clamp(quarry.x - body.x, -speed, speed), 6, 94);
          body.y = clamp(body.y + clamp(quarry.y - body.y, -speed, speed), 6, 94);
        }
      }
      if (ball && spec!.score === "ball_exits") moveBall(ball, bodies, edges);
      if (spec!.score === "reach_goal" && player) {
        const goal = bodies.find((body) => body.role === "goal");
        if (goal && overlaps(player, goal)) finish("win");
        const rival = bodies.find((body) => body.motion === "chase");
        if (rival && overlaps(player, rival)) {
          them += 1;
          setScore({ you, them });
          player.x = player.homeX;
          player.y = player.homeY;
          if (them >= spec!.win_score) finish("lose");
        }
      }
      if (ball && (ball.x < -2 || ball.x > 102 || ball.y < -2 || ball.y > 102)) {
        const edge = ball.x < 0 ? "left" : ball.x > 100 ? "right" : ball.y < 0 ? "top" : "bottom";
        const playerEdge = player ? nearestEdge(player) : "bottom";
        if (edge === playerEdge) them += 1;
        else you += 1;
        setScore({ you, them });
        moving = false;
        setLive(false);
        ball.x = 50;
        ball.y = 50;
        ball.vx = 0;
        ball.vy = 0;
        if (you >= spec!.win_score) finish("win");
        else if (them >= spec!.win_score) finish("lose");
      }
    }

    function finish(outcome: "win" | "lose") {
      if (over) return;
      over = outcome;
      setWinner(outcome);
      onFinishRef.current(outcome);
    }

    function tick() {
      stepBodies();
      draw(ctx!, canvas!.width, canvas!.height, bodies, spec!.score);
      frame = window.requestAnimationFrame(tick);
    }
    frame = window.requestAnimationFrame(tick);

    canvas.addEventListener("pointerdown", onPointer);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("keydown", onKey);
    function onPointerMove(event: PointerEvent) {
      if (!pointer.down) return;
      place(event.clientX, event.clientY);
    }
    function onUp() {
      pointer.down = false;
    }
    window.addEventListener("pointerup", onUp);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointer);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerup", onUp);
    };
  }, [manifest, round]);

  if (!play?.enabled) return null;

  function replay() {
    setScore({ you: 0, them: 0 });
    setWinner(null);
    setLive(false);
    setRound((value) => value + 1);
    onReplay();
  }

  const waiting = play.score === "ball_exits" && !live && !winner;

  return (
    <div className="playfield">
      <div className="play-score">
        <span>
          {playerName} <strong>{score.you}</strong>
        </span>
        <span className="target">First to {play.win_score}</span>
        {play.score === "ball_exits" && (
          <span>
            {rivalName} <strong>{score.them}</strong>
          </span>
        )}
      </div>
      <div className="play-stage">
        <canvas ref={canvasRef} aria-label={manifest.title} />
        {winner && (
          <div className="play-end">
            <p>{winner === "win" ? manifest.win_text : manifest.lose_text}</p>
            <button type="button" className="again" onClick={replay}>
              Play again
            </button>
          </div>
        )}
      </div>
      {!winner && <p className="play-hint">{waiting ? "Drag to serve." : play.hint || "Drag to move."}</p>}
    </div>
  );
}

function serve(ball: Body, player: Body | undefined) {
  ball.x = 50;
  ball.y = 50;
  const edge = player ? nearestEdge(player) : "bottom";
  if (edge === "bottom") {
    ball.vx = 0.45;
    ball.vy = -1;
  } else if (edge === "top") {
    ball.vx = -0.45;
    ball.vy = 1;
  } else if (edge === "left") {
    ball.vx = 1;
    ball.vy = 0.4;
  } else {
    ball.vx = -1;
    ball.vy = -0.4;
  }
}

function moveBall(ball: Body, bodies: Body[], edges: Set<Edge>) {
  ball.x += ball.vx;
  ball.y += ball.vy;
  const radius = Math.min(ball.w, ball.h) / 2;
  if (!edges.has("left") && ball.x - radius < 1) {
    ball.x = 1 + radius;
    ball.vx = Math.abs(ball.vx);
  }
  if (!edges.has("right") && ball.x + radius > 99) {
    ball.x = 99 - radius;
    ball.vx = -Math.abs(ball.vx);
  }
  if (!edges.has("top") && ball.y - radius < 1) {
    ball.y = 1 + radius;
    ball.vy = Math.abs(ball.vy);
  }
  if (!edges.has("bottom") && ball.y + radius > 99) {
    ball.y = 99 - radius;
    ball.vy = -Math.abs(ball.vy);
  }
  for (const body of bodies) {
    if (!body.solid || body.id === ball.id) continue;
    bounce(ball, body);
  }
  if (Math.abs(ball.vx) < 0.35) ball.vx = Math.sign(ball.vx || 1) * 0.55;
  if (Math.abs(ball.vy) < 0.35) ball.vy = Math.sign(ball.vy || 1) * 0.55;
}

function bounce(ball: Body, rect: Body) {
  const radius = Math.min(ball.w, ball.h) / 2;
  const nearestX = clamp(ball.x, rect.x - rect.w / 2, rect.x + rect.w / 2);
  const nearestY = clamp(ball.y, rect.y - rect.h / 2, rect.y + rect.h / 2);
  let dx = ball.x - nearestX;
  let dy = ball.y - nearestY;
  const dist = Math.hypot(dx, dy) || 0.001;
  if (dist > radius) return;
  dx /= dist;
  dy /= dist;
  ball.x += dx * (radius - dist + 0.4);
  ball.y += dy * (radius - dist + 0.4);
  if (Math.abs(dx) > Math.abs(dy)) ball.vx = Math.abs(ball.vx) * Math.sign(dx || ball.vx || 1);
  else ball.vy = Math.abs(ball.vy) * Math.sign(dy || ball.vy || 1);
}

function openEdges(bodies: Body[]): Set<Edge> {
  const edges = new Set<Edge>();
  for (const body of bodies) {
    if (body.motion !== "slide" && body.motion !== "chase") continue;
    edges.add(nearestEdge(body));
  }
  if (edges.size === 0) {
    edges.add("left");
    edges.add("right");
  }
  return edges;
}

function nearestEdge(body: Body): Edge {
  const ranked: [Edge, number][] = [
    ["left", body.homeX],
    ["right", 100 - body.homeX],
    ["top", body.homeY],
    ["bottom", 100 - body.homeY],
  ];
  return ranked.reduce((best, item) => (item[1] < best[1] ? item : best))[0];
}

function travelAxis(body: Body): "x" | "y" | "free" {
  if (body.motion === "drag") return "free";
  const edge = nearestEdge(body);
  return edge === "left" || edge === "right" ? "y" : "x";
}

function hitsSolid(body: Body, bodies: Body[], ignore: string) {
  return bodies.some((other) => other.solid && other.id !== ignore && overlaps(body, other));
}

function overlaps(a: Body, b: Body) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}

function draw(ctx: CanvasRenderingContext2D, width: number, height: number, bodies: Body[], score: string) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#efe6d6";
  ctx.fillRect(0, 0, width, height);
  const rank = (body: Body) => (body.motion === "bounce" ? 2 : body.role === "scenery" ? 0 : 1);
  const ordered = [...bodies].sort((a, b) => rank(a) - rank(b));
  for (const body of ordered) paint(ctx, width, height, body);
  if (score === "ball_exits") {
    ctx.strokeStyle = "rgba(36, 28, 22, 0.18)";
    ctx.lineWidth = Math.max(2, width * 0.004);
    ctx.strokeRect(width * 0.04, height * 0.04, width * 0.92, height * 0.92);
  }
}

function paint(ctx: CanvasRenderingContext2D, width: number, height: number, body: Body) {
  const x = (body.x / 100) * width;
  const y = (body.y / 100) * height;
  const w = (body.w / 100) * width;
  const h = (body.h / 100) * height;
  ctx.fillStyle = INK[body.color] || INK.ink;
  ctx.strokeStyle = INK[body.color] || INK.ink;
  if (body.shape === "circle" || body.motion === "bounce") {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(4, Math.min(w, h) / 2), 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (body.shape === "line") {
    ctx.lineWidth = Math.max(2, Math.min(w, h));
    ctx.beginPath();
    if (w >= h) {
      ctx.moveTo(x - w / 2, y);
      ctx.lineTo(x + w / 2, y);
    } else {
      ctx.moveTo(x, y - h / 2);
      ctx.lineTo(x, y + h / 2);
    }
    ctx.stroke();
    return;
  }
  if (body.shape === "figure") {
    ctx.lineWidth = Math.max(2, width * 0.006);
    ctx.beginPath();
    ctx.arc(x, y - h * 0.28, Math.max(4, w * 0.18), 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.12);
    ctx.lineTo(x, y + h * 0.16);
    ctx.moveTo(x - w * 0.22, y);
    ctx.lineTo(x + w * 0.22, y);
    ctx.moveTo(x, y + h * 0.16);
    ctx.lineTo(x - w * 0.16, y + h * 0.42);
    ctx.moveTo(x, y + h * 0.16);
    ctx.lineTo(x + w * 0.16, y + h * 0.42);
    ctx.stroke();
    return;
  }
  const radius = Math.min(w, h) * 0.15;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, radius);
  ctx.fill();
}

function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(high, value));
}
