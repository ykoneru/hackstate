import { useEffect, useMemo, useRef, useState, type PointerEvent as Press } from "react";
import type { ReactElement } from "react";
import type { GameDef } from "./catalog";
import { useEnd } from "./end";

type Props = { spec: GameDef; onFinish: (outcome: "win" | "lose") => void };
type Player = (props: Props) => ReactElement;

function Wrap({ spec, children }: { spec: GameDef; children: React.ReactNode }) {
  return (
    <div className="mini-wrap" aria-label={spec.title}>
      {children}
    </div>
  );
}

function PianoTiles({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [col, setCol] = useState(() => Math.floor(Math.random() * 4));
  const [n, setN] = useState(0);
  function tap(index: number) {
    if (index !== col) end("lose");
    else if (n + 1 >= 12) end("win");
    else {
      setN(n + 1);
      setCol(Math.floor(Math.random() * 4));
    }
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {[0, 1, 2, 3].map((index) => (
          <button type="button" key={index} onClick={() => tap(index)} style={{ minHeight: 160, background: index === col ? "#241c16" : "#fffcf8" }} />
        ))}
      </div>
      <p className="play-hint">Tap the black tile. {n}/12</p>
    </Wrap>
  );
}

function StackTower({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const mover = useRef({ x: 8, w: 42, dir: 1.4 });
  const [blocks, setBlocks] = useState([{ x: 29, w: 42 }]);
  const [x, setX] = useState(8);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const block = mover.current;
      block.x += block.dir;
      if (block.x < 0 || block.x + block.w > 100) block.dir *= -1;
      setX(block.x);
    }, 30);
    return () => window.clearInterval(timer);
  }, []);
  function drop() {
    const prev = blocks[blocks.length - 1];
    const left = Math.max(prev.x, mover.current.x);
    const right = Math.min(prev.x + prev.w, mover.current.x + mover.current.w);
    const w = right - left;
    if (w < 4) end("lose");
    else if (blocks.length >= 6) end("win");
    else {
      mover.current.w = w;
      mover.current.x = left;
      setBlocks([...blocks, { x: left, w }]);
    }
  }
  return (
    <Wrap spec={spec}>
      <button type="button" className="stack-stage" onClick={drop}>
        {blocks.map((block, index) => (
          <i key={index} style={{ left: `${block.x}%`, bottom: 12 + index * 22, width: `${block.w}%` }} />
        ))}
        <i style={{ left: `${x}%`, bottom: 12 + blocks.length * 22, width: `${mover.current.w}%` }} />
      </button>
      <p className="play-hint">Tap to drop the slab. Stack six.</p>
    </Wrap>
  );
}

