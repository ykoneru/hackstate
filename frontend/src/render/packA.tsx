import { useEffect, useMemo, useState } from "react";
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

function MemoryMatch({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const deck = useMemo(() => shuffle(["A", "A", "B", "B", "C", "C", "D", "D"]), []);
  const [up, setUp] = useState<number[]>([]);
  const [known, setKnown] = useState<number[]>([]);
  function flip(index: number) {
    if (known.includes(index) || up.includes(index) || up.length === 2) return;
    const next = [...up, index];
    setUp(next);
    if (next.length === 2) {
      const matched = deck[next[0]] === deck[next[1]];
      window.setTimeout(() => {
        if (matched) {
          const got = [...known, ...next];
          setKnown(got);
          if (got.length === deck.length) end("win");
        }
        setUp([]);
      }, 450);
    }
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid moles">
        {deck.map((card, index) => (
          <button type="button" key={index} onClick={() => flip(index)}>
            {up.includes(index) || known.includes(index) ? card : ""}
          </button>
        ))}
      </div>
      <p className="play-hint">Flip two cards that match.</p>
    </Wrap>
  );
}

function ConnectFour({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [cells, setCells] = useState<(number | null)[]>(Array(42).fill(null));
  const [turn, setTurn] = useState(1);
  function drop(board: (number | null)[], col: number, who: number) {
    const next = board.slice();
    for (let row = 5; row >= 0; row -= 1) {
      const index = row * 7 + col;
      if (!next[index]) {
        next[index] = who;
        return next;
      }
    }
    return null;
  }
  function winner(board: (number | null)[]) {
    const dirs = [1, 7, 6, 8];
    for (let i = 0; i < 42; i += 1) {
      if (!board[i]) continue;
      for (const dir of dirs) {
        const line = [0, 1, 2, 3].map((step) => i + dir * step);
        if (line.every((n) => board[n] === board[i] && n >= 0 && n < 42 && Math.abs((n % 7) - (i % 7)) < 4)) return board[i];
      }
    }
    return null;
  }
  function play(col: number) {
    if (turn !== 1) return;
    const mine = drop(cells, col, 1);
    if (!mine) return;
    if (winner(mine) === 1) {
      setCells(mine);
      end("win");
      return;
    }
    const cols = [0, 1, 2, 3, 4, 5, 6].filter((c) => drop(mine, c, 2));
    const attack = cols.find((c) => winner(drop(mine, c, 2)!) === 2);
    const block = cols.find((c) => winner(drop(mine, c, 1)!) === 1);
    const choice = attack ?? block ?? cols[Math.floor(Math.random() * cols.length)];
    const theirs = choice === undefined ? mine : drop(mine, choice, 2)!;
    setCells(theirs);
    if (winner(theirs) === 2) end("lose");
    else if (theirs.every(Boolean)) end("lose");
    else setTurn(1);
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map((cell, index) => (
          <button type="button" key={index} onClick={() => play(index % 7)} style={{ minHeight: 36, background: cell === 1 ? "#b5523a" : cell === 2 ? "#f2cc8f" : "#f3efe6" }} />
        ))}
      </div>
      <p className="play-hint">Drop a red disc. Connect four.</p>
    </Wrap>
  );
}

const MINES = new Set([0, 8, 16, 24]);

function Minesweeper({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [open, setOpen] = useState<number[]>([]);
  function nearby(index: number) {
    const r = Math.floor(index / 5);
    const c = index % 5;
    let n = 0;
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (!dr && !dc) continue;
        const rr = r + dr;
        const cc = c + dc;
        if (rr >= 0 && rr < 5 && cc >= 0 && cc < 5 && MINES.has(rr * 5 + cc)) n += 1;
      }
    }
    return n;
  }
  function dig(index: number) {
    if (open.includes(index)) return;
    if (MINES.has(index)) {
      end("lose");
      return;
    }
    const next = [...open, index];
    setOpen(next);
    if (next.length === 21) end("win");
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {Array.from({ length: 25 }, (_, index) => (
          <button type="button" key={index} onClick={() => dig(index)}>
            {open.includes(index) ? nearby(index) || "" : ""}
          </button>
        ))}
      </div>
      <p className="play-hint">Clear every safe cell.</p>
    </Wrap>
  );
}

