# Hackathon plan

The pipeline works end to end: photo, Gemini, then a screen you can tap. What's left is making the live demo reliable and giving the judges a few moments they'll remember. The demo is slow (about 20 seconds) and depends on venue wifi and a laptop camera.

Folder ownership stays the same as in the README, so the three branches still merge cleanly.

## Step 0: together on `main`, before branching

- [x] Fix the setup bugs. `backend/main.py` now runs on the macOS system Python 3.9, and Vite listens on `127.0.0.1:5173` to match the README.
- [x] Agree on contract v2 once. Change `frontend/src/contract.ts` and `backend/interpret/schema.py` together, then leave them alone:
  - `box: [ymin, xmin, ymax, xmax]` on every block: where it sits on the photo, on Gemini's 0–1000 scale.
  - Two new block kinds: `image` (a drawn box with an X through it) and `toggle` (a drawn on/off switch).
  - New `accent` values only if Person 3 wants them.
- [x] Branch `capture`, `interpret` and `render` from that commit.

## Person 1: `capture` (and sharing)

**Done on `capture`.** Everything below works and was tested in headless Chrome, including an emulated iPhone for the QR page. For Person 3: `App.tsx` already holds `activeBlock` and `setActiveBlock`. Pass them to `Phone` to finish "Link the ink to the app".

Must:

- **Camera picker.** `facingMode: "environment"` picks the FaceTime camera on a laptop. Let the demoer choose an iPhone through Continuity Camera, or a document camera pointed down at the desk. This matters most on stage.
- **Spacebar to take the photo**, plus a 3-second countdown so hands are out of the frame.
- **Recent sheets strip.** Save each real photo and its result in `localStorage`. If the wifi dies, replay a real earlier result, not the fixture.

Should:

- **"Try it on your phone" QR code.** Save the screen in the backend under a short ID and serve a full-screen page for it. Judges scan it and tap the app on their own phones. Work in new folders, `backend/share/` and `frontend/src/share/`. Venue wifi often blocks phones from reaching a laptop, so test with a tunnel such as `cloudflared` early.
- **Clean up the photo** before upload: grayscale, a contrast boost, and cropping to the paper. This helps both how well Gemini reads it and how fast.
- **Draw the highlight on the photo** for the block Person 3's phone reports as hovered (see "Link the ink to the app" below).

## Person 2: `interpret`

Must:

- **Test set.** Photograph 10–15 real sketches with different handwriting, lighting and angles. Add a script that runs them all and shows the results side by side. Check every prompt or model change against it.
- **Speed.** Measure the time for each photo across models and thinking settings (e.g. flash vs. flash-lite, lowest thinking budget). Pick the fastest one that still passes the test set. Getting from 20s down to about 8s changes how the demo feels.
- **Retry once** on 5xx errors and bad JSON before showing an error.
- **Log the real error.** `main.py` turns every Gemini exception into "Gemini could not read that paper" and logs nothing, so a rate limit, an outage and a bad photo look the same. Our key also hits `429 RESOURCE_EXHAUSTED` after a few quick calls. Check its quota before the demo.

Should:

- **Return `box` coordinates** for each block, and teach the prompt the `image` and `toggle` kinds.
- **Streaming.** Send the header first so the phone starts filling in while the rest loads. It hides the wait and looks great on stage.

## Person 3: `render`

Must:

- **Render the new `image` and `toggle` blocks**, plus visual polish: a device frame, spacing and colors for all four accents.
- **Build animation.** Blocks slide in one by one when the screen arrives. The reveal is the moment judges remember.

Should:

- **Link the ink to the app.** Hovering a block in the phone highlights its `box` on the photo, and hovering the photo highlights the block. This shows Gemini actually read the paper. It needs one small change in `App.tsx` to pass the hovered index between the two sides.
- **"Download the app" button** that exports a single standalone HTML file of the screen. "Your napkin is now real code" is a strong line for the pitch.

## Checkpoints

- Merge to `main` about every 3 hours. After each merge, everyone runs the full flow.
- Feature freeze about 3 hours before judging. After that, only fixes and rehearsal.
- Last 2 hours, everyone:
  - Draw 3 demo sketches in thick marker that pass the test set.
  - Record a backup video of a clean run.
  - Rehearse the pitch: draw it, take the photo, watch it build, scan the QR code, tap it on a judge's phone.

## Skip for now

Multi-screen apps (arrows between pages). They multiply the ways Gemini can fail and the wait time, and they force a second contract change halfway through. Pitch it as "what's next" instead.
