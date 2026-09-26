import { clearSheets, useSheets, type Sheet } from "./sheets";

type RecentSheetsProps = {
  disabled: boolean;
  onPick: (sheet: Sheet) => void;
};

export function RecentSheets({ disabled, onPick }: RecentSheetsProps) {
  const sheets = useSheets();
  if (!sheets.length) return null;

  return (
    <section className="recent" aria-label="Recent sheets">
      <div className="recent-head">
        <p>Recent sheets</p>
        <button type="button" className="link" disabled={disabled} onClick={clearSheets}>
          Clear
        </button>
      </div>
      <div className="recent-strip">
        {sheets.map((sheet) => (
          <button
            type="button"
            key={sheet.id}
            className="sheet"
            disabled={disabled}
            onClick={() => onPick(sheet)}
            title={`Show ${sheet.game.manifest.title} again`}
          >
            <img src={sheet.photo} alt="" />
            <span>{sheet.game.manifest.title}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