function SlidePuzzle({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [tiles, setTiles] = useState(() => shuffleSolvable());
  function move(index: number) {
    const empty = tiles.indexOf(0);
    const sameRow = Math.floor(index / 3) === Math.floor(empty / 3);
    const neighbor = Math.abs(index - empty) === 1 && sameRow || Math.abs(index - empty) === 3;
    if (!neighbor) return;
    const next = tiles.slice();
    [next[index], next[empty]] = [next[empty], next[index]];
    setTiles(next);
    if (next.slice(0, 8).every((tile, i) => tile === i + 1)) end("win");
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid">
        {tiles.map((tile, index) => (
          <button type="button" key={index} onClick={() => move(index)}>
            {tile || ""}
          </button>
        ))}
      </div>
      <p className="play-hint">Slide the tiles into order.</p>
    </Wrap>
  );
}

function SimonGame({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const colors = ["#b5523a", "#f2cc8f", "#1f6b45", "#3d85c6"];
  const [seq, setSeq] = useState([0]);
  const [lit, setLit] = useState(-1);
  const [at, setAt] = useState(0);
  const [phase, setPhase] = useState<"show" | "play">("show");
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
        }, 350);
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [phase, seq]);
  function press(color: number) {
    if (phase !== "play") return;
    if (color !== seq[at]) {
      end("lose");
      return;
    }
    if (at + 1 === seq.length) {
      if (seq.length >= 4) end("win");
      else {
        setSeq([...seq, Math.floor(Math.random() * 4)]);
        setPhase("show");
      }
    } else setAt(at + 1);
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid moles">
        {colors.map((color, index) => (
          <button type="button" key={color} onClick={() => press(index)} style={{ background: lit === index ? color : "#f3efe6", minHeight: 72 }} />
        ))}
      </div>
      <p className="play-hint">Repeat the colors. Reach a run of four.</p>
    </Wrap>
  );
}

function Reaction({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [go, setGo] = useState(false);
  const start = useMemo(() => ({ at: 0 }), []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      start.at = performance.now();
      setGo(true);
    }, 900 + Math.random() * 1100);
    return () => window.clearTimeout(timer);
  }, [start]);
  return (
    <Wrap spec={spec}>
      <button
        type="button"
        className="again"
        style={{ margin: 24, minHeight: 120, background: go ? "#1f6b45" : "#b5523a", color: "#fffcf8" }}
        onClick={() => {
          if (!go) end("lose");
          else if (performance.now() - start.at < 550) end("win");
          else end("lose");
        }}
      >
        {go ? "Tap" : "Wait"}
      </button>
      <p className="play-hint">Tap as soon as it turns green.</p>
    </Wrap>
  );
}

