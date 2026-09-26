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
    },
    {
      kind: "field",
      title: "Name",
      body: "",
      placeholder: "Who is this for?",
      choice_mode: "none",
      items: [],
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
    },
    {
      kind: "button",
      title: "Place order",
      body: "",
      placeholder: "",
      choice_mode: "none",
      items: [],
    },
  ],
  success_title: "You're on the list",
  success_body: "We'll call the name when it's ready.",
};
