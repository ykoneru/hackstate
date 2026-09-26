from interpret.catalog import GAMES, resolve_game


def test_catalog_has_one_hundred_games():
    assert len(GAMES) == 100
    assert len({game["id"] for game in GAMES}) == 100
    assert len({game["engine"] for game in GAMES}) == 100
    assert all(game["engine"] == game["id"] for game in GAMES)


def test_known_drawing_names_resolve():
    assert resolve_game("ping_pong")["id"] == "ping_pong"
    assert resolve_game("Ping Pong")["id"] == "ping_pong"
    assert resolve_game("flappy bird")["id"] == "flappy_bird"
    for name in ("table tennis", "tennis", "air hockey", "pong", "badminton"):
        assert resolve_game(name)["id"] == "ping_pong"


def test_every_game_has_a_player():
    from pathlib import Path

    root = Path(__file__).resolve().parents[1] / "frontend" / "src" / "render"
    text = "\n".join(path.read_text() for path in root.glob("*.tsx"))
    missing = [game["id"] for game in GAMES if f"{game['id']}:" not in text]
    assert missing == []


def test_unknown_drawing_still_picks_a_game():
    picked = resolve_game("scribble that is not a game")
    assert picked["id"] in {game["id"] for game in GAMES}


if __name__ == "__main__":
    test_catalog_has_one_hundred_games()
    test_known_drawing_names_resolve()
    test_every_game_has_a_player()
    test_unknown_drawing_still_picks_a_game()
    print("ok")
