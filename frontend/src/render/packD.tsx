import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { GameDef } from "./catalog";
import { useEnd } from "./end";

type Props = { spec: GameDef; onFinish: (outcome: "win" | "lose") => void };
type Player = (props: Props) => ReactElement;

function Wrap({ spec, children }: { spec: GameDef; children: React.ReactNode }) {
  return <div className="mini-wrap" aria-label={spec.title}>{children}</div>;
}

function GolfSolitaire({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [waste, setWaste] = useState(1);
  const [row, setRow] = useState([3, 5, 2, 6, 4, 7]);
  function play(index: number) {
    const card = row[index];
    if (Math.abs(card - waste) !== 1) return;
    const next = row.filter((_, i) => i !== index);
    setWaste(card);
    setRow(next);
    if (!next.length) end("win");
  }
  return (
    <Wrap spec={spec}>
      <p className="play-score">Waste {waste}</p>
      <div className="pad">
        {row.map((card, index) => <button type="button" key={card} onClick={() => play(index)}>{card}</button>)}
      </div>
      <p className="play-hint">Play a card one rank off the waste.</p>
    </Wrap>
  );
}

function War({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [you, setYou] = useState(0);
  const [them, setThem] = useState(0);
  const [shown, setShown] = useState("Draw a card");
  function play() {
    let a = 1 + Math.floor(Math.random() * 13);
    let b = 1 + Math.floor(Math.random() * 13);
    if (a === b) b = a === 13 ? 1 : a + 1;
    const ny = you + (a > b ? 1 : 0);
    const nt = them + (b > a ? 1 : 0);
    setYou(ny);
    setThem(nt);
    setShown(`${a} vs ${b}`);
    if (ny >= 5) end("win");
    if (nt >= 5) end("lose");
  }
  return (
    <Wrap spec={spec}>
      <p className="play-score">{you} - {them}</p>
      <p className="play-hint">{shown}</p>
      <button type="button" className="again" onClick={play}>Play</button>
    </Wrap>
  );
}

function PigDice({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [you, setYou] = useState(0);
  const [them, setThem] = useState(0);
  const [turn, setTurn] = useState(0);
  function roll() {
    const face = 1 + Math.floor(Math.random() * 6);
    if (face === 1) {
      setTurn(0);
      cpu(you);
    } else {
      const next = turn + face;
      setTurn(next);
      if (you + next >= 20) end("win");
    }
  }
  function bank() {
    const total = you + turn;
    setYou(total);
    setTurn(0);
    if (total >= 20) end("win");
    else cpu(total);
  }
  function cpu(playerTotal: number) {
    let banked = them;
    let running = 0;
    while (running < 12 && banked + running < 20) {
      const face = 1 + Math.floor(Math.random() * 6);
      if (face === 1) {
        running = 0;
        break;
      }
      running += face;
    }
    const total = banked + running;
    setThem(total);
    if (total >= 20 && playerTotal < 20) end("lose");
  }
  return (
    <Wrap spec={spec}>
      <p className="play-score">You {you + turn} · Them {them}</p>
      <div className="pad">
        <button type="button" onClick={roll}>Roll</button>
        <button type="button" onClick={bank}>Bank</button>
      </div>
      <p className="play-hint">A 1 wipes the turn. Race to 20.</p>
    </Wrap>
  );
}

function Yahtzee({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [dice, setDice] = useState([1, 2, 3]);
  const [held, setHeld] = useState([false, false, false]);
  const [left, setLeft] = useState(3);
  function roll() {
    const next = dice.map((face, index) => (held[index] ? face : 1 + Math.floor(Math.random() * 6)));
    setDice(next);
    const rolls = left - 1;
    setLeft(rolls);
    if (next.every((face) => face === next[0])) end("win");
    else if (rolls <= 0) end("lose");
  }
  return (
    <Wrap spec={spec}>
      <div className="pad">
        {dice.map((face, index) => (
          <button type="button" key={index} onClick={() => setHeld(held.map((on, i) => (i === index ? !on : on)))} style={{ outline: held[index] ? "3px solid #241c16" : "none" }}>{face}</button>
        ))}
      </div>
      <button type="button" className="again" onClick={roll}>Roll</button>
      <p className="play-hint">Hold dice, then roll. Three of a kind wins. {left} rolls.</p>
    </Wrap>
  );
}

function Stopwatch({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const start = useRef(0);
  const [on, setOn] = useState(false);
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!on) return;
    const timer = window.setInterval(() => setMs(performance.now() - start.current), 40);
    return () => window.clearInterval(timer);
  }, [on]);
  return (
    <Wrap spec={spec}>
      <p className="play-score">{(ms / 1000).toFixed(2)}</p>
      <button
        type="button"
        className="again"
        onClick={() => {
          if (!on) {
            start.current = performance.now();
            setOn(true);
          } else {
            const elapsed = performance.now() - start.current;
            setOn(false);
            end(elapsed >= 4800 && elapsed <= 5200 ? "win" : "lose");
          }
        }}
      >
        {on ? "Stop" : "Start"}
      </button>
      <p className="play-hint">Stop between 4.80 and 5.20 seconds.</p>
    </Wrap>
  );
}

function Balance({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const pos = useRef(50);
  const vel = useRef(0);
  const [x, setX] = useState(50);
  useEffect(() => {
    const started = performance.now();
    const timer = window.setInterval(() => {
      vel.current += (Math.random() - 0.5) * 0.8;
      vel.current *= 0.92;
      pos.current = Math.max(0, Math.min(100, pos.current + vel.current));
      setX(pos.current);
      if (pos.current < 6 || pos.current > 94) end("lose");
      else if (performance.now() - started > 4000) end("win");
    }, 40);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <Wrap spec={spec}>
      <div className="lane"><i style={{ left: `${x}%` }} /></div>
      <div className="pad">
        <button type="button" onClick={() => { vel.current -= 2.4; }}>L</button>
        <button type="button" onClick={() => { vel.current += 2.4; }}>R</button>
      </div>
      <p className="play-hint">Keep the marker off the edges for four seconds.</p>
    </Wrap>
  );
}

function Rhythm({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const hits = useRef(0);
  const misses = useRef(0);
  const armed = useRef(false);
  const used = useRef(true);
  const [flash, setFlash] = useState(false);
  const [score, setScore] = useState("0/8");
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (armed.current && !used.current) {
        misses.current += 1;
        if (misses.current >= 3) end("lose");
      }
      armed.current = true;
      used.current = false;
      setFlash(true);
      window.setTimeout(() => setFlash(false), 180);
    }, 700);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <Wrap spec={spec}>
      <button
        type="button"
        className="again"
        style={{ margin: 16, minHeight: 100, background: flash ? "#f2cc8f" : "#241c16", color: flash ? "#241c16" : "#fffcf8" }}
        onClick={() => {
          if (!armed.current || used.current) {
            misses.current += 1;
            if (misses.current >= 3) end("lose");
          } else {
            used.current = true;
            hits.current += 1;
            setScore(`${hits.current}/8`);
            if (hits.current >= 8) end("win");
          }
        }}
      >
        Tap
      </button>
      <p className="play-hint">Tap on the flash. {score}</p>
    </Wrap>
  );
}

function sow(board: number[], index: number, who: number) {
  const next = board.slice();
  let stones = next[index];
  if (!stones) return null;
  next[index] = 0;
  let cursor = index;
  while (stones > 0) {
    cursor = (cursor + 1) % 10;
    if (who === 1 && cursor === 9) continue;
    if (who === 2 && cursor === 4) continue;
    next[cursor] += 1;
    stones -= 1;
  }
  const store = who === 1 ? 4 : 9;
  const mine = who === 1 ? [0, 1, 2, 3] : [5, 6, 7, 8];
  if (cursor !== store && mine.includes(cursor) && next[cursor] === 1) {
    const opp = 8 - cursor;
    if (next[opp]) {
      next[store] += next[opp] + next[cursor];
      next[opp] = 0;
      next[cursor] = 0;
    }
  }
  return { next, extra: cursor === store };
}

function mancalaWinner(board: number[]) {
  const playerEmpty = [0, 1, 2, 3].every((index) => !board[index]);
  const aiEmpty = [5, 6, 7, 8].every((index) => !board[index]);
  if (!playerEmpty && !aiEmpty) return null;
  let yours = board[4];
  let theirs = board[9];
  [0, 1, 2, 3].forEach((index) => { yours += board[index]; });
  [5, 6, 7, 8].forEach((index) => { theirs += board[index]; });
  return yours >= theirs ? "win" : "lose";
}

function Mancala({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [pits, setPits] = useState([4, 4, 4, 4, 0, 4, 4, 4, 4, 0]);
  const [busy, setBusy] = useState(false);
  function ai(board: number[]) {
    const options = [5, 6, 7, 8].filter((index) => board[index]);
    if (!options.length) {
      const outcome = mancalaWinner(board);
      if (outcome) end(outcome);
      setBusy(false);
      return;
    }
    const extra = options.find((index) => sow(board, index, 2)?.extra);
    const choice = extra ?? options[Math.floor(Math.random() * options.length)];
    const played = sow(board, choice, 2);
    if (!played) return;
    setPits(played.next);
    const outcome = mancalaWinner(played.next);
    if (outcome) end(outcome);
    else if (played.extra) window.setTimeout(() => ai(played.next), 250);
    else setBusy(false);
  }
  function play(index: number) {
    if (busy || !pits[index]) return;
    const played = sow(pits, index, 1);
    if (!played) return;
    setPits(played.next);
    const outcome = mancalaWinner(played.next);
    if (outcome) end(outcome);
    else if (!played.extra) {
      setBusy(true);
      window.setTimeout(() => ai(played.next), 250);
    }
  }
  return (
    <Wrap spec={spec}>
      <div className="pad">{[8, 7, 6, 5].map((index) => <button type="button" key={index} disabled>{pits[index]}</button>)}</div>
      <p className="play-hint">Them {pits[9]} · You {pits[4]}</p>
      <div className="pad">{[0, 1, 2, 3].map((index) => <button type="button" key={index} onClick={() => play(index)}>{pits[index]}</button>)}</div>
      <p className="play-hint">Sow your pits. Most stones in your store wins.</p>
    </Wrap>
  );
}

const SUDOKU = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
const SUDOKU_GIVEN = [1, 0, 3, 0, 0, 4, 0, 2, 2, 0, 0, 3, 0, 3, 2, 0];

function Sudoku({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [board, setBoard] = useState(SUDOKU_GIVEN.slice());
  function cycle(index: number) {
    if (SUDOKU_GIVEN[index]) return;
    const next = board.slice();
    next[index] = (next[index] % 4) + 1;
    setBoard(next);
    if (next.every((n, i) => n === SUDOKU[i])) end("win");
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {board.map((n, index) => (
          <button type="button" key={index} onClick={() => cycle(index)} style={{ fontWeight: SUDOKU_GIVEN[index] ? 800 : 500 }}>{n || ""}</button>
        ))}
      </div>
      <p className="play-hint">Fill the blanks. Each row, column, and box uses 1–4.</p>
    </Wrap>
  );
}

const NONO = [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0];

function Nonogram({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [marks, setMarks] = useState(Array(25).fill(0));
  const [miss, setMiss] = useState(0);
  function paint(index: number) {
    if (marks[index]) return;
    if (!NONO[index]) {
      if (miss + 1 >= 4) end("lose");
      else setMiss(miss + 1);
      return;
    }
    const next = marks.slice();
    next[index] = 1;
    setMarks(next);
    if (NONO.every((cell, i) => cell === next[i])) end("win");
  }
  return (
    <Wrap spec={spec}>
      <p className="play-hint">Rows 1, 1, 5, 1, 1. Same down the columns.</p>
      <div className="mini-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {marks.map((cell, index) => (
          <button type="button" key={index} onClick={() => paint(index)} style={{ background: cell ? "#241c16" : "#f3efe6", minHeight: 36 }} />
        ))}
      </div>
      <p className="play-hint">Fill the plus. Misses {miss}/4.</p>
    </Wrap>
  );
}

const ANAGRAMS = ["NAPKIN", "SKETCH", "PAPER"];

function Anagram({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const scrambled = useMemo(() => scramble(ANAGRAMS[index]), [index]);
  return (
    <Wrap spec={spec}>
      <p className="play-score">{scrambled}</p>
      <input
        value={text}
        aria-label={spec.title}
        onChange={(event) => {
          const next = event.target.value.toUpperCase();
          setText(next);
          if (next === ANAGRAMS[index]) {
            if (index + 1 >= ANAGRAMS.length) end("win");
            else {
              setIndex(index + 1);
              setText("");
            }
          }
        }}
      />
      <p className="play-hint">Unscramble the word. {index + 1}/3</p>
    </Wrap>
  );
}

function CoinClicker({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [coins, setCoins] = useState(0);
  const [power, setPower] = useState(1);
  function tap() {
    const next = coins + power;
    setCoins(next);
    if (next >= 40) end("win");
  }
  return (
    <Wrap spec={spec}>
      <p className="play-score">{coins} coins</p>
      <div className="pad">
        <button type="button" onClick={tap}>Tap +{power}</button>
        <button type="button" onClick={() => { if (coins >= 15) { setCoins(coins - 15); setPower(power + 1); } }}>Upgrade 15</button>
      </div>
      <p className="play-hint">Reach 40 coins.</p>
    </Wrap>
  );
}

function LightCycle({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const steer = useRef({ dx: 1, dy: 0 });
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    size(canvas);
    const cols = 18;
    const rows = 18;
    const trail = new Set(["2,9", "15,9"]);
    let px = 2;
    let py = 9;
    let pdx = 1;
    let pdy = 0;
    let ax = 15;
    let ay = 9;
    let adx = -1;
    let ady = 0;
    let ticks = 0;
    const timer = window.setInterval(() => {
      const cell = cols ? canvas.width / cols : 10;
      if (!(steer.current.dx === -pdx && steer.current.dy === -pdy)) {
        pdx = steer.current.dx;
        pdy = steer.current.dy;
      }
      px += pdx;
      py += pdy;
      const hit = px < 0 || py < 0 || px >= cols || py >= rows || trail.has(`${px},${py}`);
      if (hit) {
        end("lose");
        window.clearInterval(timer);
        return;
      }
      trail.add(`${px},${py}`);
      const options = [[adx, ady], [ady, -adx], [-ady, adx]].map(([dx, dy]) => [ax + dx, ay + dy, dx, dy] as const);
      const open = options.find(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !trail.has(`${x},${y}`));
      if (!open) {
        end("win");
        window.clearInterval(timer);
        return;
      }
      ax = open[0];
      ay = open[1];
      adx = open[2];
      ady = open[3];
      trail.add(`${ax},${ay}`);
      ticks += 1;
      if (ticks > 70) {
        end("win");
        window.clearInterval(timer);
        return;
      }
      ctx.fillStyle = "#102018";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#7dba6a";
      trail.forEach((key) => {
        const [x, y] = key.split(",").map(Number);
        ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
      });
      ctx.fillStyle = "#f2cc8f";
      ctx.fillRect(px * cell, py * cell, cell - 1, cell - 1);
    }, 140);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <Wrap spec={spec}>
      <canvas ref={canvasRef} className="mini-canvas" style={{ background: "#102018" }} />
      <div className="pad">
        <button type="button" onClick={() => { steer.current = { dx: 0, dy: -1 }; }}>↑</button>
        <button type="button" onClick={() => { steer.current = { dx: -1, dy: 0 }; }}>←</button>
        <button type="button" onClick={() => { steer.current = { dx: 0, dy: 1 }; }}>↓</button>
        <button type="button" onClick={() => { steer.current = { dx: 1, dy: 0 }; }}>→</button>
      </div>
    </Wrap>
  );
}

function Billiards({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    size(canvas);
    const cue = { x: canvas.width * 0.32, y: canvas.height * 0.62, vx: 0, vy: 0 };
    const ball = { x: canvas.width * 0.58, y: canvas.height * 0.42, vx: 0, vy: 0 };
    const pocket = { x: canvas.width * 0.84, y: canvas.height * 0.2 };
    let frame = 0;
    const draw = () => {
      ctx.fillStyle = "#0e4d38";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#241c16";
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fffcf8";
      ctx.beginPath();
      ctx.arc(cue.x, cue.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f2cc8f";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 9, 0, Math.PI * 2);
      ctx.fill();
      if (drag.current) {
        ctx.strokeStyle = "#fffcf8";
        ctx.beginPath();
        ctx.moveTo(cue.x, cue.y);
        ctx.lineTo(drag.current.x, drag.current.y);
        ctx.stroke();
      }
    };
    const tick = () => {
      [cue, ball].forEach((body) => {
        body.x += body.vx;
        body.y += body.vy;
        body.vx *= 0.986;
        body.vy *= 0.986;
        if (body.x < 12 || body.x > canvas.width - 12) body.vx *= -1;
        if (body.y < 12 || body.y > canvas.height - 12) body.vy *= -1;
      });
      const dx = ball.x - cue.x;
      const dy = ball.y - cue.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < 18) {
        const nx = dx / dist;
        const ny = dy / dist;
        const rel = (cue.vx - ball.vx) * nx + (cue.vy - ball.vy) * ny;
        if (rel > 0) {
          cue.vx -= rel * nx;
          cue.vy -= rel * ny;
          ball.vx += rel * nx;
          ball.vy += rel * ny;
        }
      }
      draw();
      if (Math.hypot(ball.x - pocket.x, ball.y - pocket.y) < 16) {
        end("win");
        return;
      }
      if (Math.hypot(cue.x - pocket.x, cue.y - pocket.y) < 16) {
        end("lose");
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    const down = (event: PointerEvent) => { drag.current = localPoint(canvas, event); };
    const up = (event: PointerEvent) => {
      if (!drag.current) return;
      const at = localPoint(canvas, event);
      cue.vx = (cue.x - at.x) * 0.09;
      cue.vy = (cue.y - at.y) * 0.09;
      drag.current = null;
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup", up);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
    };
  }, []);
  return (
    <Wrap spec={spec}>
      <canvas ref={canvasRef} className="mini-canvas" style={{ background: "#0e4d38" }} />
      <p className="play-hint">Drag from the cue ball to shoot. Pocket the gold ball. Scratch loses.</p>
    </Wrap>
  );
}

function useSwing(speed: number) {
  const [value, setValue] = useState(10);
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

function Meter({ value, mark }: { value: number; mark?: [number, number] }) {
  return (
    <div className="meter">
      <i style={{ width: `${value}%` }} />
      {mark && <b style={{ left: `${mark[0]}%`, width: `${mark[1] - mark[0]}%` }} />}
    </div>
  );
}

function Curling({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const power = useSwing(1.5);
  const sweep = useRef(false);
  const [tries, setTries] = useState(3);
  function release() {
    const land = Math.min(100, power + (sweep.current ? 10 : 0));
    if (land >= 68 && land <= 84) end("win");
    else if (tries <= 1) end("lose");
    else setTries(tries - 1);
  }
  return (
    <Wrap spec={spec}>
      <Meter value={power} mark={[68, 84]} />
      <div className="pad">
        <button type="button" onPointerDown={() => { sweep.current = true; }} onPointerUp={() => { sweep.current = false; }}>Sweep</button>
        <button type="button" onClick={release}>Release</button>
      </div>
      <p className="play-hint">Land in the house. Sweep adds distance. {tries} stones.</p>
    </Wrap>
  );
}

function SkeeBall({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const power = useSwing(1.7);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(4);
  function roll() {
    const points = power > 92 ? 50 : power > 75 ? 40 : power > 55 ? 30 : power > 35 ? 10 : 0;
    const total = score + points;
    const rolls = left - 1;
    setScore(total);
    setLeft(rolls);
    if (total >= 100) end("win");
    else if (rolls <= 0) end("lose");
  }
  return (
    <Wrap spec={spec}>
      <Meter value={power} />
      <button type="button" className="again" onClick={roll}>Roll</button>
      <p className="play-hint">Higher in the meter, higher the ring. {score}/100.</p>
    </Wrap>
  );
}

function Cornhole({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const power = useSwing(1.6);
  const [aim, setAim] = useState(1);
  const [on, setOn] = useState(0);
  const [bags, setBags] = useState(4);
  function toss() {
    const hit = aim === 1 && power > 48 && power < 70;
    const next = on + (hit ? 1 : 0);
    const left = bags - 1;
    setOn(next);
    setBags(left);
    if (next >= 2) end("win");
    else if (left <= 0) end("lose");
  }
  return (
    <Wrap spec={spec}>
      <Meter value={power} mark={[48, 70]} />
      <div className="pad">
        {["Left", "Board", "Right"].map((label, index) => (
          <button type="button" key={label} onClick={() => setAim(index)} style={{ outline: aim === index ? "3px solid #241c16" : "none" }}>{label}</button>
        ))}
      </div>
      <button type="button" className="again" onClick={toss}>Toss</button>
      <p className="play-hint">Aim at the board and release in the band. {on}/2 bags on.</p>
    </Wrap>
  );
}

function Shuffleboard({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const power = useSwing(1.4);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(3);
  function slide() {
    const points = power > 80 ? 0 : power > 62 ? 30 : power > 45 ? 20 : power > 28 ? 10 : 0;
    const total = score + points;
    const rolls = left - 1;
    setScore(total);
    setLeft(rolls);
    if (total >= 30) end("win");
    else if (rolls <= 0) end("lose");
  }
  return (
    <Wrap spec={spec}>
      <Meter value={power} mark={[45, 80]} />
      <button type="button" className="again" onClick={slide}>Slide</button>
      <p className="play-hint">Stay on the table. Score 30. Now {score}.</p>
    </Wrap>
  );
}

function Archery({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const wind = useMemo(() => Math.floor(Math.random() * 5) - 2, []);
  const [aim, setAim] = useState(0);
  const [hits, setHits] = useState(0);
  const [arrows, setArrows] = useState(4);
  function loose() {
    const hit = aim + wind === 0;
    const next = hits + (hit ? 1 : 0);
    const left = arrows - 1;
    setHits(next);
    setArrows(left);
    if (next >= 3) end("win");
    else if (left <= 0) end("lose");
  }
  return (
    <Wrap spec={spec}>
      <p className="play-hint">Wind {wind > 0 ? `+${wind}` : wind}. Aim {aim}.</p>
      <div className="pad">
        <button type="button" onClick={() => setAim(aim - 1)}>-</button>
        <button type="button" onClick={loose}>Loose</button>
        <button type="button" onClick={() => setAim(aim + 1)}>+</button>
      </div>
      <p className="play-hint">Cancel the wind. {hits}/3 hits.</p>
    </Wrap>
  );
}

function Horseshoes({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const power = useSwing(1.5);
  const [left, setLeft] = useState(3);
  function toss() {
    if (Math.abs(power - 58) < 7) end("win");
    else if (left <= 1) end("lose");
    else setLeft(left - 1);
  }
  return (
    <Wrap spec={spec}>
      <Meter value={power} mark={[51, 65]} />
      <button type="button" className="again" onClick={toss}>Toss</button>
      <p className="play-hint">Ring the stake. {left} shoes.</p>
    </Wrap>
  );
}

function Pinball({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const left = useRef(false);
  const right = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    size(canvas);
    let x = canvas.width * 0.5;
    let y = 36;
    let vx = 1.4;
    let vy = 0;
    let score = 0;
    const bumps = [
      { x: canvas.width * 0.32, y: canvas.height * 0.38 },
      { x: canvas.width * 0.68, y: canvas.height * 0.46 },
      { x: canvas.width * 0.5, y: canvas.height * 0.28 },
    ];
    let frame = 0;
    const tick = () => {
      vy += 0.18;
      x += vx;
      y += vy;
      if (x < 12 || x > canvas.width - 12) vx *= -1;
      bumps.forEach((bump) => {
        if (Math.hypot(x - bump.x, y - bump.y) < 20) {
          vx = (x - bump.x) * 0.2;
          vy = -Math.abs(vy) - 1.4;
          score += 1;
        }
      });
      if (y > canvas.height - 26) {
        const onLeft = x < canvas.width / 2;
        if ((onLeft && left.current) || (!onLeft && right.current)) {
          vy = -8;
          vx += onLeft ? 1.6 : -1.6;
        }
      }
      if (score >= 6) {
        end("win");
        return;
      }
      if (y > canvas.height) {
        end("lose");
        return;
      }
      ctx.fillStyle = "#241c16";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#b5523a";
      bumps.forEach((bump) => {
        ctx.beginPath();
        ctx.arc(bump.x, bump.y, 12, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = left.current ? "#f2cc8f" : "#8a5a32";
      ctx.fillRect(8, canvas.height - 22, canvas.width * 0.38, 8);
      ctx.fillStyle = right.current ? "#f2cc8f" : "#8a5a32";
      ctx.fillRect(canvas.width * 0.62, canvas.height - 22, canvas.width * 0.34, 8);
      ctx.fillStyle = "#fffcf8";
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <Wrap spec={spec}>
      <canvas ref={canvasRef} className="mini-canvas" style={{ background: "#241c16" }} />
      <div className="pad">
        <button type="button" onPointerDown={() => { left.current = true; }} onPointerUp={() => { left.current = false; }}>Left</button>
        <button type="button" onPointerDown={() => { right.current = true; }} onPointerUp={() => { right.current = false; }}>Right</button>
      </div>
      <p className="play-hint">Keep the ball up. Six bumper hits win.</p>
    </Wrap>
  );
}

const RECIPE = ["flour", "eggs", "milk", "pan"];

function Recipe({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [step, setStep] = useState(0);
  const order = useMemo(() => shuffle(RECIPE), []);
  return (
    <Wrap spec={spec}>
      <p className="play-hint">Next: {RECIPE[step]}</p>
      <div className="pad" style={{ flexWrap: "wrap" }}>
        {order.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => {
              if (item !== RECIPE[step]) end("lose");
              else if (step + 1 >= RECIPE.length) end("win");
              else setStep(step + 1);
            }}
          >
            {item}
          </button>
        ))}
      </div>
    </Wrap>
  );
}

function PathMemory({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [seq, setSeq] = useState([4]);
  const [lit, setLit] = useState(-1);
  const [phase, setPhase] = useState<"show" | "play">("show");
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (phase !== "show") return;
    let step = 0;
    const timer = window.setInterval(() => {
      setLit(seq[step]);
      step += 1;
      if (step >= seq.length) {
        window.clearInterval(timer);
        window.setTimeout(() => {
          setLit(-1);
          setPhase("play");
          setAt(0);
        }, 280);
      }
    }, 420);
    return () => window.clearInterval(timer);
  }, [phase, seq]);
  function tap(index: number) {
    if (phase !== "play") return;
    if (index !== seq[at]) end("lose");
    else if (at + 1 === seq.length) {
      if (seq.length >= 5) end("win");
      else {
        setSeq([...seq, Math.floor(Math.random() * 9)]);
        setPhase("show");
      }
    } else setAt(at + 1);
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid">
        {Array.from({ length: 9 }, (_, index) => (
          <button type="button" key={index} onClick={() => tap(index)} style={{ background: lit === index ? "#f2cc8f" : "#f3efe6" }} />
        ))}
      </div>
      <p className="play-hint">Repeat the path. Length {seq.length}/5.</p>
    </Wrap>
  );
}

type Card = { c: string; n: number };

function Uno({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const deck = useMemo(() => {
    const cards: Card[] = [];
    ["R", "Y", "G", "B"].forEach((c) => {
      for (let n = 1; n <= 4; n += 1) cards.push({ c, n });
    });
    return shuffle(cards);
  }, []);
  const [you, setYou] = useState(() => deck.slice(0, 4));
  const [them, setThem] = useState(() => deck.slice(4, 8));
  const [pile, setPile] = useState<Card[]>(() => deck.slice(13));
  const [top, setTop] = useState(() => deck[12]);
  function draw(hand: Card[], stock: Card[]) {
    if (!stock.length) return { hand, stock };
    return { hand: [...hand, stock[0]], stock: stock.slice(1) };
  }
  function play(index: number) {
    const card = you[index];
    if (card.c !== top.c && card.n !== top.n) return;
    const mine = you.filter((_, i) => i !== index);
    if (!mine.length) {
      end("win");
      return;
    }
    let stock = pile.slice();
    let opp = them.slice();
    const choice = opp.findIndex((item) => item.c === card.c || item.n === card.n);
    if (choice >= 0) {
      setTop(opp[choice]);
      opp = opp.filter((_, i) => i !== choice);
      if (!opp.length) {
        setYou(mine);
        setThem(opp);
        end("lose");
        return;
      }
    } else {
      const drawn = draw(opp, stock);
      opp = drawn.hand;
      stock = drawn.stock;
      setTop(card);
    }
    setYou(mine);
    setThem(opp);
    setPile(stock);
  }
  return (
    <Wrap spec={spec}>
      <p className="play-hint">Table {top.c}{top.n}. Opponent has {them.length}.</p>
      <div className="pad" style={{ flexWrap: "wrap" }}>
        {you.map((card, index) => <button type="button" key={`${card.c}${card.n}${index}`} onClick={() => play(index)}>{card.c}{card.n}</button>)}
        <button type="button" onClick={() => {
          if (!pile.length) {
            if (!you.some((card) => card.c === top.c || card.n === top.n)) end("lose");
            return;
          }
          const drawn = draw(you, pile);
          setYou(drawn.hand);
          setPile(drawn.stock);
        }}>Draw</button>
      </div>
    </Wrap>
  );
}

function GoFish({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [you, setYou] = useState(["A", "K", "Q", "J"]);
  const [opp, setOpp] = useState(["A", "5", "K", "6"]);
  const [books, setBooks] = useState(0);
  function ask(rank: string) {
    let mine = you.concat(opp.filter((card) => card === rank));
    let theirs = opp.filter((card) => card !== rank);
    let got = books;
    if (mine.filter((card) => card === rank).length >= 2) {
      mine = mine.filter((card) => card !== rank);
      got += 1;
    }
    if (got >= 2) {
      end("win");
      return;
    }
    const reply = theirs[0];
    if (reply) {
      const given = mine.filter((card) => card === reply);
      mine = mine.filter((card) => card !== reply);
      theirs = theirs.concat(given);
      if (theirs.filter((card) => card === reply).length >= 2) {
        setYou(mine);
        setOpp(theirs.filter((card) => card !== reply));
        setBooks(got);
        end("lose");
        return;
      }
    }
    setYou(mine);
    setOpp(theirs);
    setBooks(got);
    if (!mine.length) end("lose");
  }
  const ranks = [...new Set(you)];
  return (
    <Wrap spec={spec}>
      <p className="play-hint">Your cards {you.join(" ") || "none"}. Pairs {books}/2.</p>
      <div className="pad">
        {ranks.map((rank) => <button type="button" key={rank} onClick={() => ask(rank)}>Ask {rank}</button>)}
      </div>
    </Wrap>
  );
}

function Snap({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const deck = useMemo(() => shuffle([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]), []);
  const [pile, setPile] = useState<number[]>([]);
  const [live, setLive] = useState(false);
  const [got, setGot] = useState(0);
  useEffect(() => {
    if (pile.length >= deck.length) {
      if (got < 3) end("lose");
      return;
    }
    const timer = window.setTimeout(() => {
      const card = deck[pile.length];
      const match = pile.length > 0 && pile[pile.length - 1] === card;
      setPile([...pile, card]);
      setLive(match);
    }, 750);
    return () => window.clearTimeout(timer);
  }, [pile, deck, got]);
  return (
    <Wrap spec={spec}>
      <p className="play-score">{pile.length ? pile[pile.length - 1] : "…"} {live ? "SNAP" : ""}</p>
      <button
        type="button"
        className="again"
        onClick={() => {
          if (!live) end("lose");
          else if (got + 1 >= 3) end("win");
          else {
            setGot(got + 1);
            setLive(false);
          }
        }}
      >
        Snap
      </button>
      <p className="play-hint">Tap only when the new card matches. {got}/3</p>
    </Wrap>
  );
}

const BOGGLE = ["N", "A", "P", "I", "N", "K", "R", "A", "E"];
const BOGGLE_WORDS = ["NAP", "INK", "RANK"];

function Boggle({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [path, setPath] = useState<number[]>([]);
  const [found, setFound] = useState<string[]>([]);
  function tap(index: number) {
    if (path.includes(index)) return;
    if (path.length) {
      const prev = path[path.length - 1];
      const dr = Math.abs(Math.floor(index / 3) - Math.floor(prev / 3));
      const dc = Math.abs((index % 3) - (prev % 3));
      if (dr > 1 || dc > 1) return;
    }
    setPath([...path, index]);
  }
  function submit() {
    const word = path.map((index) => BOGGLE[index]).join("");
    if (!BOGGLE_WORDS.includes(word) || found.includes(word)) {
      setPath([]);
      return;
    }
    const next = [...found, word];
    setFound(next);
    setPath([]);
    if (next.length >= BOGGLE_WORDS.length) end("win");
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid">
        {BOGGLE.map((letter, index) => (
          <button type="button" key={index} onClick={() => tap(index)} style={{ outline: path.includes(index) ? "3px solid #241c16" : "none" }}>{letter}</button>
        ))}
      </div>
      <div className="pad">
        <button type="button" onClick={submit}>Enter</button>
        <button type="button" onClick={() => setPath([])}>Clear</button>
      </div>
      <p className="play-hint">Find {BOGGLE_WORDS.join(", ")}. Got {found.join(" ") || "none"}.</p>
    </Wrap>
  );
}

function TowerDefense({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const towers = useRef([false, false, false]);
  const [placed, setPlaced] = useState([false, false, false]);
  const [label, setLabel] = useState("Place a tower, then hold the lane.");
  useEffect(() => {
    const creeps: { x: number; hp: number }[] = [];
    let spawned = 0;
    let kills = 0;
    let leaks = 0;
    let tick = 0;
    const timer = window.setInterval(() => {
      tick += 1;
      if (tick % 8 === 0 && spawned < 8) {
        creeps.push({ x: 0, hp: 8 });
        spawned += 1;
      }
      const guns = towers.current.filter(Boolean).length;
      if (creeps[0] && guns) creeps[0].hp -= guns;
      creeps.forEach((creep) => { creep.x += 6; });
      for (let i = creeps.length - 1; i >= 0; i -= 1) {
        if (creeps[i].hp <= 0) {
          creeps.splice(i, 1);
          kills += 1;
        } else if (creeps[i].x >= 100) {
          creeps.splice(i, 1);
          leaks += 1;
        }
      }
      setLabel(`${kills} stopped, ${leaks} leaked`);
      if (kills >= 6) {
        end("win");
        window.clearInterval(timer);
      } else if (leaks >= 3) {
        end("lose");
        window.clearInterval(timer);
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <Wrap spec={spec}>
      <div className="pad">
        {placed.map((on, index) => (
          <button
            type="button"
            key={index}
            onClick={() => {
              const next = placed.slice();
              next[index] = true;
              towers.current = next;
              setPlaced(next);
            }}
          >
            {on ? "Tower" : "Empty"}
          </button>
        ))}
      </div>
      <p className="play-hint">{label}. Stop six.</p>
    </Wrap>
  );
}

const MATES = [
  { q: "White: king f6, queen h6. Black king h8. Mate in one.", options: ["Qg7", "Qf4", "Ke5"], a: 0 },
  { q: "White rook on the open a-file, black king stuck on the back rank.", options: ["Ra8", "a4", "Kh1"], a: 0 },
  { q: "Knight jumps to a square beside the king that no piece can take.", options: ["Nf7", "Na3", "h3"], a: 0 },
];

function ChessMate({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [index, setIndex] = useState(0);
  const card = MATES[index];
  return (
    <Wrap spec={spec}>
      <p className="play-hint">{card.q}</p>
      <div className="pad">
        {card.options.map((option, choice) => (
          <button
            type="button"
            key={option}
            onClick={() => {
              if (choice !== card.a) end("lose");
              else if (index + 1 >= MATES.length) end("win");
              else setIndex(index + 1);
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </Wrap>
  );
}

function CupFill({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [level, setLevel] = useState(0);
  const levelRef = useRef(0);
  const filling = useRef(0);
  function down() {
    window.clearInterval(filling.current);
    filling.current = window.setInterval(() => {
      levelRef.current = Math.min(100, levelRef.current + 2);
      setLevel(levelRef.current);
    }, 30);
  }
  function up() {
    if (!filling.current) return;
    window.clearInterval(filling.current);
    filling.current = 0;
    end(levelRef.current >= 62 && levelRef.current <= 78 ? "win" : "lose");
  }
  return (
    <Wrap spec={spec}>
      <Meter value={level} mark={[62, 78]} />
      <button type="button" className="again" onPointerDown={down} onPointerUp={up} onPointerLeave={up}>Hold</button>
      <p className="play-hint">Release inside the band.</p>
    </Wrap>
  );
}

const ICE = ["#####", "#S..#", "###.#", "#E..#", "#####"];

function IceSlide({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [at, setAt] = useState({ x: 1, y: 1 });
  function slide(dx: number, dy: number) {
    let x = at.x;
    let y = at.y;
    while (ICE[y + dy]?.[x + dx] && ICE[y + dy][x + dx] !== "#") {
      x += dx;
      y += dy;
    }
    setAt({ x, y });
    if (ICE[y][x] === "E") end("win");
  }
  return (
    <Wrap spec={spec}>
      <pre className="play-hint" style={{ letterSpacing: 4 }}>{ICE.map((row, y) => [...row].map((cell, x) => (at.x === x && at.y === y ? "o" : cell)).join("")).join("\n")}</pre>
      <div className="pad">
        <button type="button" onClick={() => slide(0, -1)}>↑</button>
        <button type="button" onClick={() => slide(-1, 0)}>←</button>
        <button type="button" onClick={() => slide(0, 1)}>↓</button>
        <button type="button" onClick={() => slide(1, 0)}>→</button>
      </div>
      <p className="play-hint">You slide until a wall. Reach E.</p>
    </Wrap>
  );
}

function Lottery({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [picks, setPicks] = useState<number[]>([]);
  function toggle(n: number) {
    if (picks.includes(n)) setPicks(picks.filter((item) => item !== n));
    else if (picks.length < 2) setPicks([...picks, n]);
  }
  function draw() {
    if (picks.length !== 2) return;
    const winning = shuffle([1, 2, 3, 4, 5]).slice(0, 2);
    end(picks.every((n) => winning.includes(n)) ? "win" : "lose");
  }
  return (
    <Wrap spec={spec}>
      <div className="pad">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => toggle(n)} style={{ outline: picks.includes(n) ? "3px solid #241c16" : "none" }}>{n}</button>
        ))}
      </div>
      <button type="button" className="again" onClick={draw}>Draw</button>
      <p className="play-hint">Pick two numbers. Match both.</p>
    </Wrap>
  );
}

const REBUS = [
  { q: "HEAD\nHEELS", options: ["head over heels", "head start", "big head"], a: 0 },
  { q: "STAND\nI", options: ["I understand", "stand still", "island"], a: 0 },
  { q: "CYCLE CYCLE CYCLE", options: ["tricycle", "recycle", "bicycle"], a: 0 },
];

function Rebus({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [index, setIndex] = useState(0);
  const card = REBUS[index];
  return (
    <Wrap spec={spec}>
      <pre className="play-score">{card.q}</pre>
      <div className="pad" style={{ flexWrap: "wrap" }}>
        {card.options.map((option, choice) => (
          <button
            type="button"
            key={option}
            onClick={() => {
              if (choice !== card.a) end("lose");
              else if (index + 1 >= REBUS.length) end("win");
              else setIndex(index + 1);
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </Wrap>
  );
}

function CupPong({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const power = useSwing(1.8);
  const [cup, setCup] = useState(0);
  const [made, setMade] = useState(0);
  const [miss, setMiss] = useState(0);
  function toss() {
    const band = cup < 2 ? power > 28 && power < 46 : power > 60 && power < 78;
    if (band) {
      if (made + 1 >= 3) end("win");
      else setMade(made + 1);
    } else if (miss + 1 >= 3) end("lose");
    else setMiss(miss + 1);
  }
  return (
    <Wrap spec={spec}>
      <div className="pad">
        {["Front", "Front", "Back", "Back"].map((label, index) => (
          <button type="button" key={index} onClick={() => setCup(index)} style={{ outline: cup === index ? "3px solid #241c16" : "none" }}>{label}</button>
        ))}
      </div>
      <Meter value={power} />
      <button type="button" className="again" onClick={toss}>Throw</button>
      <p className="play-hint">Front cups want a soft throw, back cups a hard one. {made}/3.</p>
    </Wrap>
  );
}

function RedLight({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [go, setGo] = useState(true);
  const [steps, setSteps] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setGo((value) => !value), 800);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <Wrap spec={spec}>
      <p className="play-score" style={{ color: go ? "#1f6b45" : "#b5523a" }}>{go ? "Green" : "Red"} · {steps}/8</p>
      <button
        type="button"
        className="again"
        onClick={() => {
          if (!go) end("lose");
          else if (steps + 1 >= 8) end("win");
          else setSteps(steps + 1);
        }}
      >
        Step
      </button>
    </Wrap>
  );
}

function ShellGame({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [cup, setCup] = useState(1);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let n = 0;
    const timer = window.setInterval(() => {
      setCup((current) => (current + 1 + (n % 2)) % 3);
      n += 1;
      if (n >= 6) {
        window.clearInterval(timer);
        setHidden(true);
      }
    }, 320);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <Wrap spec={spec}>
      <div className="pad">
        {[0, 1, 2].map((index) => (
          <button type="button" key={index} onClick={() => hidden && end(index === cup ? "win" : "lose")}>
            {!hidden && index === cup ? "●" : "cup"}
          </button>
        ))}
      </div>
      <p className="play-hint">{hidden ? "Which cup?" : "Watch the ball."}</p>
    </Wrap>
  );
}

function Dominoes({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [chain, setChain] = useState<[number, number][]>([[1, 2]]);
  const [hand, setHand] = useState<[number, number][]>([[2, 3], [3, 4], [4, 5], [5, 1], [1, 6]]);
  const left = chain[0][0];
  const right = chain[chain.length - 1][1];
  function play(index: number, side: "L" | "R") {
    const tile = hand[index];
    let placed: [number, number] | null = null;
    if (side === "R" && tile[0] === right) placed = tile;
    else if (side === "R" && tile[1] === right) placed = [tile[1], tile[0]];
    else if (side === "L" && tile[1] === left) placed = tile;
    else if (side === "L" && tile[0] === left) placed = [tile[1], tile[0]];
    if (!placed) return;
    const nextHand = hand.filter((_, i) => i !== index);
    const nextChain = side === "R" ? [...chain, placed] : [placed, ...chain];
    setHand(nextHand);
    setChain(nextChain);
    if (!nextHand.length) end("win");
    else {
      const openL = nextChain[0][0];
      const openR = nextChain[nextChain.length - 1][1];
      const stuck = nextHand.every((item) => !item.includes(openL) && !item.includes(openR));
      if (stuck) end("lose");
    }
  }
  return (
    <Wrap spec={spec}>
      <p className="play-hint">{chain.map((tile) => tile.join("|")).join(" ")}</p>
      {hand.map((tile, index) => (
        <div className="pad" key={tile.join("-")}>
          <button type="button" onClick={() => play(index, "L")}>L</button>
          <span>{tile.join("|")}</span>
          <button type="button" onClick={() => play(index, "R")}>R</button>
        </div>
      ))}
      <p className="play-hint">Play onto the left or right end. Empty your hand.</p>
    </Wrap>
  );
}

export const PACK_D: Record<string, Player> = {
  golf_solitaire: GolfSolitaire,
  war: War,
  pig_dice: PigDice,
  yahtzee: Yahtzee,
  stopwatch: Stopwatch,
  balance: Balance,
  rhythm: Rhythm,
  mancala: Mancala,
  sudoku: Sudoku,
  nonogram: Nonogram,
  anagram: Anagram,
  coin_clicker: CoinClicker,
  light_cycle: LightCycle,
  billiards: Billiards,
  curling: Curling,
  skee_ball: SkeeBall,
  cornhole: Cornhole,
  shuffleboard: Shuffleboard,
  archery: Archery,
  horseshoes: Horseshoes,
  pinball: Pinball,
  recipe: Recipe,
  path_memory: PathMemory,
  uno: Uno,
  go_fish: GoFish,
  snap: Snap,
  boggle: Boggle,
  tower_defense: TowerDefense,
  chess_mate: ChessMate,
  cup_fill: CupFill,
  ice_slide: IceSlide,
  lottery: Lottery,
  rebus: Rebus,
  cup_pong: CupPong,
  red_light: RedLight,
  shell_game: ShellGame,
  dominoes: Dominoes,
};

function size(canvas: HTMLCanvasElement) {
  canvas.width = canvas.clientWidth || 320;
  canvas.height = canvas.clientHeight || 240;
}

function localPoint(canvas: HTMLCanvasElement, event: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function shuffle<T>(items: T[]) {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function scramble(word: string) {
  const letters = shuffle([...word]);
  if (letters.join("") === word) letters.reverse();
  return letters.join("");
}
