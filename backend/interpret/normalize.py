from interpret.schema import (
    Action,
    Entity,
    GameSave,
    Manifest,
    PlayPiece,
    PlaySpec,
    Stat,
    StatSnap,
    TurnResult,
)

MAX_TURNS = 8
_COLORS = {"ink", "clay", "forest", "sea", "paper", "gold", "rust", "night"}
_FALLBACK_ACTIONS = (
    Action(id="look", label="Look closer", hint="Study the scene before committing."),
    Action(id="press", label="Press on", hint="Take the next step toward the goal."),
)


def normalize(manifest: Manifest) -> Manifest:
    manifest.activity = "story"
    manifest.play = _play(manifest.play)
    manifest.title = _clip(manifest.title, 40) or "Sketch"
    manifest.tagline = _clip(manifest.tagline, 140) or "A game from the ink on the page."
    manifest.visual_style = _clip(manifest.visual_style, 160) or "notebook ink"
    manifest.mechanics = _clip(manifest.mechanics, 280) or "Each action moves the scene forward."
    manifest.scene_setting = _clip(manifest.scene_setting, 140) or "an open page"
    manifest.scene_layout = _clip(manifest.scene_layout, 180) or "open ground"
    manifest.win_text = _clip(manifest.win_text, 180) or "You made it."
    manifest.lose_text = _clip(manifest.lose_text, 180) or "The scene gets the better of you."
    manifest.entities = _entities(manifest.entities)
    manifest.stats = _stats(manifest.stats)
    manifest.actions = _actions(manifest.actions, "act")
    return manifest


def new_game(manifest: Manifest) -> GameSave:
    return GameSave(
        manifest=manifest,
        stats=[StatSnap(id=stat.id, value=stat.value) for stat in manifest.stats],
        history=[],
        actions=manifest.actions,
        game_over=False,
        outcome="none",
        closing="",
        turn=0,
    )


def settle_turn(
    manifest: Manifest,
    stats: list[StatSnap],
    actions: list[Action],
    turn_index: int,
    result: TurnResult,
) -> tuple[list[StatSnap], TurnResult]:
    values = {snap.id: snap.value for snap in stats}
    maximums = {stat.id: stat.maximum for stat in manifest.stats}
    for change in result.state_delta:
        if change.id not in values:
            continue
        values[change.id] = max(0, min(maximums[change.id], values[change.id] + change.delta))

    result.narrative = _clip(result.narrative, 280) or "The scene shifts, then settles."
    result.closing = _clip(result.closing, 180)
    ids = {entity.id for entity in manifest.entities}
    player = next((entity.id for entity in manifest.entities if entity.role == "player"), manifest.entities[0].id)
    if result.actor_id not in ids:
        result.actor_id = player
    if result.target_id not in ids:
        result.target_id = player
    result.next_actions = _actions(result.next_actions, "next", pad=False)

    forced = _threshold(manifest, values)
    if turn_index + 1 >= MAX_TURNS and forced is None and not result.game_over:
        forced = "draw"
    if forced is not None:
        result.game_over = True
        if result.outcome == "none":
            result.outcome = forced
    if result.game_over:
        if result.outcome == "none":
            result.outcome = forced or "draw"
        result.effect = "gameOver"
        if not result.closing:
            result.closing = manifest.win_text if result.outcome == "win" else manifest.lose_text if result.outcome == "lose" else result.narrative
        result.next_actions = []
    else:
        result.outcome = "none"
        result.closing = ""
        if len(result.next_actions) < 2:
            result.next_actions = list(actions)[:4] or list(_FALLBACK_ACTIONS)

    snapped = [StatSnap(id=stat.id, value=values.get(stat.id, stat.value)) for stat in manifest.stats]
    return snapped, result


def neutral_turn(actions: list[Action], actor: str) -> TurnResult:
    kept = list(actions)[:4] or list(_FALLBACK_ACTIONS)
    return TurnResult(
        narrative="Nothing lands. The scene waits for another try.",
        state_delta=[],
        effect="miss",
        actor_id=actor,
        target_id=actor,
        next_actions=kept,
        game_over=False,
        outcome="none",
        closing="",
    )


def _threshold(manifest: Manifest, values: dict[str, int]) -> str | None:
    for stat in manifest.stats:
        value = values.get(stat.id, stat.value)
        if stat.win_at >= 0 and value >= stat.win_at:
            return "win"
        if stat.lose_at >= 0 and value <= stat.lose_at:
            return "lose"
    return None


def _entities(entities: list[Entity]) -> list[Entity]:
    kept: list[Entity] = []
    used: set[str] = set()
    for index, entity in enumerate(entities[:5]):
        entity.name = _clip(entity.name, 40) or f"Figure {index + 1}"
        entity.id = _unique(_slug(entity.id, f"thing_{index + 1}"), used)
        entity.accessory = _accessory(entity.accessory)
        entity.x = _clamp(entity.x, 8, 92)
        entity.y = _clamp(entity.y, 18, 88)
        if entity.color not in _COLORS:
            entity.color = "ink"
        kept.append(entity)
    if not kept:
        kept.append(
            Entity(
                id="player",
                name="You",
                role="player",
                shape="figure",
                pose="idle",
                color="ink",
                size="medium",
                x=28,
                y=72,
                accessory="none",
            )
        )
    if not any(entity.role == "player" for entity in kept):
        kept[0].role = "player"
    return kept


