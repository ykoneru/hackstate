export type Accent = "ink" | "forest" | "clay" | "sea";

export type ListItem = {
  title: string;
  detail: string;
};

export type Block = {
  kind: "header" | "text" | "field" | "choices" | "button" | "image" | "toggle";
  title: string;
  body: string;
  placeholder: string;
  choice_mode: "one" | "many" | "none";
  items: ListItem[];
  // Where the block is drawn on the photo: [ymin, xmin, ymax, xmax] on a 0-1000 scale, or [] when unknown.
  box: number[];
};

export type Screen = {
  app_name: string;
  accent: Accent;
  blocks: Block[];
  success_title: string;
  success_body: string;
};
