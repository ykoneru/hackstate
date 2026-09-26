import os
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from interpret import play_turn, read_sketch
from interpret.schema import TurnRequest
from share import router as share_router

ROOT = Path(__file__).resolve().parents[1]
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 8 * 1024 * 1024


def load_env() -> None:
    for path in (ROOT / ".env", Path(__file__).resolve().parent / ".env"):
        if not path.exists():
            continue
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env()

app = FastAPI(title="Napkin")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["*"],
)
app.include_router(share_router)


@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "model": os.environ.get("GEMINI_MODEL", "gemini-3.8-flash"),
        "has_key": bool(os.environ.get("GEMINI_API_KEY")),
    }


@app.post("/api/screen")
async def screen(file: UploadFile = File(...)) -> dict:
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "Take a photo of the paper sketch.")
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "That photo is too large. Use one under 8MB.")

    mime = (file.content_type or "").split(";")[0].strip().lower()
    if mime not in ALLOWED_TYPES:
        raise HTTPException(400, "Use a JPEG, PNG, or WebP photo of the paper.")

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(500, "Add GEMINI_API_KEY to the .env file in the project root.")

    try:
        parsed = read_sketch(raw, mime, api_key)
    except HTTPException:
        raise
    except Exception as exc:
        raise _gemini_http(exc) from exc

    return parsed.model_dump()


@app.post("/api/turn")
def turn(body: TurnRequest) -> dict:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(500, "Add GEMINI_API_KEY to the .env file in the project root.")
    try:
        stats, result = play_turn(body, api_key)
    except HTTPException:
        raise
    except Exception as exc:
        raise _gemini_http(exc) from exc
    return {"stats": [snap.model_dump() for snap in stats], "result": result.model_dump()}


def _gemini_http(exc: Exception) -> HTTPException:
    message = str(exc)
    if "429" in message or "RESOURCE_EXHAUSTED" in message:
        return HTTPException(429, "Gemini rate limit. Wait a few seconds and try again.")
    if "API_KEY_SERVICE_BLOCKED" in message or "PERMISSION_DENIED" in message:
        return HTTPException(
            403,
            "This Gemini key is blocked. Use a key from a project with no billing, or add credits to the Prepay account.",
        )
    return HTTPException(502, "Gemini could not keep the game going. Try that action again.")
