# Napkin

Draw an app on paper. Take a photo of that page. Gemini reads the ink and the page becomes a screen you can tap.

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

## Demo

Draw one screen on paper with a thick marker: a title, one text box, a short list, one button. Print the letters. Point the camera at the page, take the photo, press Make the app, then tap the button.
