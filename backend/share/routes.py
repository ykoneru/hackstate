import json
import os
import secrets
import threading
from pathlib import Path

from fastapi import APIRouter, HTTPException

from interpret.schema import GameSave

STORE = Path(__file__).resolve().parent / "screens.json"
LIMIT = 500

router = APIRouter()
_lock = threading.Lock()


def _load() -> dict:
    try:
        data = json.loads(STORE.read_text())
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


_screens = _load()


@router.post("/api/share")
def share(game: GameSave) -> dict:
    with _lock:
        share_id = secrets.token_urlsafe(5)
        while share_id in _screens:
            share_id = secrets.token_urlsafe(5)
        _screens[share_id] = game.model_dump()
        _persist()

    # Phones cannot reach 127.0.0.1. PUBLIC_URL is the tunnel or LAN address that serves the frontend.
    public = os.environ.get("PUBLIC_URL", "").strip().rstrip("/")
    return {"id": share_id, "url": f"{public}/s/{share_id}" if public else ""}


@router.put("/api/share/{share_id}")
def update_share(share_id: str, game: GameSave) -> dict:
    with _lock:
        if share_id not in _screens:
            raise HTTPException(404, "This game link has expired. Make the game again on the laptop.")
        _screens[share_id] = game.model_dump()
        _persist()
    return {"ok": True}


@router.get("/api/share/{share_id}")
def shared(share_id: str) -> dict:
    game = _screens.get(share_id)
    if game is None:
        raise HTTPException(404, "This game link has expired. Make the game again on the laptop.")
    return game


def _persist() -> None:
    while len(_screens) > LIMIT:
        _screens.pop(next(iter(_screens)))
    try:
        STORE.write_text(json.dumps(_screens))
    except OSError:
        pass  # Links still work until the backend restarts.
