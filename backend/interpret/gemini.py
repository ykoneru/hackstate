import os

from fastapi import HTTPException
from pydantic import ValidationError

from interpret.normalize import normalize
from interpret.prompt import PROMPT
from interpret.schema import Screen


def read_sketch(raw: bytes, mime: str, api_key: str) -> Screen:
    from google import genai
    from google.genai import types

    model = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
    client = genai.Client(api_key=api_key)
    image = types.Part.from_bytes(data=raw, mime_type=mime)
    response = client.models.generate_content(
        model=model,
        contents=[image, PROMPT],
        config=types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json",
            response_schema=Screen,
        ),
    )
    text = (response.text or "").strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    if not text:
        raise HTTPException(502, "Gemini returned an empty response. Take the photo again.")
    try:
        parsed = Screen.model_validate_json(text)
    except ValidationError as exc:
        raise HTTPException(502, "The paper came back in an unexpected shape. Retake it with larger letters.") from exc
    return normalize(parsed)
