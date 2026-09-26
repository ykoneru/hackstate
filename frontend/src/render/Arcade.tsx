import { useEffect, useRef, useState, type ReactElement, type RefObject } from "react";
import type { GameDef } from "./catalog";
import { PACK_A } from "./packA";
import { PACK_B } from "./packB";
import { PACK_C } from "./packC";
import { PACK_D } from "./packD";

type EngineProps = {
  spec: GameDef;
  onFinish: (outcome: "win" | "lose") => void;
};

type ArcadeProps = EngineProps & { onReplay: () => void };

export function Arcade({ spec, onFinish, onReplay }: ArcadeProps) {
  const [end, setEnd] = useState<"win" | "lose" | null>(null);
  const [round, setRound] = useState(0);
  const Engine = PLAYERS[spec.id] ?? PaddleGame;

  return (
    <div className="playfield">
      <Engine
        key={`${spec.id}-${round}`}
        spec={spec}
        onFinish={(outcome) => {
          setEnd(outcome);
          onFinish(outcome);
        }}
      />
      {end && (
        <div className="play-end">
          <p>{end === "win" ? spec.win : spec.lose}</p>
          <button
            type="button"
            className="again"
            onClick={() => {
              setEnd(null);
              setRound((value) => value + 1);
              onReplay();
            }}
          >
            Play again
          </button>
        </div>
      )}
    </div>
  );
}


function PaddleGame({ spec, onFinish }: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ you: 0, them: 0 });
  const [served, setServed] = useState(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const showNet = spec.look === "table" || spec.look === "tennis" || spec.look === "pool";
    const felt = feltColor(spec.look);
    let you = 0;
    let them = 0;
    let live = false;
    let over: "win" | "lose" | null = null;
    let px = 50;
    let cx = 50;
    let bx = 50;
    let by = 50;
    let vx = 0;
    let vy = 0;
    let frame = 0;

    const resize = () => fitCanvas(canvas);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const end = (outcome: "win" | "lose") => {
      if (over) return;
      over = outcome;
      finishRef.current(outcome);
    };
    const point = () => {
      live = false;
      setServed(false);
      setScore({ you, them });
      bx = 50;
      by = 50;
      vx = 0;
      vy = 0;
      if (you >= 5) end("win");
      else if (them >= 5) end("lose");
    };
    const serve = () => {
      if (over || live) return;
      live = true;
      setServed(true);
      bx = 50;
      by = 62;
      vx = 0.62;
      vy = -1.05;
    };
    const place = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      px = clamp((((clientX - rect.left) / rect.width) * 100), 12, 88);
      serve();
    };
    const onPointer = (event: PointerEvent) => {
      if (event.type === "pointerdown") canvas.setPointerCapture(event.pointerId);
      place(event.clientX);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "a") px = clamp(px - 4, 12, 88);
      if (event.key === "ArrowRight" || event.key === "d") px = clamp(px + 4, 12, 88);
      if (event.key.startsWith("Arrow") || event.key === " ") {
        event.preventDefault();
        serve();
      }
    };
    const tick = () => {
      if (live && !over) {
        cx = clamp(cx + clamp(bx - cx, -0.9, 0.9), 12, 88);
        bx += vx;
        by += vy;
        if (bx < 10) {
          bx = 10;
          vx = Math.abs(vx);
        }
        if (bx > 90) {
          bx = 90;
          vx = -Math.abs(vx);
        }
        if (by > 80 && by < 90 && Math.abs(bx - px) < 14 && vy > 0) {
          vy = -Math.abs(vy);
          vx += (bx - px) * 0.08;
          by = 80;
        }
        if (by < 20 && by > 10 && Math.abs(bx - cx) < 14 && vy < 0) {
          vy = Math.abs(vy);
          vx += (bx - cx) * 0.05;
          by = 20;
        }
        vx = clamp(vx, -1.6, 1.6);
        if (by > 104) {
          them += 1;
          point();
        } else if (by < -4) {
          you += 1;
          point();
        }
      }
      drawTable(ctx, canvas, felt, showNet, px, cx, bx, by);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    canvas.addEventListener("pointerdown", onPointer);
    canvas.addEventListener("pointermove", (event) => {
      if (event.buttons) onPointer(event);
    });
    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [spec.look]);

  return (
    <>
      <Score you={score.you} them={score.them} goal="First to 5" />
      <Stage canvasRef={canvasRef} label={spec.title} />
      <p className="play-hint">{served ? "Drag to move." : "Drag to serve."}</p>
    </>
  );
}

