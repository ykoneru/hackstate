import json
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from interpret.normalize import new_game, normalize
from interpret.schema import Action, Entity, GameSave, Manifest, Stat

_PATH = Path(__file__).resolve().parents[2] / "frontend" / "src" / "render" / "games.json"
GAMES: list[dict] = json.loads(_PATH.read_text())
BY_ID = {game["id"]: game for game in GAMES}


class SketchPick(BaseModel):
    model_config = ConfigDict(extra="ignore")

    game_id: str = Field(description="The id of the closest game in the list. Always one of those ids.")


def design_prompt() -> str:
    lines = "\n".join(f"- {game['id']}: {game['title']}. {game['blurb']}" for game in GAMES)
    return f"""Look at the ink on the paper. Ignore the desk, fingers, and shadows.
Choose the one game below that the drawing most resembles. Return its id.
Always return an id from the list. If the drawing is unclear, pick the closest game.

{lines}
"""


def resolve_game(raw: str) -> dict:
    cleaned = _slug(raw)
    if cleaned in BY_ID:
        return BY_ID[cleaned]
    for game in GAMES:
        if _slug(game["title"]) == cleaned:
            return game
    tokens = [token for token in cleaned.split("_") if len(token) > 2]
    best = BY_ID["ping_pong"]
    best_score = 0
    for game in GAMES:
        words = set(game["id"].split("_"))
        words.update(_slug(game["title"]).split("_"))
        words.update(_slug(game["blurb"]).split("_"))
        hit = sum(1 for token in tokens if token in words)
        if hit > best_score:
            best = game
            best_score = hit
    return best


def game_save(raw: str) -> GameSave:
    spec = resolve_game(raw)
    manifest = Manifest(
        title=spec["title"],
        tagline=spec["blurb"],
        visual_style="notebook ink",
        accent="forest" if spec["id"] in {"ping_pong", "maze"} else "ink",
        genre="explore",
        mechanics=spec["blurb"],
        scene_setting=spec["title"],
        scene_layout=spec["engine"],
        entities=[
            Entity(
                id="player",
                name="You",
                role="player",
                shape="figure",
                pose="ready",
                color="ink",
                size="medium",
                x=20,
                y=70,
                accessory="none",
            )
        ],
        stats=[Stat(id="score", label="Score", value=0, maximum=10, win_at=10, lose_at=-1)],
        actions=[
            Action(id="play", label="Play", hint="Play the game."),
            Action(id="again", label="Again", hint="Play again."),
        ],
        win_text=spec["win"],
        lose_text=spec["lose"],
        game_id=spec["id"],
    )
    return new_game(normalize(manifest))


def _slug(value: str) -> str:
    return "".join(ch if ch.isalnum() else "_" for ch in value.lower()).strip("_")
