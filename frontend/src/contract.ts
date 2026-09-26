export type Accent = "ink" | "forest" | "clay" | "sea";

export type ListItem = {
  title: string;
  detail: string;
};

export type Block = {
  kind: "header" | "text" | "field" | "choices" | "button";
  title: string;
  body: string;
  placeholder: string;
  choice_mode: "one" | "many" | "none";
  items: ListItem[];
};

export type Screen = {
  app_name: string;
  accent: Accent;
  blocks: Block[];
  success_title: string;
  success_body: string;
};