function KnifeHit({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [angle, setAngle] = useState(0);
  const [knives, setKnives] = useState<number[]>([]);
  useEffect(() => {
    const timer = window.setInterval(() => setAngle((value) => (value + 7) % 360), 30);
    return () => window.clearInterval(timer);
  }, []);
  function toss() {
    const hit = knives.some((knife) => {
      const gap = Math.abs(((knife - angle + 540) % 360) - 180);
      return gap < 16;
    });
    if (hit) end("lose");
    else if (knives.length + 1 >= 5) end("win");
    else setKnives([...knives, angle]);
  }
  return (
    <Wrap spec={spec}>
      <button type="button" className="knife-stage" onClick={toss}>
        <span style={{ transform: `rotate(${angle}deg)` }} />
        {knives.map((knife) => (
          <b key={knife} style={{ transform: `rotate(${knife}deg)` }} />
        ))}
      </button>
      <p className="play-hint">Tap to throw. Five knives, and do not hit one.</p>
    </Wrap>
  );
}

function LunarLander({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thrust = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    size(canvas);
    let x = canvas.width * 0.25;
    let y = 30;
    let vx = 0.7;
    let vy = 0;
    let frame = 0;
    const tick = () => {
      vy += thrust.current ? -0.16 : 0.09;
      vx += thrust.current ? 0.03 : 0;
      x = Math.max(12, Math.min(canvas.width - 12, x + vx));
      y += vy;
      ctx.fillStyle = "#d7ecf5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const pad = canvas.width * 0.34;
      ctx.fillStyle = "#1f6b45";
      ctx.fillRect(pad, canvas.height - 18, canvas.width * 0.32, 10);
      ctx.fillStyle = "#241c16";
      ctx.fillRect(x - 9, y, 18, 14);
      if (y >= canvas.height - 32) {
        const onPad = x > pad && x < pad + canvas.width * 0.32;
        end(onPad && vy < 2.4 ? "win" : "lose");
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <Wrap spec={spec}>
      <canvas ref={canvasRef} className="mini-canvas" />
      <button type="button" className="again" onPointerDown={() => { thrust.current = true; }} onPointerUp={() => { thrust.current = false; }} onPointerLeave={() => { thrust.current = false; }}>
        Hold to thrust
      </button>
      <p className="play-hint">Land softly on the green pad.</p>
    </Wrap>
  );
}

function Asteroids({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const left = useRef(false);
  const right = useRef(false);
  const go = useRef(false);
  const fire = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    size(canvas);
    let angle = -Math.PI / 2;
    let x = canvas.width / 2;
    let y = canvas.height / 2;
    let vx = 0;
    let vy = 0;
    let cool = 0;
    const rocks = [0, 1, 2, 3].map((n) => ({
      x: (n % 2) * canvas.width * 0.7 + 30,
      y: Math.floor(n / 2) * canvas.height * 0.4 + 20,
      vx: n % 2 ? -1.1 : 1.2,
      vy: 0.8,
    }));
    const shots: { x: number; y: number; vx: number; vy: number }[] = [];
    let frame = 0;
    const tick = () => {
      if (left.current) angle -= 0.08;
      if (right.current) angle += 0.08;
      if (go.current) {
        vx += Math.cos(angle) * 0.12;
        vy += Math.sin(angle) * 0.12;
      }
      vx *= 0.99;
      vy *= 0.99;
      x = (x + vx + canvas.width) % canvas.width;
      y = (y + vy + canvas.height) % canvas.height;
      cool -= 1;
      if (fire.current && cool <= 0) {
        shots.push({ x, y, vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5 });
        cool = 12;
      }
      shots.forEach((shot) => {
        shot.x += shot.vx;
        shot.y += shot.vy;
      });
      for (let i = rocks.length - 1; i >= 0; i -= 1) {
        const rock = rocks[i];
        rock.x = (rock.x + rock.vx + canvas.width) % canvas.width;
        rock.y = (rock.y + rock.vy + canvas.height) % canvas.height;
        if (Math.hypot(rock.x - x, rock.y - y) < 18) {
          end("lose");
          return;
        }
        if (shots.some((shot) => Math.hypot(shot.x - rock.x, shot.y - rock.y) < 16)) rocks.splice(i, 1);
      }
      if (!rocks.length) {
        end("win");
        return;
      }
      ctx.fillStyle = "#1b2430";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fffcf8";
      shots.forEach((shot) => ctx.fillRect(shot.x, shot.y, 3, 3));
      ctx.strokeStyle = "#f2cc8f";
      rocks.forEach((rock) => {
        ctx.beginPath();
        ctx.arc(rock.x, rock.y, 12, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, 7);
      ctx.lineTo(-8, -7);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <Wrap spec={spec}>
      <canvas ref={canvasRef} className="mini-canvas" style={{ background: "#1b2430" }} />
      <div className="pad">
        <button type="button" onPointerDown={() => { left.current = true; }} onPointerUp={() => { left.current = false; }}>↺</button>
        <button type="button" onPointerDown={() => { go.current = true; }} onPointerUp={() => { go.current = false; }}>Go</button>
        <button type="button" onPointerDown={() => { right.current = true; }} onPointerUp={() => { right.current = false; }}>↻</button>
        <button type="button" onPointerDown={() => { fire.current = true; }} onPointerUp={() => { fire.current = false; }}>Fire</button>
      </div>
    </Wrap>
  );
}

function MissileCommand({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clicks = useRef<{ x: number; y: number }[]>([]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    size(canvas);
    const missiles = [{ x: 40, y: 0, vx: 0.4 }, { x: canvas.width - 40, y: -40, vx: -0.3 }, { x: canvas.width / 2, y: -80, vx: 0.2 }];
    const bursts: { x: number; y: number; r: number }[] = [];
    let kills = 0;
    let leaks = 0;
    let frame = 0;
    const onPointer = (event: globalThis.PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      clicks.current.push({
        x: ((event.clientX - rect.left) / rect.width) * canvas.width,
        y: ((event.clientY - rect.top) / rect.height) * canvas.height,
      });
    };
    canvas.addEventListener("pointerdown", onPointer);
    const tick = () => {
      clicks.current.splice(0).forEach((click) => bursts.push({ ...click, r: 8 }));
      bursts.forEach((burst) => { burst.r += 1.4; });
      for (let i = bursts.length - 1; i >= 0; i -= 1) if (bursts[i].r > 46) bursts.splice(i, 1);
      missiles.forEach((missile) => {
        missile.x += missile.vx;
        missile.y += 1.15;
        if (bursts.some((burst) => Math.hypot(burst.x - missile.x, burst.y - missile.y) < burst.r)) {
          missile.y = -30 - Math.random() * 80;
          missile.x = 20 + Math.random() * (canvas.width - 40);
          kills += 1;
        } else if (missile.y > canvas.height - 16) {
          missile.y = -30 - Math.random() * 80;
          missile.x = 20 + Math.random() * (canvas.width - 40);
          leaks += 1;
        }
      });
      if (kills >= 6) {
        end("win");
        return;
      }
      if (leaks >= 3) {
        end("lose");
        return;
      }
      ctx.fillStyle = "#1b2430";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#1f6b45";
      ctx.fillRect(0, canvas.height - 16, canvas.width, 16);
      ctx.fillStyle = "#f2cc8f";
      missiles.forEach((missile) => ctx.fillRect(missile.x, missile.y, 4, 10));
      ctx.strokeStyle = "rgba(255,252,248,0.8)";
      bursts.forEach((burst) => {
        ctx.beginPath();
        ctx.arc(burst.x, burst.y, burst.r, 0, Math.PI * 2);
        ctx.stroke();
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", onPointer);
    };
  }, []);
  return (
    <Wrap spec={spec}>
      <canvas ref={canvasRef} className="mini-canvas" style={{ background: "#1b2430" }} />
      <p className="play-hint">Tap to burst the falling missiles. Stop six.</p>
    </Wrap>
  );
}

function Meter({ value, mark }: { value: number; mark?: [number, number] }) {
  return (
    <div className="meter">
      <i style={{ width: `${value}%` }} />
      {mark && <b style={{ left: `${mark[0]}%`, width: `${mark[1] - mark[0]}%` }} />}
    </div>
  );
}

function useSwing(speed = 1.6) {
  const [value, setValue] = useState(8);
  const dir = useRef(1);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setValue((current) => {
        let next = current + dir.current * speed;
        if (next > 100 || next < 0) {
          dir.current *= -1;
          next = Math.max(0, Math.min(100, next));
        }
        return next;
      });
    }, 30);
    return () => window.clearInterval(timer);
  }, [speed]);
  return value;
}

function Bowling({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const power = useSwing(1.8);
  const [left, setLeft] = useState(2);
  function bowl() {
    const pins = Math.max(0, 10 - Math.round(Math.abs(power - 64) / 4));
    if (pins >= 7) end("win");
    else if (left <= 1) end("lose");
    else setLeft(left - 1);
  }
  return (
    <Wrap spec={spec}>
      <Meter value={power} mark={[56, 72]} />
      <button type="button" className="again" onClick={bowl}>Bowl</button>
      <p className="play-hint">Release in the band for seven pins. {left} throws left.</p>
    </Wrap>
  );
}

function Darts({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [throws, setThrows] = useState(0);
  const [score, setScore] = useState(0);
  const [marks, setMarks] = useState<{ x: number; y: number }[]>([]);
  function toss(event: Press<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const dist = Math.hypot(x, y) / (rect.width / 2);
    const points = dist < 0.12 ? 50 : dist < 0.28 ? 25 : dist < 0.5 ? 15 : dist < 0.78 ? 5 : 0;
    const total = score + points;
    const used = throws + 1;
    setMarks([...marks, { x: event.clientX - rect.left, y: event.clientY - rect.top }]);
    setScore(total);
    setThrows(used);
    if (total >= 60) end("win");
    else if (used >= 3) end("lose");
  }
  return (
    <Wrap spec={spec}>
      <button type="button" className="dart-board" onPointerDown={toss}>
        {marks.map((mark, index) => <i key={index} style={{ left: mark.x, top: mark.y }} />)}
      </button>
      <p className="play-hint">Three darts. Reach 60. Score {score}.</p>
    </Wrap>
  );
}

function MiniGolf({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const power = useSwing(2);
  const [strokes, setStrokes] = useState(0);
  const [ball, setBall] = useState(8);
  function putt() {
    const next = Math.min(100, ball + power * 0.7);
    const used = strokes + 1;
    setStrokes(used);
    setBall(next);
    if (next >= 62 && next <= 74) end("win");
    else if (next > 92 || used >= 3) end("lose");
  }
  return (
    <Wrap spec={spec}>
      <div className="lane"><i style={{ left: `${ball}%` }} /><b style={{ left: "66%" }} /></div>
      <Meter value={power} />
      <button type="button" className="again" onClick={putt}>Putt</button>
      <p className="play-hint">Sink it in the cup within three strokes.</p>
    </Wrap>
  );
}

function Basketball({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const aim = useSwing(2.2);
  const [made, setMade] = useState(0);
  const [miss, setMiss] = useState(0);
  function shoot() {
    if (aim > 42 && aim < 58) {
      if (made + 1 >= 3) end("win");
      else setMade(made + 1);
    } else if (miss + 1 >= 3) end("lose");
    else setMiss(miss + 1);
  }
  return (
    <Wrap spec={spec}>
      <Meter value={aim} mark={[42, 58]} />
      <button type="button" className="again" onClick={shoot}>Shoot</button>
      <p className="play-hint">Release while the marker is in the band. {made}/3.</p>
    </Wrap>
  );
}

function Penalty({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [you, setYou] = useState(0);
  const [them, setThem] = useState(0);
  function kick(side: number) {
    const goalie = Math.floor(Math.random() * 3);
    const scored = side !== goalie;
    const ny = you + (scored ? 1 : 0);
    const nt = them + (scored ? 0 : 1);
    setYou(ny);
    setThem(nt);
    if (ny >= 3) end("win");
    if (nt >= 3) end("lose");
  }
  return (
    <Wrap spec={spec}>
      <p className="play-score">{you} - {them}</p>
      <div className="pad">
        {["Left", "Middle", "Right"].map((label, index) => (
          <button type="button" key={label} onClick={() => kick(index)}>{label}</button>
        ))}
      </div>
      <p className="play-hint">Pick a corner. First to three goals.</p>
    </Wrap>
  );
}

function Baseball({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [x, setX] = useState(0);
  const [hits, setHits] = useState(0);
  const [outs, setOuts] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setX((value) => (value + 3) % 100), 30);
    return () => window.clearInterval(timer);
  }, []);
  function swing() {
    if (x > 58 && x < 74) {
      if (hits + 1 >= 3) end("win");
      else setHits(hits + 1);
    } else if (outs + 1 >= 3) end("lose");
    else setOuts(outs + 1);
  }
  return (
    <Wrap spec={spec}>
      <div className="lane"><i style={{ left: `${x}%` }} /><b style={{ left: "64%", width: 28 }} /></div>
      <button type="button" className="again" onClick={swing}>Swing</button>
      <p className="play-hint">Swing as the ball crosses the plate. {hits} hits, {outs} outs.</p>
    </Wrap>
  );
}

function Fishing({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [bite, setBite] = useState(false);
  const [fish, setFish] = useState(0);
  const biteAt = useRef(0);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      biteAt.current = performance.now();
      setBite(true);
    }, 800 + Math.random() * 1400);
    return () => window.clearTimeout(timer);
  }, [fish]);
  return (
    <Wrap spec={spec}>
      <button
        type="button"
        className="again"
        style={{ margin: 16, minHeight: 100, background: bite ? "#f2cc8f" : "#3d85c6" }}
        onClick={() => {
          if (!bite) end("lose");
          else if (performance.now() - biteAt.current < 700) {
            if (fish + 1 >= 3) end("win");
            else {
              setFish(fish + 1);
              setBite(false);
            }
          } else end("lose");
        }}
      >
        {bite ? "Bite!" : "Wait"}
      </button>
      <p className="play-hint">Tap when it bites. {fish}/3 fish.</p>
    </Wrap>
  );
}

const TYPE_WORDS = ["napkin", "paddle", "sketch", "rally", "table"];

function TypingRace({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  return (
    <Wrap spec={spec}>
      <p className="play-score">{TYPE_WORDS[index]}</p>
      <input
        value={text}
        aria-label={spec.title}
        onChange={(event) => {
          const next = event.target.value.toLowerCase();
          if (next === TYPE_WORDS[index]) {
            if (index + 1 >= TYPE_WORDS.length) end("win");
            else {
              setIndex(index + 1);
              setText("");
            }
          } else setText(next);
        }}
      />
      <p className="play-hint">Type each word. {index + 1}/5</p>
    </Wrap>
  );
}

function MathQuiz({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [pair, setPair] = useState(() => [2, 3]);
  const [ok, setOk] = useState(0);
  const [lives, setLives] = useState(2);
  const choices = useMemo(() => {
    const answer = pair[0] + pair[1];
    return shuffle([answer, answer + 1, Math.max(0, answer - 2), answer + 3]).slice(0, 4);
  }, [pair]);
  function pick(n: number) {
    if (n === pair[0] + pair[1]) {
      if (ok + 1 >= 5) end("win");
      else {
        setOk(ok + 1);
        setPair([1 + Math.floor(Math.random() * 8), 1 + Math.floor(Math.random() * 8)]);
      }
    } else if (lives <= 1) end("lose");
    else setLives(lives - 1);
  }
  return (
    <Wrap spec={spec}>
      <p className="play-score">{pair[0]} + {pair[1]}</p>
      <div className="pad">{choices.map((n, index) => <button type="button" key={index} onClick={() => pick(n)}>{n}</button>)}</div>
      <p className="play-hint">{ok}/5 correct. {lives} lives.</p>
    </Wrap>
  );
}

const TRIVIA = [
  { q: "How many players stand at a ping pong table?", options: ["2", "4", "1"], a: 0 },
  { q: "Which piece moves any number of squares in chess?", options: ["Rook", "Knight", "Pawn"], a: 0 },
  { q: "A full deck has how many cards?", options: ["52", "48", "40"], a: 0 },
  { q: "Which sport uses a shuttlecock?", options: ["Badminton", "Golf", "Bowling"], a: 0 },
  { q: "How many squares are on a tic-tac-toe board?", options: ["9", "8", "16"], a: 0 },
];

function Trivia({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [index, setIndex] = useState(0);
  const [ok, setOk] = useState(0);
  function pick(choice: number) {
    const next = ok + (choice === TRIVIA[index].a ? 1 : 0);
    if (index + 1 >= TRIVIA.length) end(next >= 4 ? "win" : "lose");
    else {
      setOk(next);
      setIndex(index + 1);
    }
  }
  const card = TRIVIA[index];
  return (
    <Wrap spec={spec}>
      <p className="play-hint">{card.q}</p>
      <div className="pad" style={{ flexWrap: "wrap" }}>
        {card.options.map((option, choice) => (
          <button type="button" key={option} onClick={() => pick(choice)}>{option}</button>
        ))}
      </div>
    </Wrap>
  );
}

function NumberMemory({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [code, setCode] = useState("482");
  const [phase, setPhase] = useState<"show" | "guess">("show");
  const [text, setText] = useState("");
  useEffect(() => {
    if (phase !== "show") return;
    const timer = window.setTimeout(() => setPhase("guess"), 900);
    return () => window.clearTimeout(timer);
  }, [phase, code]);
  return (
    <Wrap spec={spec}>
      <p className="play-score">{phase === "show" ? code : "•".repeat(code.length)}</p>
      {phase === "guess" && (
        <input
          value={text}
          aria-label={spec.title}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            if (next.length < code.length) return;
            if (next === code) {
              if (code.length >= 5) end("win");
              else {
                setCode(`${code}${1 + Math.floor(Math.random() * 9)}`);
                setText("");
                setPhase("show");
              }
            } else end("lose");
          }}
        />
      )}
      <p className="play-hint">Remember the digits. Reach five.</p>
    </Wrap>
  );
}

function SpotTheOdd({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [round, setRound] = useState(0);
  const odd = useMemo(() => Math.floor(Math.random() * 16), [round]);
  return (
    <Wrap spec={spec}>
      <div className="mini-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {Array.from({ length: 16 }, (_, index) => (
          <button
            type="button"
            key={`${round}-${index}`}
            style={{ background: index === odd ? "#e07a5f" : "#b5523a", minHeight: 48 }}
            onClick={() => {
              if (index !== odd) end("lose");
              else if (round + 1 >= 5) end("win");
              else setRound(round + 1);
            }}
          />
        ))}
      </div>
      <p className="play-hint">Tap the tile that does not match. {round}/5</p>
    </Wrap>
  );
}

const PIPES = ["I", "L", ".", ".", "I", ".", ".", "L", "I"];

function openings(kind: string, rot: number) {
  const map: Record<string, string[]> = {
    I: ["EW", "NS"],
    L: ["ES", "SW", "WN", "NE"],
  };
  const options = map[kind];
  if (!options) return new Set<string>();
  return new Set(options[rot % options.length].split(""));
}

function PipeConnect({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [rots, setRots] = useState([1, 2, 0, 0, 2, 0, 0, 0, 1]);
  function linked(next: number[]) {
    const open = (index: number) => openings(PIPES[index], next[index]);
    const seen = new Set<number>();
    const stack = [0];
    if (!open(0).has("W")) return false;
    while (stack.length) {
      const index = stack.pop() as number;
      if (seen.has(index)) continue;
      seen.add(index);
      const doors = open(index);
      const r = Math.floor(index / 3);
      const c = index % 3;
      const step: [string, number, number, string][] = [["N", r - 1, c, "S"], ["E", r, c + 1, "W"], ["S", r + 1, c, "N"], ["W", r, c - 1, "E"]];
      step.forEach(([dir, rr, cc, back]) => {
        if (!doors.has(dir) || rr < 0 || cc < 0 || rr > 2 || cc > 2) return;
        const j = rr * 3 + cc;
        if (open(j).has(back)) stack.push(j);
      });
    }
    return seen.has(8) && open(8).has("E");
  }
  function turn(index: number) {
    if (PIPES[index] === ".") return;
    const next = rots.map((rot, i) => (i === index ? (rot + 1) % 4 : rot));
    setRots(next);
    if (linked(next)) end("win");
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid">
        {PIPES.map((kind, index) => (
          <button type="button" key={index} onClick={() => turn(index)}>{kind === "." ? "" : kind + rots[index]}</button>
        ))}
      </div>
      <p className="play-hint">Rotate pipes until the left side joins the right.</p>
    </Wrap>
  );
}

function FloodIt({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [board, setBoard] = useState(() => Array.from({ length: 25 }, () => Math.floor(Math.random() * 4)));
  const [left, setLeft] = useState(12);
  const colors = ["#b5523a", "#f2cc8f", "#1f6b45", "#3d85c6"];
  function pour(color: number) {
    const from = board[0];
    if (from === color) return;
    const next = board.slice();
    const stack = [0];
    const seen = new Set<number>();
    while (stack.length) {
      const index = stack.pop() as number;
      if (seen.has(index) || next[index] !== from) continue;
      seen.add(index);
      next[index] = color;
      const r = Math.floor(index / 5);
      const c = index % 5;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        const rr = r + dr;
        const cc = c + dc;
        if (rr >= 0 && rr < 5 && cc >= 0 && cc < 5) stack.push(rr * 5 + cc);
      });
    }
    const moves = left - 1;
    setBoard(next);
    setLeft(moves);
    if (next.every((cell) => cell === next[0])) end("win");
    else if (moves <= 0) end("lose");
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {board.map((cell, index) => <button type="button" key={index} style={{ background: colors[cell], minHeight: 36 }} />)}
      </div>
      <div className="pad">
        {colors.map((color, index) => <button type="button" key={color} style={{ background: color }} onClick={() => pour(index)} />)}
      </div>
      <p className="play-hint">Flood from the corner. {left} moves.</p>
    </Wrap>
  );
}

const PAC_MAP = ["#######", "#.....#", "#.###.#", "#.#...#", "#.....#", "#######"];

function Pacman({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [player, setPlayer] = useState({ x: 1, y: 1 });
  const [ghost, setGhost] = useState({ x: 5, y: 3 });
  const [dots, setDots] = useState(() => {
    const cells = new Set<string>();
    PAC_MAP.forEach((row, y) => [...row].forEach((cell, x) => { if (cell === ".") cells.add(`${x},${y}`); }));
    cells.delete("1,1");
    return cells;
  });
  function walk(dx: number, dy: number) {
    const x = player.x + dx;
    const y = player.y + dy;
    if (PAC_MAP[y]?.[x] !== ".") return;
    const next = new Set(dots);
    next.delete(`${x},${y}`);
    const gx = ghost.x + Math.sign(x - ghost.x);
    const gy = ghost.y + Math.sign(y - ghost.y);
    const gok = PAC_MAP[gy]?.[gx] === ".";
    const ng = gok ? { x: gx, y: gy } : ghost;
    setPlayer({ x, y });
    setGhost(ng);
    setDots(next);
    if (ng.x === x && ng.y === y) end("lose");
    else if (!next.size) end("win");
  }
  return (
    <Wrap spec={spec}>
      <div className="maze-board" style={{ gridTemplateRows: `repeat(${PAC_MAP.length}, 1fr)` }}>
        {PAC_MAP.map((row, y) => (
          <div className="maze-row" key={y} style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}>
            {[...row].map((cell, x) => (
              <span key={x} className="maze-cell" style={{ background: player.x === x && player.y === y ? "#f2cc8f" : ghost.x === x && ghost.y === y ? "#b5523a" : cell === "#" ? "#241c16" : dots.has(`${x},${y}`) ? "#fff" : "transparent", borderRadius: 4 }} />
            ))}
          </div>
        ))}
      </div>
      <div className="pad">
        <button type="button" onClick={() => walk(0, -1)}>↑</button>
        <button type="button" onClick={() => walk(-1, 0)}>←</button>
        <button type="button" onClick={() => walk(0, 1)}>↓</button>
        <button type="button" onClick={() => walk(1, 0)}>→</button>
      </div>
    </Wrap>
  );
}

function PlatformJump({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const held = useRef({ left: false, right: false, jump: false });
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    size(canvas);
    let x = 30;
    let y = 150;
    let vy = 0;
    const plats = [
      { x: 0, y: 190, w: 120 },
      { x: 150, y: 145, w: 90 },
      { x: 30, y: 95, w: 80 },
      { x: 160, y: 48, w: 120 },
    ];
    let frame = 0;
    const tick = () => {
      if (held.current.left) x -= 2.4;
      if (held.current.right) x += 2.4;
      vy += 0.35;
      y += vy;
      let grounded = false;
      plats.forEach((plat) => {
        if (vy >= 0 && x + 12 > plat.x && x < plat.x + plat.w && y + 16 > plat.y && y + 16 < plat.y + 12) {
          y = plat.y - 16;
          vy = 0;
          grounded = true;
        }
      });
      if (held.current.jump && grounded) vy = -7.2;
      if (x > 175 && y < 50) {
        end("win");
        return;
      }
      if (y > canvas.height) {
        end("lose");
        return;
      }
      ctx.fillStyle = "#d7ecf5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#1f6b45";
      plats.forEach((plat) => ctx.fillRect(plat.x, plat.y, plat.w, 8));
      ctx.fillStyle = "#b5523a";
      ctx.fillRect(200, 28, 12, 18);
      ctx.fillStyle = "#241c16";
      ctx.fillRect(x, y, 14, 16);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <Wrap spec={spec}>
      <canvas ref={canvasRef} className="mini-canvas" />
      <div className="pad">
        <button type="button" onPointerDown={() => { held.current.left = true; }} onPointerUp={() => { held.current.left = false; }}>←</button>
        <button type="button" onPointerDown={() => { held.current.jump = true; }} onPointerUp={() => { held.current.jump = false; }}>Jump</button>
        <button type="button" onPointerDown={() => { held.current.right = true; }} onPointerUp={() => { held.current.right = false; }}>→</button>
      </div>
      <p className="play-hint">Reach the flag. Falling off loses.</p>
    </Wrap>
  );
}

function DoodleJump({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const target = useRef(120);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    size(canvas);
    let x = canvas.width / 2;
    let y = canvas.height - 40;
    let vy = -8;
    let climbed = 0;
    const plats = Array.from({ length: 8 }, (_, index) => ({
      x: 20 + ((index * 47) % (canvas.width - 70)),
      y: canvas.height - index * 32,
    }));
    const move = (event: globalThis.PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      target.current = ((event.clientX - rect.left) / rect.width) * canvas.width;
    };
    canvas.addEventListener("pointerdown", move);
    canvas.addEventListener("pointermove", move);
    let frame = 0;
    const tick = () => {
      x += Math.max(-5, Math.min(5, (target.current - x) * 0.2));
      vy += 0.25;
      y += vy;
      plats.forEach((plat) => {
        if (vy > 0 && x > plat.x - 10 && x < plat.x + 54 && y > plat.y - 8 && y < plat.y + 8) vy = -8.2;
      });
      if (y < canvas.height * 0.4) {
        const shift = canvas.height * 0.4 - y;
        y += shift;
        climbed += shift;
        plats.forEach((plat) => { plat.y += shift; });
      }
      plats.forEach((plat) => {
        if (plat.y > canvas.height) {
          plat.y = 8;
          plat.x = 10 + Math.random() * (canvas.width - 70);
        }
      });
      if (climbed > 900) {
        end("win");
        return;
      }
      if (y > canvas.height + 20) {
        end("lose");
        return;
      }
      ctx.fillStyle = "#d7ecf5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#1f6b45";
      plats.forEach((plat) => ctx.fillRect(plat.x, plat.y, 48, 8));
      ctx.fillStyle = "#241c16";
      ctx.fillRect(x - 8, y - 12, 16, 16);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", move);
      canvas.removeEventListener("pointermove", move);
    };
  }, []);
  return (
    <Wrap spec={spec}>
      <canvas ref={canvasRef} className="mini-canvas" />
      <p className="play-hint">Drag sideways. Bounce upward and do not fall.</p>
    </Wrap>
  );
}

function Bomber({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [grid, setGrid] = useState(["@#.#.", "..#..", "#...#", ".#.#.", "..#.."]);
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const [fuse, setFuse] = useState<number | null>(null);
  function find(rows: string[], who: string) {
    for (let y = 0; y < rows.length; y += 1) {
      const x = rows[y].indexOf(who);
      if (x >= 0) return { x, y };
    }
    return null;
  }
  function move(dx: number, dy: number) {
    const rows = grid.map((row) => row.split(""));
    const at = find(grid, "@");
    if (!at) return;
    const x = at.x + dx;
    const y = at.y + dy;
    if (rows[y]?.[x] !== ".") return;
    rows[at.y][at.x] = ".";
    rows[y][x] = "@";
    setGrid(rows.map((row) => row.join("")));
  }
  function blast() {
    const at = find(gridRef.current, "@");
    if (!at || fuse !== null) return;
    setFuse(2);
    window.setTimeout(() => {
      const rows = gridRef.current.map((row) => row.split(""));
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const y = at.y + dy;
        const x = at.x + dx;
        if (rows[y]?.[x] === "#" || rows[y]?.[x] === "@") rows[y][x] = ".";
      });
      const next = rows.map((row) => row.join(""));
      setGrid(next);
      setFuse(null);
      if (!next.some((row) => row.includes("@"))) end("lose");
      else if (!next.some((row) => row.includes("#"))) end("win");
    }, 450);
  }
  return (
    <Wrap spec={spec}>
      <pre className="play-hint" style={{ letterSpacing: 6 }}>{grid.join("\n")}</pre>
      <div className="pad">
        <button type="button" onClick={() => move(0, -1)}>↑</button>
        <button type="button" onClick={() => move(-1, 0)}>←</button>
        <button type="button" onClick={() => move(0, 1)}>↓</button>
        <button type="button" onClick={() => move(1, 0)}>→</button>
        <button type="button" onClick={blast}>{fuse === null ? "Bomb" : fuse}</button>
      </div>
      <p className="play-hint">Clear every #. Step off your own blast.</p>
    </Wrap>
  );
}

function TankDuel({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [angle, setAngle] = useState(40);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [enemy, setEnemy] = useState(70);
  function fire() {
    const land = angle;
    const hit = Math.abs(land - enemy) < 8;
    if (hit) {
      if (hits + 1 >= 3) end("win");
      else {
        setHits(hits + 1);
        setEnemy(20 + Math.floor(Math.random() * 70));
      }
    } else if (misses + 1 >= 3) end("lose");
    else setMisses(misses + 1);
  }
  return (
    <Wrap spec={spec}>
      <div className="lane"><b style={{ left: `${enemy}%` }} /></div>
      <p className="play-hint">Angle {angle}. Hits {hits}/3.</p>
      <div className="pad">
        <button type="button" onClick={() => setAngle(Math.max(5, angle - 5))}>-</button>
        <button type="button" onClick={fire}>Fire</button>
        <button type="button" onClick={() => setAngle(Math.min(95, angle + 5))}>+</button>
      </div>
    </Wrap>
  );
}

function Centipede({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dir = useRef(0);
  const shoot = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    size(canvas);
    const body = Array.from({ length: 8 }, (_, index) => ({ x: 20 + index * 16, y: 20 }));
    let px = canvas.width / 2;
    let vx = 2;
    const bullets: { x: number; y: number }[] = [];
    let cool = 0;
    let frame = 0;
    const tick = () => {
      px = Math.max(10, Math.min(canvas.width - 10, px + dir.current * 3));
      body.forEach((part, index) => {
        part.x += vx;
        if (index === 0 && (part.x < 10 || part.x > canvas.width - 10)) {
          vx *= -1;
          body.forEach((seg) => { seg.y += 18; });
        }
      });
      cool -= 1;
      if (shoot.current && cool <= 0) {
        bullets.push({ x: px, y: canvas.height - 24 });
        cool = 14;
      }
      bullets.forEach((bullet) => { bullet.y -= 6; });
      for (let i = body.length - 1; i >= 0; i -= 1) {
        if (bullets.some((bullet) => Math.hypot(bullet.x - body[i].x, bullet.y - body[i].y) < 12)) {
          body.splice(i, 1);
        }
      }
      if (!body.length) {
        end("win");
        return;
      }
      if (body.some((part) => part.y > canvas.height - 36)) {
        end("lose");
        return;
      }
      ctx.fillStyle = "#102018";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#7dba6a";
      body.forEach((part) => ctx.fillRect(part.x - 6, part.y, 12, 12));
      ctx.fillStyle = "#fffcf8";
      bullets.forEach((bullet) => ctx.fillRect(bullet.x, bullet.y, 3, 8));
      ctx.fillStyle = "#f2cc8f";
      ctx.fillRect(px - 10, canvas.height - 20, 20, 8);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <Wrap spec={spec}>
      <canvas ref={canvasRef} className="mini-canvas" style={{ background: "#102018" }} />
      <div className="pad">
        <button type="button" onPointerDown={() => { dir.current = -1; }} onPointerUp={() => { dir.current = 0; }}>←</button>
        <button type="button" onPointerDown={() => { shoot.current = true; }} onPointerUp={() => { shoot.current = false; }}>Shoot</button>
        <button type="button" onPointerDown={() => { dir.current = 1; }} onPointerUp={() => { dir.current = 0; }}>→</button>
      </div>
    </Wrap>
  );
}

function Checkers({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [board, setBoard] = useState<number[]>(() => {
    const cells = Array(36).fill(0);
    [1, 3, 5, 6, 8, 10].forEach((i) => { cells[i] = 2; });
    [25, 27, 29, 30, 32, 34].forEach((i) => { cells[i] = 1; });
    return cells;
  });
  const [sel, setSel] = useState<number | null>(null);
  function legal(cells: number[], from: number, who: number) {
    const dir = who === 1 ? -6 : 6;
    const out: { to: number; jump: boolean }[] = [];
    [-1, 1].forEach((dc) => {
      const to = from + dir + dc;
      if (to < 0 || to >= 36) return;
      if (Math.abs((to % 6) - (from % 6)) !== 1) return;
      if (!cells[to]) out.push({ to, jump: false });
      const land = to + dir + dc;
      if (cells[to] && cells[to] !== who && land >= 0 && land < 36 && !cells[land] && Math.abs((land % 6) - (to % 6)) === 1) {
        out.push({ to: land, jump: true });
      }
    });
    return out;
  }
  function apply(cells: number[], from: number, to: number) {
    const next = cells.slice();
    next[to] = next[from];
    next[from] = 0;
    if (Math.abs(to - from) > 7) next[(from + to) / 2] = 0;
    return next;
  }
  function click(index: number) {
    if (sel === null) {
      if (board[index] === 1) setSel(index);
      return;
    }
    const choice = legal(board, sel, 1).find((move) => move.to === index);
    if (!choice) {
      setSel(board[index] === 1 ? index : null);
      return;
    }
    let next = apply(board, sel, index);
    setSel(null);
    if (next.filter((cell) => cell === 2).length <= 4) {
      setBoard(next);
      end("win");
      return;
    }
    const aiFrom = next.flatMap((cell, i) => (cell === 2 ? [i] : []));
    const aiMoves = aiFrom.flatMap((from) => legal(next, from, 2).map((move) => ({ from, ...move })));
    const jump = aiMoves.find((move) => move.jump) ?? aiMoves[Math.floor(Math.random() * aiMoves.length)];
    if (!jump) {
      setBoard(next);
      end("win");
      return;
    }
    next = apply(next, jump.from, jump.to);
    setBoard(next);
    if (next.filter((cell) => cell === 1).length <= 4) end("lose");
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
        {board.map((cell, index) => (
          <button type="button" key={index} onClick={() => click(index)} style={{ background: (Math.floor(index / 6) + index) % 2 ? "#c4a574" : "#f3efe6", outline: sel === index ? "3px solid #241c16" : "none", minHeight: 36 }}>
            {cell === 1 ? "●" : cell === 2 ? "○" : ""}
          </button>
        ))}
      </div>
      <p className="play-hint">You are black and move up. Capture until two remain.</p>
    </Wrap>
  );
}

export const PACK_C: Record<string, Player> = {
  piano_tiles: PianoTiles,
  stack_tower: StackTower,
  knife_hit: KnifeHit,
  lunar_lander: LunarLander,
  asteroids: Asteroids,
  missile_command: MissileCommand,
  bowling: Bowling,
  darts: Darts,
  mini_golf: MiniGolf,
  basketball: Basketball,
  penalty: Penalty,
  baseball: Baseball,
  fishing: Fishing,
  typing_race: TypingRace,
  math_quiz: MathQuiz,
  trivia: Trivia,
  number_memory: NumberMemory,
  spot_the_odd: SpotTheOdd,
  pipe_connect: PipeConnect,
  flood_it: FloodIt,
  pacman: Pacman,
  platform_jump: PlatformJump,
  doodle_jump: DoodleJump,
  bomber: Bomber,
  tank_duel: TankDuel,
  centipede: Centipede,
  checkers: Checkers,
};

function size(canvas: HTMLCanvasElement) {
  canvas.width = canvas.clientWidth || 320;
  canvas.height = canvas.clientHeight || 240;
}

function shuffle<T>(items: T[]) {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}