function HigherLower({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [card, setCard] = useState(7);
  const [streak, setStreak] = useState(0);
  function guess(higher: boolean) {
    let next = 1 + Math.floor(Math.random() * 13);
    if (next === card) next = next === 13 ? 1 : next + 1;
    const ok = higher ? next > card : next < card;
    if (!ok) end("lose");
    else if (streak + 1 >= 5) end("win");
    else {
      setStreak(streak + 1);
      setCard(next);
    }
  }
  return (
    <Wrap spec={spec}>
      <p className="play-score"><strong>{card}</strong> · {streak}/5</p>
      <div className="pad">
        <button type="button" onClick={() => guess(false)}>Lower</button>
        <button type="button" onClick={() => guess(true)}>Higher</button>
      </div>
      <p className="play-hint">Five correct guesses win.</p>
    </Wrap>
  );
}

function Blackjack({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const draw = () => 2 + Math.floor(Math.random() * 9);
  const [hand, setHand] = useState(() => [draw(), draw()]);
  const [dealer, setDealer] = useState(() => [draw()]);
  const total = (cards: number[]) => cards.reduce((sum, card) => sum + card, 0);
  function hit() {
    const next = [...hand, draw()];
    setHand(next);
    if (total(next) > 21) end("lose");
  }
  function stand() {
    const theirs = dealer.slice();
    while (total(theirs) < 17) theirs.push(draw());
    setDealer(theirs);
    const mine = total(hand);
    const opp = total(theirs);
    if (opp > 21 || mine > opp) end("win");
    else end("lose");
  }
  return (
    <Wrap spec={spec}>
      <p className="play-hint">You {total(hand)}. Dealer {total(dealer)}.</p>
      <div className="pad">
        <button type="button" onClick={hit}>Hit</button>
        <button type="button" onClick={stand}>Stand</button>
      </div>
    </Wrap>
  );
}

function RockPaperScissors({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [you, setYou] = useState(0);
  const [them, setThem] = useState(0);
  const names = ["rock", "paper", "scissors"];
  function play(pick: number) {
    const opp = Math.floor(Math.random() * 3);
    if (pick === opp) return;
    const win = (pick + 1) % 3 === opp ? false : true;
    const ny = you + (win ? 1 : 0);
    const nt = them + (win ? 0 : 1);
    setYou(ny);
    setThem(nt);
    if (ny >= 2) end("win");
    if (nt >= 2) end("lose");
  }
  return (
    <Wrap spec={spec}>
      <p className="play-score">{you} - {them}</p>
      <div className="pad">
        {names.map((name, index) => (
          <button type="button" key={name} onClick={() => play(index)}>{name}</button>
        ))}
      </div>
      <p className="play-hint">First to two.</p>
    </Wrap>
  );
}

function Hangman({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const word = "NAPKIN";
  const [got, setGot] = useState<string[]>([]);
  const [miss, setMiss] = useState(0);
  function pick(letter: string) {
    if (got.includes(letter)) return;
    const next = [...got, letter];
    setGot(next);
    if (!word.includes(letter)) {
      if (miss + 1 >= 6) end("lose");
      else setMiss(miss + 1);
    } else if ([...word].every((ch) => next.includes(ch))) end("win");
  }
  return (
    <Wrap spec={spec}>
      <p className="play-score">{[...word].map((ch) => (got.includes(ch) ? ch : "_")).join(" ")}</p>
      <div className="pad" style={{ flexWrap: "wrap" }}>
        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
          <button type="button" key={letter} onClick={() => pick(letter)} style={{ width: 32 }}>{letter}</button>
        ))}
      </div>
      <p className="play-hint">Misses {miss}/6</p>
    </Wrap>
  );
}

const PEGS = ["R", "Y", "G", "B"];

function Mastermind({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const secret = useMemo(() => [0, 1, 2, 3].map(() => Math.floor(Math.random() * 4)), []);
  const [guess, setGuess] = useState([0, 0, 0, 0]);
  const [rows, setRows] = useState<string[]>([]);
  function submit() {
    let black = 0;
    const usedS = secret.map((n, i) => (n === guess[i] ? (black += 1, true) : false));
    const usedG = guess.map((n, i) => n === secret[i]);
    let white = 0;
    guess.forEach((n, i) => {
      if (usedG[i]) return;
      const j = secret.findIndex((s, k) => s === n && !usedS[k]);
      if (j >= 0) {
        usedS[j] = true;
        white += 1;
      }
    });
    const next = [...rows, `${guess.map((n) => PEGS[n]).join("")}  ${black} exact, ${white} color`];
    setRows(next);
    if (black === 4) end("win");
    else if (next.length >= 6) end("lose");
  }
  return (
    <Wrap spec={spec}>
      {rows.map((row) => <p key={row} className="play-hint">{row}</p>)}
      <div className="pad">
        {guess.map((n, i) => (
          <button type="button" key={i} onClick={() => setGuess(guess.map((v, k) => (k === i ? (v + 1) % 4 : v)))}>{PEGS[n]}</button>
        ))}
        <button type="button" onClick={submit}>Try</button>
      </div>
      <p className="play-hint">Tap a letter to change its color. Six tries.</p>
    </Wrap>
  );
}

function LightsOut({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [on, setOn] = useState([1, 0, 1, 0, 1, 0, 1, 0, 1]);
  function toggle(index: number) {
    const next = on.slice();
    const r = Math.floor(index / 3);
    const c = index % 3;
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < 3 && cc >= 0 && cc < 3) {
        const j = rr * 3 + cc;
        next[j] = next[j] ? 0 : 1;
      }
    });
    setOn(next);
    if (next.every((cell) => !cell)) end("win");
  }
  return (
    <Wrap spec={spec}>
      <div className="mini-grid">
        {on.map((cell, index) => (
          <button type="button" key={index} onClick={() => toggle(index)} style={{ background: cell ? "#f2cc8f" : "#241c16" }} />
        ))}
      </div>
      <p className="play-hint">Turn every light off.</p>
    </Wrap>
  );
}

