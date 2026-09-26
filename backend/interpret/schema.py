# What this replaced:
# read_sketch asked Gemini for a Screen of form blocks (header, field, choices, button).
# Phone.tsx rendered that form. The button did not call Gemini again; it only
# showed success_title and success_body. /api/share stored that Screen JSON,
# and Recent sheets stored it in localStorage under sheet.screen.
# A game is now a Manifest from one design call, plus a TurnResult from every action.
# Share and recent sheets store a GameSave so play can resume mid-session.

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Effect = Literal[
    "hit",
    "miss",
    "critical",
    "heal",
    "itemFound",
    "blocked",
    "progress",
    "setback",
    "gameOver",
]
Role = Literal["player", "opponent", "obstacle", "item", "environment"]
Shape = Literal["figure", "blob", "box", "circle", "triangle", "line"]
Pose = Literal["idle", "ready", "crouch", "reach", "fallen"]
ColorName = Literal["ink", "clay", "forest", "sea", "paper", "gold", "rust", "night"]
SizeName = Literal["small", "medium", "large"]
Genre = Literal["duel", "race", "maze", "shop", "puzzle", "dialogue", "collect", "explore"]
Activity = Literal["story"]
Accent = Literal["ink", "forest", "clay", "sea"]
Outcome = Literal["win", "lose", "draw", "none"]


class Entity(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(description="Short id, letters and underscores, unique in this game.")
    name: str = Field(description="What this thing is called in the scene.")
    role: Role
    shape: Shape = Field(description="figure for a person or creature. blob, box, circle, triangle, or line for objects.")
    pose: Pose
    color: ColorName
    size: SizeName
    x: int = Field(description="Horizontal position from 0 to 100. Spread entities apart.")
    y: int = Field(description="Vertical position from 0 to 100. 80 is near the ground.")
    accessory: str = Field(description="One of: hat, sword, crown, bag, shield, wings, none.")


class Stat(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    label: str = Field(description="Short name shown on the meter, such as Health or Gold.")
    value: int = Field(description="Starting value.")
    maximum: int = Field(description="Highest value this stat can reach.")
    win_at: int = Field(description="Reaching this value wins. Use -1 if this stat does not award a win.")
    lose_at: int = Field(description="Dropping to this value loses. Use -1 if this stat does not cause a loss.")


class Action(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    label: str = Field(description="Two to four words on the button.")
    hint: str = Field(description="What this action is trying to do, for the referee.")


Motion = Literal["still", "slide", "drag", "bounce", "chase"]
PieceRole = Literal["player", "rival", "ball", "obstacle", "goal", "scenery"]
PieceShape = Literal["box", "circle", "line", "figure"]
ScoreRule = Literal["ball_exits", "reach_goal", "none"]


class PlayPiece(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str = Field(description="Name of this drawn object.")
    role: PieceRole
    shape: PieceShape
    motion: Motion = Field(
        description="still does not move. slide moves along the edge it sits on. drag moves freely. bounce is a ball. chase follows the ball or the player."
    )
    solid: bool = Field(description="True if a ball or the player should bounce off it. False for the table surface, a net, and decorations.")
    color: ColorName
    x: int = Field(description="Center, 0 to 100, matching where it sits in the drawing.")
    y: int = Field(description="Center, 0 to 100. 0 is the top of the drawing.")
    w: int = Field(description="Width, 2 to 80, in the same 0 to 100 space.")
    h: int = Field(description="Height, 2 to 80, in the same 0 to 100 space.")


class PlaySpec(BaseModel):
    model_config = ConfigDict(extra="ignore")

    enabled: bool = Field(description="True when the drawing has moving objects and a way to score. False for a shop, a conversation, or a puzzle.")
    hint: str = Field(description="One short sentence telling the player how to move.")
    win_score: int = Field(description="Points needed to win, from 1 to 7.")
    score: ScoreRule = Field(description="ball_exits, reach_goal, or none.")
    pieces: list[PlayPiece] = Field(default_factory=list)


class Manifest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str
    tagline: str
    visual_style: str = Field(description="Mood of the drawing: ink, palette, and energy.")
    accent: Accent
    genre: Genre = Field(description="The kind of game this drawing implies. Do not pick duel unless the drawing is a fight.")
    activity: Activity = Field(
        default="story",
        description="Always story. Live play comes from the play field, not from this value.",
    )
    play: PlaySpec = Field(default_factory=lambda: PlaySpec(enabled=False, hint="", win_score=1, score="none", pieces=[]))
    mechanics: str = Field(description="How a turn works in this genre, in one or two sentences.")
    scene_setting: str = Field(description="Where the scene takes place.")
    scene_layout: str = Field(description="What sits in the background: ground, walls, counter, track, stalls.")
    entities: list[Entity]
    stats: list[Stat]
    actions: list[Action]
    win_text: str
    lose_text: str
    game_id: str = ""


class StatSnap(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    value: int


class Delta(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    delta: int = Field(description="Amount to add to this stat. Negative subtracts.")


class HistoryBeat(BaseModel):
    model_config = ConfigDict(extra="ignore")

    action: str
    narrative: str
    effect: Effect


class TurnResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    narrative: str = Field(description="One or two sentences of what just happened.")
    state_delta: list[Delta] = Field(description="Stat changes caused by this action.")
    effect: Effect
    actor_id: str = Field(description="Entity id that acts. Must be an id from the manifest.")
    target_id: str = Field(description="Entity id that receives the effect. Must be an id from the manifest.")
    next_actions: list[Action]
    game_over: bool
    outcome: Outcome = Field(description="none unless game_over is true.")
    closing: str = Field(description="Empty unless game_over is true.")


class GameSave(BaseModel):
    model_config = ConfigDict(extra="ignore")

    manifest: Manifest
    stats: list[StatSnap]
    history: list[HistoryBeat]
    actions: list[Action]
    game_over: bool
    outcome: Outcome
    closing: str
    turn: int


class TurnRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    manifest: Manifest
    stats: list[StatSnap]
    history: list[HistoryBeat]
    actions: list[Action]
    action_id: str
    turn: int
