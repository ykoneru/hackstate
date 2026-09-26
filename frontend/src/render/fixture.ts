import type { GameSave } from "../contract";

// A sample used to reason about the phone. The live path is a photo, not this object.
export const fixtureGame: GameSave = {
  manifest: {
    title: "Stickman Duel",
    tagline: "Two ink figures, one page.",
    visual_style: "scratchy notebook ink, high contrast",
    accent: "ink",
    genre: "duel",
    mechanics: "Each strike changes health until one figure drops.",
    scene_setting: "an empty notebook margin",
    scene_layout: "open ground",
    entities: [
      { id: "left", name: "Left", role: "player", shape: "figure", pose: "ready", color: "ink", size: "medium", x: 28, y: 70, accessory: "sword" },
      { id: "right", name: "Right", role: "opponent", shape: "figure", pose: "ready", color: "rust", size: "medium", x: 72, y: 70, accessory: "hat" },
    ],
    stats: [{ id: "health", label: "Health", value: 6, maximum: 6, win_at: -1, lose_at: 0 }],
    actions: [
      { id: "jab", label: "Jab", hint: "A short strike." },
      { id: "feint", label: "Feint", hint: "Sell a fake." },
      { id: "guard", label: "Guard", hint: "Catch the next blow." },
    ],
    win_text: "The other figure sits down.",
    lose_text: "You end up in the margin.",
  },
  stats: [{ id: "health", value: 6 }],
  history: [],
  actions: [
    { id: "jab", label: "Jab", hint: "A short strike." },
    { id: "feint", label: "Feint", hint: "Sell a fake." },
    { id: "guard", label: "Guard", hint: "Catch the next blow." },
  ],
  game_over: false,
  outcome: "none",
  closing: "",
  turn: 0,
};
