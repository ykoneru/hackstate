import type { Screen } from "../contract";

export const fixtureScreen: Screen = {
  app_name: "Luna Coffee",
  accent: "clay",
  blocks: [
    {
      kind: "header",
      title: "Luna Coffee",
      body: "Order for pickup",
      placeholder: "",
      choice_mode: "none",
      items: [],
      box: [40, 90, 150, 910],
    },
    {
      kind: "field",
      title: "Name",
      body: "",
      placeholder: "Who is this for?",
      choice_mode: "none",
      items: [],
      box: [190, 90, 330, 910],
    },
    {
      kind: "choices",
      title: "Drink",
      body: "",
      placeholder: "",
      choice_mode: "one",
      items: [
        { title: "Oat latte", detail: "" },
        { title: "Drip", detail: "" },
        { title: "Tea", detail: "" },
      ],
      box: [370, 90, 640, 910],
    },
    {
      kind: "button",
      title: "Place order",
      body: "",
      placeholder: "",
      choice_mode: "none",
      items: [],
      box: [760, 250, 850, 750],
    },
  ],
  success_title: "You're on the list",
  success_body: "We'll call the name when it's ready.",
};
