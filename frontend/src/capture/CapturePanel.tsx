type CapturePanelProps = {
  busy: boolean;
  onPhoto: (photo: Blob | null) => void;
};

export function CapturePanel({ busy, onPhoto }: CapturePanelProps) {
  void busy;
  void onPhoto;
  return (
    <div className="empty-stage">
      <p>Draw the app on paper, then take a photo of that page.</p>
    </div>
  );
}
