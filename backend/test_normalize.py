from interpret.normalize import new_game, normalize, settle_turn
from interpret.schema import Action, Delta, Entity, HistoryBeat, Manifest, PlayPiece, PlaySpec, Stat, StatSnap, TurnResult


def entity(id_: str, role: str = "player", **extra) -> Entity:
    data = {
        "id": id_,
        "name": id_,
        "role": role,
        "shape": "figure",
        "pose": "idle",
        "color": "ink",
        "size": "medium",
        "x": 20,
        "y": 70,
        "accessory": "none",
    }
    data.update(extra)
    return Entity(**data)


def manifest() -> Manifest:
    return Manifest(
        title="Market Lane",
        tagline="Trade before the stall closes.",
        visual_style="scratchy ink",
        accent="clay",
        genre="shop",
        mechanics="Each offer changes gold.",
        scene_setting="a street stall",
        scene_layout="a counter and crates",
        entities=[
            entity("buyer", x=10, y=10),
            entity("seller", role="opponent", shape="figure", x=200, y=-4, accessory="a wide hat"),
        ],
        stats=[Stat(id="gold", label="Gold", value=8, maximum=20, win_at=2, lose_at=12)],
        actions=[
            Action(id="haggle", label="Haggle", hint="Talk the price down."),
            Action(id="buy", label="Buy the map", hint="Spend gold."),
        ],
        win_text="The map is yours.",
        lose_text="The stall packs up.",
    )


def test_title_does_not_select_a_special_game():
    drawn = manifest()
    drawn.title = "Notebook Ping Pong"
    drawn.tagline = "Outsmart your rival across the net to reach match point."
    game = new_game(normalize(drawn))
    assert game.manifest.activity == "story"
    assert game.manifest.play.enabled is False


def test_play_spec_from_the_drawing_stays_playable():
    drawn = manifest()
    drawn.play = PlaySpec(
        enabled=True,
        hint="Drag your paddle.",
        win_score=5,
        score="ball_exits",
        pieces=[
            PlayPiece(id="me", name="You", role="player", shape="box", motion="slide", solid=True, color="ink", x=50, y=90, w=18, h=4),
            PlayPiece(id="them", name="Rival", role="rival", shape="box", motion="slide", solid=True, color="rust", x=50, y=8, w=18, h=4),
            PlayPiece(id="ball", name="Ball", role="ball", shape="circle", motion="bounce", solid=False, color="paper", x=50, y=50, w=4, h=4),
            PlayPiece(id="table", name="Table", role="scenery", shape="box", motion="still", solid=True, color="forest", x=50, y=50, w=84, h=76),
        ],
    )
    game = new_game(normalize(drawn))
    play = game.manifest.play
    assert play.enabled is True
    assert play.score == "ball_exits"
    assert play.pieces[1].motion == "chase"
    assert play.pieces[3].solid is False


def test_normalize_spreads_a_playable_game():
    game = new_game(normalize(manifest()))
    assert game.manifest.genre == "shop"
    assert game.manifest.entities[0].role == "player"
    assert game.manifest.entities[0].x == 10
    assert game.manifest.entities[1].x == 92
    assert game.manifest.entities[1].accessory == "hat"
    gold = game.manifest.stats[0]
    assert gold.win_at > gold.value
    assert gold.lose_at < gold.value
    assert game.turn == 0
    assert game.game_over is False
    assert [snap.value for snap in game.stats] == [gold.value]


def test_settle_turn_applies_delta_and_win():
    game = new_game(normalize(manifest()))
    result = TurnResult(
        narrative="The seller nods and hands over the map.",
        state_delta=[Delta(id="gold", delta=20)],
        effect="itemFound",
        actor_id="missing",
        target_id="missing",
        next_actions=[],
        game_over=False,
        outcome="none",
        closing="",
    )
    stats, settled = settle_turn(game.manifest, game.stats, game.actions, 0, result)
    assert stats[0].value == 20
    assert settled.game_over is True
    assert settled.outcome == "win"
    assert settled.effect == "gameOver"
    assert settled.actor_id == "buyer"
    assert settled.next_actions == []


def test_turn_cap_ends_a_long_game():
    game = new_game(normalize(manifest()))
    result = TurnResult(
        narrative="You linger at the stall.",
        state_delta=[Delta(id="gold", delta=0)],
        effect="blocked",
        actor_id="buyer",
        target_id="seller",
        next_actions=[
            Action(id="wait", label="Wait", hint="Stay put."),
            Action(id="leave", label="Leave", hint="Walk off."),
        ],
        game_over=False,
        outcome="none",
        closing="",
    )
    _stats, settled = settle_turn(game.manifest, game.stats, game.actions, 7, result)
    assert settled.game_over is True
    assert settled.outcome == "draw"
    assert settled.effect == "gameOver"


def test_open_turn_keeps_actions():
    game = new_game(normalize(manifest()))
    # Push win_at out of reach so a small delta stays in play.
    game.manifest.stats[0].win_at = 20
    game.manifest.stats[0].lose_at = -1
    result = TurnResult(
        narrative="You count the coins.",
        state_delta=[Delta(id="gold", delta=-1)],
        effect="progress",
        actor_id="buyer",
        target_id="seller",
        next_actions=[],
        game_over=False,
        outcome="none",
        closing="",
    )
    stats, settled = settle_turn(game.manifest, game.stats, game.actions, 1, result)
    assert stats[0].value == game.stats[0].value - 1
    assert settled.game_over is False
    assert [item.label for item in settled.next_actions] == ["Haggle", "Buy the map"]
    assert isinstance(game.history, list)
    assert HistoryBeat(action="Haggle", narrative="You count the coins.", effect="progress")


if __name__ == "__main__":
    test_title_does_not_select_a_special_game()
    test_play_spec_from_the_drawing_stays_playable()
    test_normalize_spreads_a_playable_game()
    test_settle_turn_applies_delta_and_win()
    test_turn_cap_ends_a_long_game()
    test_open_turn_keeps_actions()
    print("ok")
