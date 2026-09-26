from typing import Literal

from pydantic import BaseModel, Field


class ListItem(BaseModel):
    title: str = Field(description="Option label copied from the paper.")
    detail: str = Field(description="Shorter second line. Empty string if the paper has none.")


class Block(BaseModel):
    kind: Literal["header", "text", "field", "choices", "button", "image", "toggle"] = Field(
        description="header, text, field, choices, button, image, or toggle."
    )
    title: str = Field(description="Heading, field label, list title, or button label.")
    body: str = Field(description="Supporting sentence. Empty string when unused.")
    placeholder: str = Field(description="Hint inside a field. Empty string unless kind is field.")
    choice_mode: Literal["one", "many", "none"] = Field(
        description="one or many for choices. none for every other kind."
    )
    items: list[ListItem] = Field(description="Options for choices. Empty list otherwise.")
    box: list[float] = Field(
        description="Where this block is drawn on the photo: [ymin, xmin, ymax, xmax] on a 0-1000 scale."
    )


class Screen(BaseModel):
    app_name: str = Field(description="Short name of the app, taken from the drawing's title.")
    accent: Literal["ink", "forest", "clay", "sea"]
    blocks: list[Block]
    success_title: str = Field(description="Heading shown after the button is tapped.")
    success_body: str = Field(description="One sentence shown after the button is tapped.")
