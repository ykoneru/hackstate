import type { Screen } from "../contract";

type PhoneProps = {
  screen: Screen | null;
};

export function Phone({ screen }: PhoneProps) {
  void screen;
  return (
    <div className="device">
      <div className="device-screen waiting">
        <p>The app from the paper will show up here.</p>
      </div>
    </div>
  );
}
