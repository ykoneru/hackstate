import { useState } from "react";
import type { Block, Screen } from "../contract";
import "./phone.css";

type PhoneProps = {
  screen: Screen | null;
};

export function Phone({ screen }: PhoneProps) {
  if (!screen) {
    return (
      <div className="device">
        <div className="device-screen waiting">
          <p>Take a photo of the paper. The app lands here.</p>
        </div>
      </div>
    );
  }

  return <LiveScreen screen={screen} />;
}

function LiveScreen({ screen }: { screen: Screen }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState(false);

  const header = screen.blocks.find((block) => block.kind === "header");
  const button = screen.blocks.find((block) => block.kind === "button");
  const body = screen.blocks.filter((block) => block.kind !== "header" && block.kind !== "button");
  const showName = !header || header.title.trim().toLowerCase() !== screen.app_name.trim().toLowerCase();
  const receipt = receiptLines(body, values, picked);

  function toggle(blockIndex: number, title: string, mode: Block["choice_mode"]) {
    const key = String(blockIndex);
    setPicked((current) => {
      const existing = current[key] ?? [];
      if (mode === "one") {
        return { ...current, [key]: existing[0] === title ? [] : [title] };
      }
      const next = existing.includes(title) ? existing.filter((item) => item !== title) : [...existing, title];
      return { ...current, [key]: next };
    });
  }

  return (
    <div className="device">
      <div className="device-screen" data-accent={screen.accent}>
        {done ? (
          <div className="success">
            <span className="check" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M5 12.5 9.2 17 19 7" />
              </svg>
            </span>
            <h2>{screen.success_title}</h2>
            <p>{screen.success_body}</p>
            {receipt.length > 0 && (
              <ul className="receipt">
                {receipt.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            <button type="button" className="app-button ghost" onClick={() => setDone(false)}>
              Back
            </button>
          </div>
        ) : (
          <>
            <div className="app-scroll">
              <div className="app-top">
                <span className="mark">{screen.app_name.slice(0, 1).toUpperCase()}</span>
                {showName && <span>{screen.app_name}</span>}
              </div>
              {header && (
                <div className="hero">
                  <h2>{header.title}</h2>
                  {header.body && <p>{header.body}</p>}
                </div>
              )}
              {body.map((block, index) => {
                if (block.kind === "text") {
                  return (
                    <p className="copy" key={index}>
                      {block.body || block.title}
                    </p>
                  );
                }
                if (block.kind === "field") {
                  return (
                    <label className="field" key={index}>
                      <span>{block.title}</span>
                      <input
                        value={values[index] ?? ""}
                        placeholder={block.placeholder}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, [index]: event.target.value }))
                        }
                      />
                    </label>
                  );
                }
                if (block.kind === "choices") {
                  const selected = picked[index] ?? [];
                  return (
                    <fieldset className="choices" key={index}>
                      <legend>{block.title}</legend>
                      {block.items.map((item) => {
                        const on = selected.includes(item.title);
                        return (
                          <button
                            type="button"
                            key={item.title}
                            className={on ? "choice on" : "choice"}
                            aria-pressed={on}
                            onClick={() => toggle(index, item.title, block.choice_mode)}
                          >
                            <span>{item.title}</span>
                            {item.detail && <small>{item.detail}</small>}
                          </button>
                        );
                      })}
                    </fieldset>
                  );
                }
                return null;
              })}
            </div>
            {button && (
              <div className="app-action">
                <button type="button" className="app-button" onClick={() => setDone(true)}>
                  {button.title}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function receiptLines(
  blocks: Block[],
  values: Record<string, string>,
  picked: Record<string, string[]>,
): string[] {
  const lines: string[] = [];
  blocks.forEach((block, index) => {
    if (block.kind === "field" && values[index]?.trim()) {
      lines.push(`${block.title}: ${values[index].trim()}`);
    }
    if (block.kind === "choices" && (picked[index]?.length ?? 0) > 0) {
      lines.push(`${block.title}: ${picked[index].join(", ")}`);
    }
  });
  return lines;
}
