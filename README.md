# Napkin

https://www.mlh.com/projects/01a0deb9-a659-218f-1511-39cec8d23565/invites/view/8oQZwHWK90xIAJpQwwMNwOBxvB4xw37ct9dorBjW8UU

Drawing an app on paper. Take a photo of that page. Gemini reads the ink and the page becomes a screen you can tap.

There is no drawing tool on the laptop. The only input is a photograph of real paper.

## Three branches

The sections meet at one JSON object, `Screen`, defined in `frontend/src/contract.ts` and `backend/interpret/schema.py`. Change that contract together. After that, stay in your own folder.

| Branch | Who | Edit only | Job |
| --- | --- | --- | --- |
| `capture` | Person 1 | `frontend/src/capture/` | Camera and photo of the paper |
| `interpret` | Person 2 | `backend/interpret/` and `frontend/src/interpret/` | Send the photo to Gemini, return `Screen` JSON |
| `render` | Person 3 | `frontend/src/render/` | Turn `Screen` JSON into the tappable phone |

`frontend/src/App.tsx` only connects the three. Leave it alone unless the handoff between sections changes.

```bash
git checkout capture
git checkout interpret
git checkout render
```

When your section is ready:

```bash
git checkout main
git merge capture
```

Do the same for `interpret` and `render`. The folders do not overlap, so those merges should be clean.

Person 3 can build the phone against `frontend/src/render/fixture.ts` without a camera or an API key. That file is sample JSON, not a drawing surface. Do not put it on the demo path.

## Run

```bash
cp .env.example .env
# put your Gemini API key in .env
# if Google says API_KEY_SERVICE_BLOCKED, it is an Agent Platform key: set GOOGLE_GENAI_USE_VERTEXAI=true

cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python test_normalize.py
uvicorn main:app --reload --port 8000
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173

## Try it on a phone

After Make the app, press Try it on your phone and scan the QR code. A phone can't reach `127.0.0.1`, so run a tunnel first:

```bash
brew install cloudflared
cloudflared tunnel --url http://127.0.0.1:5173
```

Open Napkin at the https address it prints, and the QR code will use that address. Or put the address in `.env` as `PUBLIC_URL` and restart the backend.

## Demo

Draw one screen on paper with a thick marker: a title, one text box, a short list, one button. Print the letters. Point the camera at the page and press Space. Hands off the paper before the 3 second countdown ends. Press Make the app, then tap the button.