function Hanoi({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [pegs, setPegs] = useState<number[][]>([[3, 2, 1], [], []]);
  const [sel, setSel] = useState<number | null>(null);
  function click(peg: number) {
    if (sel === null) {
      if (pegs[peg].length) setSel(peg);
      return;
    }
    if (sel === peg) {
      setSel(null);
      return;
    }
    const disk = pegs[sel][pegs[sel].length - 1];
    const top = pegs[peg][pegs[peg].length - 1];
    if (top && top < disk) {
      setSel(null);
      return;
    }
    const next = pegs.map((stack) => stack.slice());
    next[peg].push(next[sel].pop() as number);
    setPegs(next);
    setSel(null);
    if (next[2].length === 3) end("win");
  }
  return (
    <Wrap spec={spec}>
      <div className="pad">
        {pegs.map((stack, index) => (
          <button type="button" key={index} onClick={() => click(index)} style={{ width: 72, height: 88 }}>
            {stack.join(" ")}
          </button>
        ))}
      </div>
      <p className="play-hint">Move the stack to the right peg. {sel === null ? "Pick a peg." : "Now the destination."}</p>
    </Wrap>
  );
}

function Nim({ spec, onFinish }: Props) {
  const end = useEnd(onFinish);
  const [stones, setStones] = useState(9);
  function take(n: number) {
    const left = stones - n;
    if (left <= 0) {
      end("win");
      return;
    }
    const ai = left % 4 === 0 ? 1 : left % 4;
    const after = left - ai;
    setStones(Math.max(0, after));
    if (after <= 0) end("lose");
  }
  return (
    <Wrap spec={spec}>
      <p className="play-score">{stones} stones</p>
      <div className="pad">
        {[1, 2, 3].map((n) => (
          <button type="button" key={n} onClick={() => take(n)} disabled={n > stones}>Take {n}</button>
        ))}
      </div>
      <p className="play-hint">Take the last stone.</p>
    </Wrap>
  );
}

export const PACK_A: Record<string, Player> = {
  memory_match: MemoryMatch,
  connect_four: ConnectFour,
  minesweeper: Minesweeper,
  slide_puzzle: SlidePuzzle,
  simon: SimonGame,
  reaction: Reaction,
  higher_lower: HigherLower,
  blackjack: Blackjack,
  rock_paper_scissors: RockPaperScissors,
  hangman: Hangman,
  mastermind: Mastermind,
  lights_out: LightsOut,
  hanoi: Hanoi,
  nim: Nim,
};

function shuffle<T>(items: T[]) {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function shuffleSolvable() {
  const tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  for (let n = 0; n < 20; n += 1) {
    const empty = tiles.indexOf(0);
    const options = [empty - 1, empty + 1, empty - 3, empty + 3].filter((index) => {
      if (index < 0 || index > 8) return false;
      if (Math.abs(index - empty) === 1 && Math.floor(index / 3) !== Math.floor(empty / 3)) return false;
      return true;
    });
    const swap = options[Math.floor(Math.random() * options.length)];
    [tiles[empty], tiles[swap]] = [tiles[swap], tiles[empty]];
  }
  return tiles;
}
