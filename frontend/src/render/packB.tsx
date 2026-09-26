import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import type { GameDef } from "./catalog";
import { useEnd } from "./end";

type Props = { spec: GameDef; onFinish: (outcome: "win" | "lose") => void };
type Player = (props: Props) => ReactElement;

function Wrap({ spec, children }: { spec: GameDef; children: React.ReactNode }) {
  return <div className="mini-wrap" aria-label={spec.title}>{children}</div>;
}

function DotsAndBoxes({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [h, setH] = useState<number[]>(Array(12).fill(0));
  const [v, setV] = useState<number[]>(Array(12).fill(0));
  const [boxes, setBoxes] = useState<number[]>(Array(9).fill(0));
  const [you, setYou] = useState(true);
  function own(nextH: number[], nextV: number[], nextB: number[], player: number) {
    let extra = false;
    for (let i = 0; i < 9; i += 1) {
      if (nextB[i]) continue;
      const r = Math.floor(i / 3);
      const c = i % 3;
      if (nextH[r * 3 + c] && nextH[(r + 1) * 3 + c] && nextV[r * 4 + c] && nextV[r * 4 + c + 1]) {
        nextB[i] = player;
        extra = true;
      }
    }
    return extra;
  }
  function score(board: number[], who: number) {
    return board.filter((cell) => cell === who).length;
  }
  function finish(board: number[]) {
    if (board.some((cell) => !cell)) return;
    end(score(board, 1) >= score(board, 2) ? "win" : "lose");
  }
  function ai(nextH: number[], nextV: number[], nextB: number[]) {
    const opens: ["h" | "v", number][] = [];
    nextH.forEach((edge, i) => !edge && opens.push(["h", i]));
    nextV.forEach((edge, i) => !edge && opens.push(["v", i]));
    if (!opens.length) {
      finish(nextB);
      return;
    }
    const [kind, index] = opens[Math.floor(Math.random() * opens.length)];
    if (kind === "h") nextH[index] = 2;
    else nextV[index] = 2;
    const extra = own(nextH, nextV, nextB, 2);
    setH(nextH.slice());
    setV(nextV.slice());
    setBoxes(nextB.slice());
    if (nextB.every(Boolean)) finish(nextB);
    else if (extra) ai(nextH, nextV, nextB);
    else setYou(true);
  }
  function play(kind: "h" | "v", index: number) {
    if (!you) return;
    const nextH = h.slice();
    const nextV = v.slice();
    const nextB = boxes.slice();
    if (kind === "h") {
      if (nextH[index]) return;
      nextH[index] = 1;
    } else {
      if (nextV[index]) return;
      nextV[index] = 1;
    }
    const extra = own(nextH, nextV, nextB, 1);
    setH(nextH);
    setV(nextV);
    setBoxes(nextB);
    if (nextB.every(Boolean)) finish(nextB);
    else if (!extra) {
      setYou(false);
      window.setTimeout(() => ai(nextH, nextV, nextB), 200);
    }
  }
  return (
    <Wrap spec={spec}>
      <div className="pad" style={{ flexWrap: "wrap", maxWidth: 220 }}>
        {h.map((edge, i) => <button type="button" key={`h${i}`} onClick={() => play("h", i)}>{edge ? "—" : "·"}</button>)}
        {v.map((edge, i) => <button type="button" key={`v${i}`} onClick={() => play("v", i)}>{edge ? "|" : "·"}</button>)}
      </div>
      <p className="play-hint">You have {score(boxes, 1)} boxes. Claim the most.</p>
    </Wrap>
  );
}

function lineOf(board: number[], index: number, dir: number, need: number) {
  const w = 7;
  let n = 1;
  for (const sign of [1, -1]) {
    for (let step = 1; step < need; step += 1) {
      const j = index + dir * step * sign;
      if (j < 0 || j >= board.length || board[j] !== board[index]) break;
      if (dir === 1 && Math.floor(j / w) !== Math.floor(index / w)) break;
      n += 1;
    }
  }
  return n >= need;
}

function Gomoku({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [board, setBoard] = useState<number[]>(Array(49).fill(0));
  function won(cells: number[], who: number) {
    return cells.some((cell, i) => cell === who && [1, 7, 6, 8].some((dir) => lineOf(cells, i, dir, 4)));
  }
  function play(index: number) {
    if (board[index]) return;
    const next = board.slice();
    next[index] = 1;
    if (won(next, 1)) {
      setBoard(next);
      end("win");
      return;
    }
    const open = next.flatMap((cell, i) => (cell ? [] : [i]));
    const attack = open.find((i) => {
      const t = next.slice();
      t[i] = 2;
      return won(t, 2);
    });
    const block = open.find((i) => {
      const t = next.slice();
      t[i] = 1;
      return won(t, 1);
    });
    const choice = attack ?? block ?? open[Math.floor(Math.random() * open.length)];
    if (choice === undefined) return;
    next[choice] = 2;
    setBoard(next);
    if (won(next, 2)) end("lose");
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
        {board.map((cell, i) => (
          <button type="button" key={i} onClick={() => play(i)} style={{ minHeight: 32 }}>{cell === 1 ? "●" : cell === 2 ? "○" : ""}</button>
        ))}
      </div>
      <p className="play-hint">Get four in a row.</p>
    </Wrap>
  );
}

function Othello({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [board, setBoard] = useState(() => {
    const cells = Array(36).fill(0);
    cells[14] = 2;
    cells[15] = 1;
    cells[20] = 1;
    cells[21] = 2;
    return cells as number[];
  });
  function flips(cells: number[], index: number, who: number) {
    if (cells[index]) return [];
    const got: number[] = [];
    const opp = who === 1 ? 2 : 1;
    for (const dir of [1, -1, 6, -6, 5, -5, 7, -7]) {
      const line: number[] = [];
      let j = index + dir;
      while (j >= 0 && j < 36 && cells[j] === opp && Math.abs((j % 6) - ((j - dir) % 6)) <= 1) {
        line.push(j);
        j += dir;
      }
      if (line.length && j >= 0 && j < 36 && cells[j] === who) got.push(...line);
    }
    return got;
  }
  function play(index: number, cells: number[], who: number) {
    const turned = flips(cells, index, who);
    if (!turned.length) return null;
    const next = cells.slice();
    next[index] = who;
    turned.forEach((j) => { next[j] = who; });
    return next;
  }
  function click(index: number) {
    const mine = play(index, board, 1);
    if (!mine) return;
    const oppMoves = mine.flatMap((_, i) => (flips(mine, i, 2).length ? [i] : []));
    if (!oppMoves.length) {
      setBoard(mine);
      const mineCount = mine.filter((c) => c === 1).length;
      const oppCount = mine.filter((c) => c === 2).length;
      if (!mine.flatMap((_, i) => flips(mine, i, 1)).length) end(mineCount >= oppCount ? "win" : "lose");
      return;
    }
    const choice = oppMoves[Math.floor(Math.random() * oppMoves.length)];
    const theirs = play(choice, mine, 2) ?? mine;
    setBoard(theirs);
    if (theirs.every(Boolean)) {
      const mineCount = theirs.filter((c) => c === 1).length;
      const oppCount = theirs.filter((c) => c === 2).length;
      end(mineCount >= oppCount ? "win" : "lose");
    }
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
        {board.map((cell, i) => (
          <button type="button" key={i} onClick={() => click(i)} style={{ background: "#1f6b45", color: cell === 1 ? "#241c16" : "#fffcf8" }}>{cell === 1 ? "●" : cell === 2 ? "○" : ""}</button>
        ))}
      </div>
      <p className="play-hint">Trap a row to flip it. You are black.</p>
    </Wrap>
  );
}

function Battleship({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const ship = useMemo(() => {
    const row = Math.floor(Math.random() * 5);
    const col = Math.floor(Math.random() * 3);
    return [row * 5 + col, row * 5 + col + 1, row * 5 + col + 2];
  }, []);
  const [shots, setShots] = useState<number[]>([]);
  function fire(index: number) {
    if (shots.includes(index)) return;
    const next = [...shots, index];
    setShots(next);
    if (ship.every((cell) => next.includes(cell))) end("win");
    else if (next.length >= 8) end("lose");
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {Array.from({ length: 25 }, (_, i) => (
          <button type="button" key={i} onClick={() => fire(i)}>{shots.includes(i) ? (ship.includes(i) ? "X" : "·") : ""}</button>
        ))}
      </div>
      <p className="play-hint">Find the ship in eight shots.</p>
    </Wrap>
  );
}

function Sokoban({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [map, setMap] = useState(["######", "#@ $.#", "#    #", "######"]);
  function move(dx: number, dy: number) {
    const rows = map.map((row) => row.split(""));
    let px = 0;
    let py = 0;
    rows.forEach((row, y) => row.forEach((cell, x) => { if (cell === "@" || cell === "+") { px = x; py = y; } }));
    const tx = px + dx;
    const ty = py + dy;
    const ahead = rows[ty]?.[tx];
    if (!ahead || ahead === "#") return;
    if (ahead === "$" || ahead === "*") {
      const bx = tx + dx;
      const by = ty + dy;
      const beyond = rows[by]?.[bx];
      if (!beyond || beyond === "#" || beyond === "$" || beyond === "*") return;
      rows[by][bx] = beyond === "." ? "*" : "$";
      rows[ty][tx] = ahead === "*" ? "." : " ";
    }
    const fromGoal = rows[py][px] === "+";
    rows[py][px] = fromGoal ? "." : " ";
    rows[ty][tx] = rows[ty][tx] === "." ? "+" : "@";
    const next = rows.map((row) => row.join(""));
    setMap(next);
    if (!next.some((row) => row.includes("$"))) end("win");
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") move(-1, 0);
      if (event.key === "ArrowRight") move(1, 0);
      if (event.key === "ArrowUp") move(0, -1);
      if (event.key === "ArrowDown") move(0, 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <Wrap spec={spec}>
      <pre className="play-hint" style={{ fontSize: 18, letterSpacing: 4 }}>{map.join("\n")}</pre>
      <div className="pad">
        <button type="button" onClick={() => move(0, -1)}>↑</button>
        <button type="button" onClick={() => move(-1, 0)}>←</button>
        <button type="button" onClick={() => move(0, 1)}>↓</button>
        <button type="button" onClick={() => move(1, 0)}>→</button>
      </div>
      <p className="play-hint">Push the crate onto the dot.</p>
    </Wrap>
  );
}

function Match3({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [board, setBoard] = useState(() => Array.from({ length: 25 }, () => 1 + Math.floor(Math.random() * 4)));
  const [sel, setSel] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  function click(index: number) {
    if (sel === null) {
      setSel(index);
      return;
    }
    const neighbor = Math.abs(index - sel) === 1 && Math.floor(index / 5) === Math.floor(sel / 5) || Math.abs(index - sel) === 5;
    if (!neighbor) {
      setSel(index);
      return;
    }
    const next = board.slice();
    [next[index], next[sel]] = [next[sel], next[index]];
    const clear = new Set<number>();
    for (let i = 0; i < 25; i += 1) {
      const row = Math.floor(i / 5);
      const col = i % 5;
      if (col <= 2 && next[i] === next[i + 1] && next[i] === next[i + 2]) [i, i + 1, i + 2].forEach((n) => clear.add(n));
      if (row <= 2 && next[i] === next[i + 5] && next[i] === next[i + 10]) [i, i + 5, i + 10].forEach((n) => clear.add(n));
    }
    if (!clear.size) {
      setSel(null);
      return;
    }
    clear.forEach((n) => { next[n] = 1 + Math.floor(Math.random() * 4); });
    setBoard(next);
    const total = score + 1;
    setScore(total);
    setSel(null);
    if (total >= 3) end("win");
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {board.map((cell, i) => (
          <button type="button" key={i} onClick={() => click(i)} style={{ background: ["#b5523a", "#f2cc8f", "#1f6b45", "#3d85c6"][cell - 1], outline: sel === i ? "3px solid #241c16" : "none" }} />
        ))}
      </div>
      <p className="play-hint">Swap neighbors. Make three matches. {score}/3</p>
    </Wrap>
  );
}

function Twenty48({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [board, setBoard] = useState(() => spawn(spawn(Array(16).fill(0))));
  function move(dir: number) {
    const next = slide(board, dir);
    if (next.every((n, i) => n === board[i])) return;
    const placed = spawn(next);
    setBoard(placed);
    if (placed.some((n) => n >= 128)) end("win");
    else if (![0, 1, 2, 3].some((way) => slide(placed, way).some((n, i) => n !== placed[i]))) end("lose");
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") move(0);
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowUp") move(2);
      if (event.key === "ArrowDown") move(3);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <Wrap spec={spec}>
      <div className="mini-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {board.map((n, i) => <button type="button" key={i}>{n || ""}</button>)}
      </div>
      <div className="pad">
        <button type="button" onClick={() => move(2)}>↑</button>
        <button type="button" onClick={() => move(0)}>←</button>
        <button type="button" onClick={() => move(3)}>↓</button>
        <button type="button" onClick={() => move(1)}>→</button>
      </div>
      <p className="play-hint">Combine tiles until you reach 128.</p>
    </Wrap>
  );
}

const WORDS = ["PAPER", "SKATE", "BRICK", "CLOUD", "PLANT", "STONE", "CRANE", "TRACE", "HEART", "SMILE"];

function WordGuess({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const secret = useMemo(() => WORDS[Math.floor(Math.random() * 5)], []);
  const [guess, setGuess] = useState("");
  const [rows, setRows] = useState<string[]>([]);
  function submit() {
    const word = guess.toUpperCase();
    if (word.length !== 5 || !WORDS.includes(word)) return;
    const marks = [...word].map((ch, i) => (ch === secret[i] ? "G" : secret.includes(ch) ? "Y" : "·")).join("");
    const next = [...rows, `${word} ${marks}`];
    setRows(next);
    setGuess("");
    if (word === secret) end("win");
    else if (next.length >= 6) end("lose");
  }
  return (
    <Wrap spec={spec}>
      {rows.map((row) => <p key={row} className="play-hint">{row}</p>)}
      <div className="pad">
        <input value={guess} onChange={(event) => setGuess(event.target.value)} maxLength={5} aria-label={spec.title} />
        <button type="button" onClick={submit}>Guess</button>
      </div>
      <p className="play-hint">G is exact, Y is the wrong spot. Words: {WORDS.slice(0, 5).join(", ")}.</p>
    </Wrap>
  );
}

export const PACK_B: Record<string, Player> = {
  dots_and_boxes: DotsAndBoxes,
  gomoku: Gomoku,
  othello: Othello,
  battleship: Battleship,
  sokoban: Sokoban,
  match3: Match3,
  twenty48: Twenty48,
  word_guess: WordGuess,
};

function spawn(board: number[]) {
  const empty = board.flatMap((n, i) => (n ? [] : [i]));
  if (!empty.length) return board;
  const next = board.slice();
  next[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slide(board: number[], dir: number) {
  const rows = [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => {
    if (dir === 0) return board[r * 4 + c];
    if (dir === 1) return board[r * 4 + (3 - c)];
    if (dir === 2) return board[c * 4 + r];
    return board[(3 - c) * 4 + r];
  }));
  const merged = rows.map(compress);
  const out = Array(16).fill(0);
  merged.forEach((row, r) => row.forEach((n, c) => {
    if (dir === 0) out[r * 4 + c] = n;
    if (dir === 1) out[r * 4 + (3 - c)] = n;
    if (dir === 2) out[c * 4 + r] = n;
    if (dir === 3) out[(3 - c) * 4 + r] = n;
  }));
  return out;
}

function compress(row: number[]) {
  const nums = row.filter(Boolean);
  const out: number[] = [];
  for (let i = 0; i < nums.length; i += 1) {
    if (nums[i] === nums[i + 1]) {
      out.push(nums[i] * 2);
      i += 1;
    } else out.push(nums[i]);
  }
  while (out.length < 4) out.push(0);
  return out;
}
