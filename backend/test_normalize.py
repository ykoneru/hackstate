from interpret.normalize import normalize
from interpret.schema import Block, ListItem, Screen


def block(kind: str, title: str, **extra) -> Block:
    data = {
        "kind": kind,
        "title": title,
        "body": "",
        "placeholder": "",
        "choice_mode": "none",
        "items": [],
    }
    data.update(extra)
    return Block(**data)


def test_button_moves_to_the_end():
    screen = normalize(
        Screen(
            app_name="Luna",
            accent="clay",
            blocks=[
                block("button", "Place order"),
                block("header", "Luna Coffee", body="Order for pickup"),
            ],
            success_title="You're on the list",
            success_body="We'll call the name when it's ready.",
        )
    )
    assert [item.kind for item in screen.blocks] == ["header", "button"]


def test_missing_button_is_added():
    screen = normalize(
        Screen(
            app_name="Notes",
            accent="ink",
            blocks=[block("field", "Title", placeholder="Untitled")],
            success_title="",
            success_body="",
        )
    )
    assert screen.blocks[-1].kind == "button"
    assert screen.blocks[-1].title == "Continue"
    assert screen.success_title == "Done"


def test_second_header_becomes_text():
    screen = normalize(
        Screen(
            app_name="Trail",
            accent="forest",
            blocks=[
                block("header", "Trail"),
                block("header", "Bring water"),
                block("button", "Start"),
            ],
            success_title="On your way",
            success_body="Stay on the marked path.",
        )
    )
    assert screen.blocks[1].kind == "text"
    assert screen.blocks[1].body == "Bring water"


def test_choices_drop_blank_items():
    screen = normalize(
        Screen(
            app_name="Menu",
            accent="clay",
            blocks=[
                block(
                    "choices",
                    "Drink",
                    choice_mode="none",
                    items=[
                        ListItem(title="Oat latte", detail=""),
                        ListItem(title="  ", detail=""),
                    ],
                )
            ],
            success_title="Saved",
            success_body="See you soon.",
        )
    )
    choices = screen.blocks[0]
    assert choices.kind == "choices"
    assert choices.choice_mode == "one"
    assert [item.title for item in choices.items] == ["Oat latte"]


if __name__ == "__main__":
    test_button_moves_to_the_end()
    test_missing_button_is_added()
    test_second_header_becomes_text()
    test_choices_drop_blank_items()
    print("ok")