function BreakoutGame({ spec, onFinish }: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [left, setLeft] = useState(36);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const bricks = Array.from({ length: 36 }, (_, index) => ({
      c: index % 9,
      r: Math.floor(index / 9),
      alive: true,
    }));
    let px = 50;
    let bx = 50;
    let by = 70;
    let vx = 0.7;
    let vy = -0.9;
    let live = false;
    let over: "win" | "lose" | null = null;
    let frame = 0;
    const resize = () => fitCanvas(canvas);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const place = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      px = clamp(((clientX - rect.left) / rect.width) * 100, 12, 88);
      live = true;
    };
    const tick = () => {
      if (live && !over) {
        bx += vx;
        by += vy;
        if (bx < 6 || bx > 94) vx *= -1;
        if (by < 8) vy = Math.abs(vy);
        if (by > 84 && by < 92 && Math.abs(bx - px) < 14 && vy > 0) {
          vy = -Math.abs(vy);
          vx += (bx - px) * 0.06;
        }
        for (const brick of bricks) {
          if (!brick.alive) continue;
          const x = 12 + brick.c * 8.6;
          const y = 14 + brick.r * 7;
          if (Math.abs(bx - x) < 5 && Math.abs(by - y) < 4) {
            brick.alive = false;
            vy *= -1;
            setLeft(bricks.filter((item) => item.alive).length);
            break;
          }
        }
        if (bricks.every((brick) => !brick.alive)) {
          over = "win";
          finishRef.current("win");
        } else if (by > 104) {
          over = "lose";
          finishRef.current("lose");
        }
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = spec.look === "candy" ? "#2a2140" : "#1b2430";
      ctx.fillRect(0, 0, w, h);
      bricks.forEach((brick) => {
        if (!brick.alive) return;
        ctx.fillStyle = ["#e07a5f", "#f2cc8f", "#81b29a", "#3d85c6"][brick.r % 4];
        ctx.fillRect(((12 + brick.c * 8.6) / 100) * w - w * 0.035, ((14 + brick.r * 7) / 100) * h, w * 0.07, h * 0.04);
      });
      ctx.fillStyle = "#fffcf8";
      ctx.fillRect(((px - 10) / 100) * w, (86 / 100) * h, w * 0.2, h * 0.025);
      ctx.beginPath();
      ctx.arc((bx / 100) * w, (by / 100) * h, Math.max(4, w * 0.016), 0, Math.PI * 2);
      ctx.fill();
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    canvas.addEventListener("pointerdown", (event) => place(event.clientX));
    canvas.addEventListener("pointermove", (event) => {
      if (event.buttons) place(event.clientX);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [spec.look]);
  return (
    <>
      <Score you={36 - left} them={0} goal={`${left} bricks left`} />
      <Stage canvasRef={canvasRef} label={spec.title} />
      <p className="play-hint">Drag the paddle.</p>
    </>
  );
}

function FlappyGame({ spec, onFinish }: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let y = 50;
    let vy = 0;
    let live = false;
    let passed = 0;
    let over: "win" | "lose" | null = null;
    let frame = 0;
    const pipes: { x: number; gap: number; scored: boolean }[] = [];
    const resize = () => fitCanvas(canvas);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const flap = () => {
      if (over) return;
      live = true;
      vy = -1.7;
    };
    const tick = () => {
      if (live && !over) {
        vy += 0.12;
        y += vy;
        if (frame % 90 === 0) pipes.push({ x: 110, gap: 28 + (frame % 5) * 6, scored: false });
        for (const pipe of pipes) {
          pipe.x -= 1.15;
          if (!pipe.scored && pipe.x < 28) {
            pipe.scored = true;
            passed += 1;
            setScore(passed);
            if (passed >= 8) {
              over = "win";
              finishRef.current("win");
            }
          }
          const hitGap = y > pipe.gap && y < pipe.gap + 28;
          if (pipe.x < 34 && pipe.x > 18 && !hitGap) {
            over = "lose";
            finishRef.current("lose");
          }
        }
        if (y > 96 || y < 4) {
          over = "lose";
          finishRef.current("lose");
        }
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = skyColor(spec.look);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(36, 28, 22, 0.82)";
      for (const pipe of pipes) {
        const x = (pipe.x / 100) * w;
        const gap = (pipe.gap / 100) * h;
        ctx.fillRect(x, 0, w * 0.08, gap);
        ctx.fillRect(x, gap + h * 0.28, w * 0.08, h);
      }
      ctx.fillStyle = actorColor(spec.look);
      ctx.beginPath();
      ctx.arc((28 / 100) * w, (y / 100) * h, Math.max(8, w * 0.035), 0, Math.PI * 2);
      ctx.fill();
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    canvas.addEventListener("pointerdown", flap);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "ArrowUp") {
        event.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, [spec.look]);
  return (
    <>
      <Score you={score} them={0} goal="Reach 8" />
      <Stage canvasRef={canvasRef} label={spec.title} />
      <p className="play-hint">Tap to flap.</p>
    </>
  );
}

function DodgeGame({ spec, onFinish }: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const crossing = spec.look === "cross";
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let lane = 1;
    let py = 88;
    let passed = 0;
    let live = false;
    let over: "win" | "lose" | null = null;
    let frame = 0;
    const obstacles: { lane: number; y: number; x: number; dir: number }[] = [];
    const resize = () => fitCanvas(canvas);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const nudge = (dir: number) => {
      live = true;
      if (crossing) py = clamp(py + dir * 12, 8, 90);
      else lane = clamp(lane + dir, 0, 2);
    };
    const tick = () => {
      if (live && !over) {
        if (frame % 40 === 0) {
          obstacles.push(crossing ? { lane: 20 + (obstacles.length % 4) * 16, y: 0, x: frame % 2 ? -10 : 110, dir: frame % 2 ? 1.4 : -1.4 } : { lane: frame % 3, y: -8, x: 0, dir: 1.6 });
        }
        for (const item of obstacles) {
          if (crossing) item.x += item.dir;
          else item.y += 1.5;
          if (!crossing && item.y > 78 && item.y < 96 && item.lane === lane) {
            over = "lose";
            finishRef.current("lose");
          }
          if (crossing && Math.abs(item.x - 50) < 10 && Math.abs(item.lane - py) < 8) {
            over = "lose";
            finishRef.current("lose");
          }
          if (!crossing && item.y > 100) {
            passed += 1;
            setScore(passed);
            item.y = 200;
            if (passed >= 12) {
              over = "win";
              finishRef.current("win");
            }
          }
        }
        if (crossing && py <= 10) {
          over = "win";
          finishRef.current("win");
        }
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = crossing ? "#d9e4c8" : spec.look === "ski" ? "#e8eef2" : "#2c3338";
      ctx.fillRect(0, 0, w, h);
      if (!crossing) {
        ctx.strokeStyle = "rgba(255,252,248,0.35)";
        ctx.beginPath();
        ctx.moveTo(w / 3, 0);
        ctx.lineTo(w / 3, h);
        ctx.moveTo((2 * w) / 3, 0);
        ctx.lineTo((2 * w) / 3, h);
        ctx.stroke();
      }
      ctx.fillStyle = spec.look === "ski" ? "#3d6b4f" : "#e07a5f";
      for (const item of obstacles) {
        if (crossing) ctx.fillRect((item.x / 100) * w, (item.lane / 100) * h, w * 0.18, h * 0.06);
        else ctx.fillRect(((item.lane + 0.2) / 3) * w, (item.y / 100) * h, w * 0.2, h * 0.08);
      }
      ctx.fillStyle = "#241c16";
      if (crossing) ctx.fillRect((42 / 100) * w, (py / 100) * h, w * 0.12, h * 0.07);
      else ctx.fillRect(((lane + 0.25) / 3) * w, (78 / 100) * h, w * 0.18, h * 0.1);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "a") nudge(crossing ? 0 : -1);
      if (event.key === "ArrowRight" || event.key === "d") nudge(crossing ? 0 : 1);
      if (event.key === "ArrowUp" || event.key === "w") nudge(crossing ? -1 : 0);
      if (event.key === "ArrowDown" || event.key === "s") nudge(crossing ? 1 : 0);
      if (event.key.startsWith("Arrow")) event.preventDefault();
    };
    canvas.addEventListener("pointerdown", (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      if (crossing) nudge(event.clientY < rect.top + rect.height / 2 ? -1 : 1);
      else nudge(x < 0.4 ? -1 : x > 0.6 ? 1 : 0);
    });
    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, [crossing, spec.look]);
  return (
    <>
      <Score you={score} them={0} goal={crossing ? "Reach the top" : "Pass 12"} />
      <Stage canvasRef={canvasRef} label={spec.title} />
      <p className="play-hint">{crossing ? "Tap the top half to hop forward." : "Tap left or right to change lanes."}</p>
    </>
  );
}

function JumpGame({ spec, onFinish }: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let y = 72;
    let vy = 0;
    let live = false;
    let cleared = 0;
    let over: "win" | "lose" | null = null;
    let frame = 0;
    const hurdles: { x: number; scored: boolean }[] = [];
    const resize = () => fitCanvas(canvas);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const hop = () => {
      if (over) return;
      live = true;
      if (y >= 70) vy = -2.4;
    };
    const tick = () => {
      if (live && !over) {
        vy += 0.12;
        y += vy;
        if (y > 72) {
          y = 72;
          vy = 0;
        }
        if (frame % 70 === 0) hurdles.push({ x: 110, scored: false });
        for (const hurdle of hurdles) {
          hurdle.x -= 1.4;
          if (!hurdle.scored && hurdle.x < 22) {
            hurdle.scored = true;
            cleared += 1;
            setScore(cleared);
            if (cleared >= 8) {
              over = "win";
              finishRef.current("win");
            }
          }
          if (hurdle.x < 30 && hurdle.x > 16 && y > 58) {
            over = "lose";
            finishRef.current("lose");
          }
        }
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = spec.look === "dash" ? "#20182a" : "#f4efe4";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = spec.look === "dash" ? "#3a3150" : "#c8b89a";
      ctx.fillRect(0, (78 / 100) * h, w, h);
      ctx.fillStyle = spec.look === "dino" ? "#3d6b4f" : "#241c16";
      for (const hurdle of hurdles) ctx.fillRect((hurdle.x / 100) * w, (58 / 100) * h, w * 0.03, (20 / 100) * h);
      ctx.fillStyle = spec.look === "dash" ? "#7dcea0" : "#b5523a";
      ctx.fillRect((18 / 100) * w, (y / 100) * h, w * 0.06, h * 0.08);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    canvas.addEventListener("pointerdown", hop);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "ArrowUp") {
        event.preventDefault();
        hop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, [spec.look]);
  return (
    <>
      <Score you={score} them={0} goal="Clear 8" />
      <Stage canvasRef={canvasRef} label={spec.title} />
      <p className="play-hint">Tap to jump.</p>
    </>
  );
}

const MAZES = [
  ["##########", "#S.......#", "#.###.#..#", "#.#...#.##", "#.#.#....#", "#...#.##E#", "##########"],
  ["##########", "#S#.....##", "#.#.##...#", "#.#....#.#", "#.####.#.#", "#......#E#", "##########"],
  ["##########", "#S..#....#", "###.#.##.#", "#...#....#", "#.#####.##", "#.......E#", "##########"],
];

function MazeGame({ spec, onFinish }: EngineProps) {
  const map = MAZES[hash(spec.id) % MAZES.length].map((row) => row.split(""));
  const [cells, setCells] = useState(map);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const done = useRef(false);

  function move(dx: number, dy: number) {
    if (done.current) return;
    setCells((current) => {
      const next = current.map((row) => [...row]);
      let sx = 0;
      let sy = 0;
      next.forEach((row, y) =>
        row.forEach((cell, x) => {
          if (cell === "S" || cell === "P") {
            sx = x;
            sy = y;
          }
        }),
      );
      const tx = sx + dx;
      const ty = sy + dy;
      if (!next[ty] || next[ty][tx] === "#") return current;
      const landed = next[ty][tx];
      next[sy][sx] = ".";
      next[ty][tx] = "P";
      if (landed === "E") {
        done.current = true;
        finishRef.current("win");
      }
      return next;
    });
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") move(-1, 0);
      if (event.key === "ArrowRight") move(1, 0);
      if (event.key === "ArrowUp") move(0, -1);
      if (event.key === "ArrowDown") move(0, 1);
      if (event.key.startsWith("Arrow")) event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const wall = spec.look === "hedge" ? "#3d6b4f" : spec.look === "dungeon" ? "#3a3128" : "#241c16";
  return (
    <>
      <p className="play-hint">Find the pale square.</p>
      <div className="maze-board" style={{ background: spec.look === "hedge" ? "#e7f0df" : "#f6f1e8" }}>
        {cells.map((row, y) => (
          <div className="maze-row" key={y}>
            {row.map((cell, x) => (
              <span key={x} className="maze-cell" style={{ background: cell === "#" ? wall : cell === "E" ? "#f2cc8f" : "transparent", borderRadius: cell === "P" || cell === "S" ? 99 : 4 }}>
                {(cell === "P" || cell === "S") && <i />}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="pad">
        <button type="button" onClick={() => move(0, -1)} aria-label="Up">↑</button>
        <button type="button" onClick={() => move(-1, 0)} aria-label="Left">←</button>
        <button type="button" onClick={() => move(0, 1)} aria-label="Down">↓</button>
        <button type="button" onClick={() => move(1, 0)} aria-label="Right">→</button>
      </div>
    </>
  );
}

function SnakeGame({ spec, onFinish }: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(1);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const size = 14;
    let dir = { x: 1, y: 0 };
    let next = { x: 1, y: 0 };
    let snake = [{ x: 4, y: 7 }];
    let food = { x: 9, y: 7 };
    let over: "win" | "lose" | null = null;
    let tickCount = 0;
    let frame = 0;
    const resize = () => fitCanvas(canvas);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && dir.x === 0) next = { x: -1, y: 0 };
      if (event.key === "ArrowRight" && dir.x === 0) next = { x: 1, y: 0 };
      if (event.key === "ArrowUp" && dir.y === 0) next = { x: 0, y: -1 };
      if (event.key === "ArrowDown" && dir.y === 0) next = { x: 0, y: 1 };
      if (event.key.startsWith("Arrow")) event.preventDefault();
    };
    const tick = () => {
      tickCount += 1;
      if (!over && tickCount % 8 === 0) {
        dir = next;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.y < 0 || head.x >= size || head.y >= size || snake.some((part) => part.x === head.x && part.y === head.y)) {
          over = "lose";
          finishRef.current("lose");
        } else {
          snake = [head, ...snake];
          if (head.x === food.x && head.y === food.y) {
            setScore(snake.length);
            food = { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) };
            if (snake.length >= 10) {
              over = "win";
              finishRef.current("win");
            }
          } else snake.pop();
        }
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "#e7f0df";
      ctx.fillRect(0, 0, w, h);
      const cw = w / size;
      const ch = h / size;
      ctx.fillStyle = "#b5523a";
      ctx.fillRect(food.x * cw, food.y * ch, cw - 2, ch - 2);
      ctx.fillStyle = "#1f6b45";
      snake.forEach((part) => ctx.fillRect(part.x * cw, part.y * ch, cw - 2, ch - 2));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    window.addEventListener("keydown", onKey);
    canvas.addEventListener("pointerdown", (event) => {
      const rect = canvas.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      if (Math.abs(dx) > Math.abs(dy)) onKey(new KeyboardEvent("keydown", { key: dx < 0 ? "ArrowLeft" : "ArrowRight" }));
      else onKey(new KeyboardEvent("keydown", { key: dy < 0 ? "ArrowUp" : "ArrowDown" }));
    });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  return (
    <>
      <Score you={score} them={0} goal="Grow to 10" />
      <Stage canvasRef={canvasRef} label={spec.title} />
      <p className="play-hint">Swipe or use arrow keys.</p>
    </>
  );
}

function ShootGame({ spec, onFinish }: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const ducks = spec.look === "duck";
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let px = 50;
    let hits = 0;
    let over: "win" | "lose" | null = null;
    let frame = 0;
    const enemies: { x: number; y: number; vx: number }[] = [];
    const shots: { x: number; y: number }[] = [];
    const resize = () => fitCanvas(canvas);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const fire = (x: number) => {
      if (over) return;
      if (ducks) {
        const hit = enemies.findIndex((enemy) => Math.abs(enemy.x - x) < 8 && Math.abs(enemy.y - 40) < 12);
        if (hit >= 0) {
          enemies.splice(hit, 1);
          hits += 1;
          setScore(hits);
          if (hits >= 8) {
            over = "win";
            finishRef.current("win");
          }
        }
      } else shots.push({ x: px, y: 80 });
    };
    const tick = () => {
      if (!over && frame % 50 === 0) enemies.push({ x: ducks ? -8 : 10 + (frame % 5) * 16, y: ducks ? 20 + (frame % 3) * 18 : 8, vx: ducks ? 0.8 : 0 });
      if (!over) {
        for (const enemy of enemies) {
          if (ducks) enemy.x += enemy.vx;
          else enemy.y += 0.45;
        }
        if (!ducks) {
          for (const shot of shots) shot.y -= 2.2;
          for (let e = enemies.length - 1; e >= 0; e -= 1) {
            const hit = shots.findIndex((shot) => Math.abs(shot.x - enemies[e].x) < 8 && Math.abs(shot.y - enemies[e].y) < 6);
            if (hit >= 0) {
              enemies.splice(e, 1);
              shots.splice(hit, 1);
              hits += 1;
              setScore(hits);
              if (hits >= 12) {
                over = "win";
                finishRef.current("win");
              }
            }
          }
          if (enemies.some((enemy) => enemy.y > 78)) {
            over = "lose";
            finishRef.current("lose");
          }
        } else if (enemies.some((enemy) => enemy.x > 108)) {
          over = "lose";
          finishRef.current("lose");
        }
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = ducks ? "#c5dff0" : "#101820";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = ducks ? "#3d6b4f" : "#7dcea0";
      enemies.forEach((enemy) => ctx.fillRect((enemy.x / 100) * w, (enemy.y / 100) * h, w * 0.08, h * 0.05));
      ctx.fillStyle = "#f2cc8f";
      shots.forEach((shot) => ctx.fillRect((shot.x / 100) * w, (shot.y / 100) * h, 4, h * 0.04));
      if (!ducks) {
        ctx.fillStyle = "#fffcf8";
        ctx.fillRect(((px - 6) / 100) * w, (84 / 100) * h, w * 0.12, h * 0.04);
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    canvas.addEventListener("pointerdown", (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      if (!ducks) px = clamp(x, 8, 92);
      fire(x);
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") px = clamp(px - 4, 8, 92);
      if (event.key === "ArrowRight") px = clamp(px + 4, 8, 92);
      if (event.key === " ") fire(px);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, [ducks]);
  return (
    <>
      <Score you={score} them={0} goal={ducks ? "Hit 8" : "Hit 12"} />
      <Stage canvasRef={canvasRef} label={spec.title} />
      <p className="play-hint">{ducks ? "Tap the targets." : "Tap to move and shoot."}</p>
    </>
  );
}

function CatchGame({ spec, onFinish }: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ got: 0, missed: 0 });
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let px = 50;
    let got = 0;
    let missed = 0;
    let over: "win" | "lose" | null = null;
    let frame = 0;
    const items: { x: number; y: number }[] = [];
    const resize = () => fitCanvas(canvas);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const tick = () => {
      if (!over && frame % 35 === 0) items.push({ x: 10 + (frame % 8) * 10, y: -6 });
      if (!over) {
        for (const item of items) {
          item.y += 1.3;
          if (item.y > 80 && item.y < 92 && Math.abs(item.x - px) < 12) {
            item.y = 200;
            got += 1;
            setScore({ got, missed });
            if (got >= 10) {
              over = "win";
              finishRef.current("win");
            }
          } else if (item.y > 100 && item.y < 140) {
            item.y = 200;
            missed += 1;
            setScore({ got, missed });
            if (missed >= 5) {
              over = "lose";
              finishRef.current("lose");
            }
          }
        }
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "#f6f1e8";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = spec.look === "ball" ? "#e07a5f" : spec.look === "fish" ? "#3d85c6" : "#e2b657";
      items.forEach((item) => {
        ctx.beginPath();
        ctx.arc((item.x / 100) * w, (item.y / 100) * h, Math.max(6, w * 0.025), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "#241c16";
      ctx.fillRect(((px - 10) / 100) * w, (84 / 100) * h, w * 0.2, h * 0.04);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    const place = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      px = clamp(((clientX - rect.left) / rect.width) * 100, 12, 88);
    };
    canvas.addEventListener("pointerdown", (event) => place(event.clientX));
    canvas.addEventListener("pointermove", (event) => {
      if (event.buttons) place(event.clientX);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [spec.look]);
  return (
    <>
      <Score you={score.got} them={score.missed} goal="Catch 10" />
      <Stage canvasRef={canvasRef} label={spec.title} />
      <p className="play-hint">Drag the basket.</p>
    </>
  );
}

function WhackGame({ spec, onFinish }: EngineProps) {
  const [active, setActive] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const over = useRef(false);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!over.current) setActive(Math.floor(Math.random() * 9));
    }, 700);
    return () => window.clearInterval(timer);
  }, []);
  function tap(index: number) {
    if (over.current) return;
    if (index === active) {
      const next = hits + 1;
      setHits(next);
      setActive((value) => (value + 3) % 9);
      if (next >= 10) {
        over.current = true;
        finishRef.current("win");
      }
    } else {
      const next = misses + 1;
      setMisses(next);
      if (next >= 8) {
        over.current = true;
        finishRef.current("lose");
      }
    }
  }
  const mark = spec.look === "bug" ? "•" : spec.look === "slice" ? "●" : spec.look === "boxer" ? "◉" : "●";
  return (
    <>
      <Score you={hits} them={misses} goal="Hit 10" />
      <div className="mini-grid moles">
        {Array.from({ length: 9 }, (_, index) => (
          <button type="button" key={index} onClick={() => tap(index)} aria-label={spec.title}>
            {index === active ? mark : ""}
          </button>
        ))}
      </div>
      <p className="play-hint">Tap the one that pops up.</p>
    </>
  );
}

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function TicTacToeGame({ spec, onFinish }: EngineProps) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const over = useRef(false);

  function winner(cells: (string | null)[]) {
    return LINES.map(([a, b, c]) => (cells[a] && cells[a] === cells[b] && cells[a] === cells[c] ? cells[a] : null)).find(Boolean) || null;
  }

  function play(index: number) {
    if (over.current || board[index]) return;
    const next = board.slice();
    next[index] = "X";
    const open = next.flatMap((cell, cellIndex) => (cell ? [] : [cellIndex]));
    if (!winner(next) && open.length) {
      const choice = open.find((cell) => {
        const trial = next.slice();
        trial[cell] = "O";
        return winner(trial) === "O";
      }) ?? open[Math.floor(Math.random() * open.length)];
      next[choice] = "O";
    }
    setBoard(next);
    const who = winner(next);
    if (who === "X" || who === "O" || next.every(Boolean)) {
      over.current = true;
      finishRef.current(who === "O" ? "lose" : "win");
    }
  }

  return (
    <>
      <div className="mini-grid">
        {board.map((cell, index) => (
          <button type="button" key={index} onClick={() => play(index)} aria-label={spec.title}>
            {cell}
          </button>
        ))}
      </div>
      <p className="play-hint">You are X.</p>
    </>
  );
}

const PIECES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
];

function TetrisGame({ spec, onFinish }: EngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lines, setLines] = useState(0);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const cols = 10;
    const rows = 18;
    const board = Array.from({ length: rows }, () => Array(cols).fill(0));
    let shape = PIECES[0].map((row) => [...row]);
    let px = 3;
    let py = 0;
    let cleared = 0;
    let over: "win" | "lose" | null = null;
    let tickCount = 0;
    let frame = 0;
    const resize = () => fitCanvas(canvas);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const fits = (next: number[][], x: number, y: number) =>
      next.every((row, dy) => row.every((cell, dx) => !cell || (y + dy >= 0 && y + dy < rows && x + dx >= 0 && x + dx < cols && !board[y + dy][x + dx])));
    const spawn = () => {
      shape = PIECES[Math.floor(Math.random() * PIECES.length)].map((row) => [...row]);
      px = 3;
      py = 0;
      if (!fits(shape, px, py)) {
        over = "lose";
        finishRef.current("lose");
      }
    };
    const lock = () => {
      shape.forEach((row, dy) =>
        row.forEach((cell, dx) => {
          if (cell && board[py + dy]) board[py + dy][px + dx] = 1;
        }),
      );
      for (let y = rows - 1; y >= 0; y -= 1) {
        if (board[y].every(Boolean)) {
          board.splice(y, 1);
          board.unshift(Array(cols).fill(0));
          cleared += 1;
          setLines(cleared);
          y += 1;
          if (cleared >= 4) {
            over = "win";
            finishRef.current("win");
          }
        }
      }
      spawn();
    };
    const drop = () => {
      if (over) return;
      if (fits(shape, px, py + 1)) py += 1;
      else lock();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && fits(shape, px - 1, py)) px -= 1;
      if (event.key === "ArrowRight" && fits(shape, px + 1, py)) px += 1;
      if (event.key === "ArrowDown") drop();
      if (event.key === "ArrowUp" || event.key === " ") {
        const turned = shape[0].map((_, index) => shape.map((row) => row[index]).reverse());
        if (fits(turned, px, py)) shape = turned;
      }
      if (event.key.startsWith("Arrow") || event.key === " ") event.preventDefault();
    };
    const tick = () => {
      tickCount += 1;
      if (!over && tickCount % 24 === 0) drop();
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "#16141c";
      ctx.fillRect(0, 0, w, h);
      const cw = w / cols;
      const ch = h / rows;
      const paint = (x: number, y: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2);
      };
      board.forEach((row, y) => row.forEach((cell, x) => cell && paint(x, y, "#7eb6d9")));
      shape.forEach((row, dy) => row.forEach((cell, dx) => cell && paint(px + dx, py + dy, "#f2cc8f")));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    window.addEventListener("keydown", onKey);
    canvas.addEventListener("pointerdown", (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      if (x < 0.33) onKey(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
      else if (x > 0.66) onKey(new KeyboardEvent("keydown", { key: "ArrowRight" }));
      else onKey(new KeyboardEvent("keydown", { key: "ArrowUp" }));
    });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  return (
    <>
      <Score you={lines} them={0} goal="Clear 4 lines" />
      <Stage canvasRef={canvasRef} label={spec.title} />
      <p className="play-hint">Tap the sides to move. Tap the middle to turn.</p>
    </>
  );
}

function Score({ you, them, goal }: { you: number; them: number; goal: string }) {
  return (
    <div className="play-score">
      <span>
        You <strong>{you}</strong>
      </span>
      <span className="target">{goal}</span>
      {them > 0 && (
        <span>
          Them <strong>{them}</strong>
        </span>
      )}
    </div>
  );
}

function Stage({ canvasRef, label }: { canvasRef: RefObject<HTMLCanvasElement | null>; label: string }) {
  return (
    <div className="play-stage">
      <canvas ref={canvasRef} aria-label={label} />
    </div>
  );
}

function fitCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
}

function drawTable(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  felt: string,
  showNet: boolean,
  px: number,
  cx: number,
  bx: number,
  by: number,
) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#143024";
  ctx.fillRect(0, 0, w, h);
  const x = w * 0.08;
  const y = h * 0.06;
  const tw = w * 0.84;
  const th = h * 0.88;
  ctx.fillStyle = "#8a5a32";
  ctx.beginPath();
  ctx.roundRect(x - 10, y - 10, tw + 20, th + 20, 16);
  ctx.fill();
  ctx.fillStyle = felt;
  ctx.beginPath();
  ctx.roundRect(x, y, tw, th, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,252,248,0.9)";
  ctx.lineWidth = Math.max(2, w * 0.008);
  ctx.strokeRect(x + tw * 0.05, y + th * 0.05, tw * 0.9, th * 0.9);
  if (showNet) {
    ctx.beginPath();
    ctx.moveTo(w / 2, y + 8);
    ctx.lineTo(w / 2, y + th - 8);
    ctx.stroke();
  }
  const bar = (xPct: number, yPct: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect((xPct / 100) * w - w * 0.11, (yPct / 100) * h - h * 0.018, w * 0.22, h * 0.036, 6);
    ctx.fill();
  };
  bar(cx, 14, "#b5523a");
  bar(px, 86, "#241c16");
  ctx.fillStyle = "#fffcf8";
  ctx.beginPath();
  ctx.arc((bx / 100) * w, (by / 100) * h, Math.max(5, w * 0.018), 0, Math.PI * 2);
  ctx.fill();
}

function feltColor(look: string) {
  if (look === "hockey") return "#1a5680";
  if (look === "plain") return "#1a1a1a";
  if (look === "pool") return "#0e4d38";
  if (look === "tennis") return "#3d8c4a";
  return "#1f7a45";
}

function skyColor(look: string) {
  if (look === "rocket" || look === "dragon") return "#1b2430";
  if (look === "fish") return "#d5ebe8";
  return "#d7ecf5";
}

function actorColor(look: string) {
  if (look === "copter") return "#f2cc8f";
  if (look === "plane" || look === "balloon") return "#fffcf8";
  if (look === "fish") return "#e07a5f";
  if (look === "rocket" || look === "dragon") return "#e07a5f";
  return "#f2cc8f";
}

function hash(value: string) {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(high, value));
}

const PLAYERS: Record<string, (props: EngineProps) => ReactElement> = {
  ping_pong: PaddleGame,
  breakout: BreakoutGame,
  flappy_bird: FlappyGame,
  traffic: DodgeGame,
  frogger: DodgeGame,
  hurdles: JumpGame,
  maze: MazeGame,
  snake: SnakeGame,
  space_invaders: ShootGame,
  duck_hunt: ShootGame,
  fruit_catch: CatchGame,
  whack_a_mole: WhackGame,
  tic_tac_toe: TicTacToeGame,
  tetris: TetrisGame,
  ...PACK_A,
  ...PACK_B,
  ...PACK_C,
  ...PACK_D,
};
