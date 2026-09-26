import games from "./games.json";

export type GameDef = {
  id: string;
  title: string;
  engine: string;
  look: string;
  blurb: string;
  win: string;
  lose: string;
};

export const GAMES = games as GameDef[];

const BY_ID = new Map(GAMES.map((game) => [game.id, game]));

export function getGame(id: string): GameDef | undefined {
  return BY_ID.get(id);
}
