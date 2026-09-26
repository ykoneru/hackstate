from interpret.schema import Block, ListItem, Screen


def normalize(screen: Screen) -> Screen:
    blocks: list[Block] = []
    seen_header = False

    for block in screen.blocks:
        block.title = _clip(block.title, 80)
        block.body = _clip(block.body, 240)
        block.placeholder = _clip(block.placeholder, 80)
        block.items = [
            ListItem(title=_clip(item.title, 60), detail=_clip(item.detail, 80))
            for item in block.items
            if item.title.strip()
        ][:6]

        if block.kind == "header":
            if seen_header:
                block.kind = "text"
                if not block.body:
                    block.body = block.title
            seen_header = True

        if block.kind == "choices":
            if block.choice_mode == "none":
                block.choice_mode = "one"
            if not block.items:
                continue
        else:
            block.choice_mode = "none"
            block.items = []

        if block.kind == "button" and not block.title:
            block.title = "Continue"
        if block.kind == "field" and not block.title:
            block.title = "Note"
        if block.kind in {"header", "text"} and not block.title and not block.body:
            continue
        if block.kind == "text" and not block.body:
            block.body = block.title

        blocks.append(block)

    content = [block for block in blocks if block.kind != "button"][:6]
    button = next((block for block in blocks if block.kind == "button"), None)
    if button is None:
        button = Block(
            kind="button",
            title="Continue",
            body="",
            placeholder="",
            choice_mode="none",
            items=[],
        )
    screen.blocks = content + [button]
    screen.app_name = _clip(screen.app_name, 40) or "Sketch"
    screen.success_title = _clip(screen.success_title, 80) or "Done"
    screen.success_body = _clip(screen.success_body, 180) or "That's saved on this screen."
    return screen


def _clip(value: str, limit: int) -> str:
    return " ".join(value.split())[:limit]