def _stats(stats: list[Stat]) -> list[Stat]:
    kept: list[Stat] = []
    used: set[str] = set()
    for index, stat in enumerate(stats[:3]):
        stat.label = _clip(stat.label, 24) or "Score"
        stat.id = _unique(_slug(stat.id, f"stat_{index + 1}"), used)
        stat.maximum = max(1, min(999, int(stat.maximum)))
        stat.value = _clamp(int(stat.value), 0, stat.maximum)
        stat.win_at = int(stat.win_at)
        stat.lose_at = int(stat.lose_at)
        if stat.win_at >= 0:
            stat.win_at = _clamp(stat.win_at, 0, stat.maximum)
            if stat.win_at <= stat.value:
                stat.win_at = stat.maximum if stat.value < stat.maximum else -1
        if stat.lose_at >= 0:
            stat.lose_at = _clamp(stat.lose_at, 0, stat.maximum)
            if stat.lose_at >= stat.value:
                stat.lose_at = 0 if stat.value > 0 else -1
        kept.append(stat)
    if not kept:
        kept.append(Stat(id="progress", label="Progress", value=0, maximum=5, win_at=5, lose_at=-1))
    return kept


def _actions(actions: list[Action], prefix: str, pad: bool = True) -> list[Action]:
    kept: list[Action] = []
    used: set[str] = set()
    for index, action in enumerate(actions[:4]):
        action.label = _clip(action.label, 32) or f"Choice {index + 1}"
        action.hint = _clip(action.hint, 140) or action.label
        action.id = _unique(_slug(action.id, f"{prefix}_{index + 1}"), used)
        kept.append(action)
    if not pad or len(kept) >= 2:
        return kept
    for action in _FALLBACK_ACTIONS:
        if len(kept) >= 2:
            break
        if action.id in used:
            continue
        used.add(action.id)
        kept.append(action)
    return kept


_MOTIONS = {"still", "slide", "drag", "bounce", "chase"}
_PIECE_ROLES = {"player", "rival", "ball", "obstacle", "goal", "scenery"}
_PIECE_SHAPES = {"box", "circle", "line", "figure"}


def _play(play: PlaySpec) -> PlaySpec:
    kept: list[PlayPiece] = []
    used: set[str] = set()
    if play.score not in {"ball_exits", "reach_goal", "none"}:
        play.score = "none"
    for index, piece in enumerate(play.pieces[:8]):
        piece.motion = piece.motion if piece.motion in _MOTIONS else "still"
        piece.role = piece.role if piece.role in _PIECE_ROLES else "scenery"
        piece.shape = piece.shape if piece.shape in _PIECE_SHAPES else "box"
        piece.color = piece.color if piece.color in _COLORS else "ink"
        piece.name = _clip(piece.name, 24) or "Piece"
        piece.x = _clamp(int(piece.x), 0, 100)
        piece.y = _clamp(int(piece.y), 0, 100)
        piece.w = _clamp(int(piece.w), 2, 90)
        piece.h = _clamp(int(piece.h), 2, 90)
        piece.id = _unique(_slug(piece.id, f"piece_{index + 1}"), used)
        if piece.motion == "bounce" or piece.role == "ball":
            piece.role = "ball"
            piece.motion = "bounce"
            piece.solid = False
        if piece.role == "player" and piece.motion in {"chase", "still", "bounce"}:
            piece.motion = "drag" if play.score == "reach_goal" else "slide"
        if play.score == "reach_goal" and piece.role == "player":
            piece.motion = "drag"
        if play.score == "ball_exits" and piece.role == "player" and piece.motion == "drag":
            piece.motion = "slide"
        if piece.role == "rival" and piece.motion in {"slide", "drag", "still"}:
            piece.motion = "chase"
        if piece.role == "scenery":
            piece.motion = "still"
            piece.solid = False
        if piece.role == "goal" or piece.shape == "line":
            piece.solid = False
        kept.append(piece)
    play.pieces = kept
    play.hint = _clip(play.hint, 90)
    play.win_score = _clamp(int(play.win_score or 1), 1, 9)
    play.enabled = _playable(play)
    return play


def _playable(play: PlaySpec) -> bool:
    if not play.enabled:
        return False
    motions = {piece.motion for piece in play.pieces}
    roles = {piece.role for piece in play.pieces}
    if play.score == "ball_exits":
        return "bounce" in motions and bool(motions & {"slide", "drag"})
    if play.score == "reach_goal":
        return "goal" in roles and bool(motions & {"slide", "drag"})
    return False


def _accessory(value: str) -> str:
    word = _clip(value, 24).lower()
    for name in ("hat", "sword", "crown", "bag", "shield", "wings"):
        if name in word:
            return name
    return "none"


def _slug(value: str, fallback: str) -> str:
    cleaned = "".join(ch if ch.isalnum() else "_" for ch in value.lower()).strip("_")
    return (cleaned or fallback)[:24]


def _unique(value: str, used: set[str]) -> str:
    candidate = value
    number = 2
    while candidate in used:
        candidate = f"{value[:20]}_{number}"
        number += 1
    used.add(candidate)
    return candidate


def _clip(value: str, limit: int) -> str:
    return " ".join(value.split())[:limit]


def _clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, int(value)))
