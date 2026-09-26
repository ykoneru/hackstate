import json
import os

from fastapi import HTTPException
from pydantic import BaseModel, ValidationError

from interpret.catalog import SketchPick, design_prompt, game_save
from interpret.normalize import neutral_turn, settle_turn
from interpret.prompt import turn_prompt
from interpret.schema import Action, GameSave, TurnRequest, TurnResult


def read_sketch(raw: bytes, mime: str, api_key: str) -> GameSave:
    from google.genai import types

    client = _client(api_key)
    image = types.Part.from_bytes(data=raw, mime_type=mime)
    prompt = design_prompt()
    try:
        pick = _complete(client, [image, prompt], SketchPick, temperature=0.2)
    except (ValidationError, HTTPException, ValueError):
        try:
            pick = _complete(client, [image, prompt, "Return one id from the list."], SketchPick, temperature=0.2)
        except (ValidationError, HTTPException, ValueError):
            pick = SketchPick(game_id="ping_pong")
    return game_save(pick.game_id)


def play_turn(request: TurnRequest, api_key: str) -> tuple[list, TurnResult]:
    client = _client(api_key)
    action = next((item for item in request.actions if item.id == request.action_id), None)
    if action is None:
        action = request.actions[0] if request.actions else Action(id="look", label="Look closer", hint="Study the scene.")
    brief = json.dumps(
        {
            "turn": request.turn + 1,
            "manifest": request.manifest.model_dump(),
            "stats": [snap.model_dump() for snap in request.stats],
            "recent": [beat.model_dump() for beat in request.history[-6:]],
            "action": action.model_dump(),
        }
    )
    actor = next((entity.id for entity in request.manifest.entities if entity.role == "player"), "player")
    prompt = turn_prompt(brief)
    try:
        result = _complete(client, [prompt], TurnResult)
    except (ValidationError, HTTPException, ValueError):
        try:
            result = _complete(
                client,
                [prompt, "That reply did not match the schema. Return one turn object with every required field."],
                TurnResult,
            )
        except (ValidationError, HTTPException, ValueError):
            result = neutral_turn(request.actions, actor)
    stats, settled = settle_turn(request.manifest, request.stats, request.actions, request.turn, result)
    return stats, settled


def _client(api_key: str):
    from google import genai

    flags = (
        os.environ.get("GEMINI_VERTEX", ""),
        os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", ""),
    )
    use_vertex = any(flag.strip().lower() in {"1", "true", "yes"} for flag in flags)
    if use_vertex:
        return genai.Client(vertexai=True, api_key=api_key)
    return genai.Client(api_key=api_key)


def _complete(client, contents: list, schema: type[BaseModel], temperature: float = 0.7) -> BaseModel:
    from google.genai import types

    model = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            temperature=temperature,
            response_mime_type="application/json",
            response_schema=schema,
        ),
    )
    text = (response.text or "").strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    if not text:
        raise HTTPException(502, "Gemini returned an empty response. Try that again.")
    try:
        return schema.model_validate_json(text)
    except ValidationError as exc:
        raise HTTPException(502, "The reply came back in an unexpected shape.") from exc
