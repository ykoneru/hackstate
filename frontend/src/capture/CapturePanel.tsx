import { useEffect, useRef, useState } from "react";
import { preparePhoto } from "./preparePhoto";
import "./capture.css";

type Mode = "empty" | "camera" | "photo";

type CapturePanelProps = {
  busy: boolean;
  onPhoto: (photo: Blob | null) => void;
};

export function CapturePanel({ busy, onPhoto }: CapturePanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<Mode>("empty");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (mode !== "camera" || !video || !streamRef.current) return;
    video.srcObject = streamRef.current;
    void video.play();
  }, [mode]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function replacePhoto(url: string | null) {
    setPhotoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return url;
    });
  }

  async function openCamera() {
    setCameraError(null);
    onPhoto(null);
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1600 } },
        audio: false,
      });
      streamRef.current = stream;
      setMode("camera");
    } catch {
      setCameraError("Camera permission was blocked. Use a photo of the paper instead.");
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;
    const prepared = await preparePhoto(blob);
    stopCamera();
    replacePhoto(URL.createObjectURL(prepared));
    setMode("photo");
    onPhoto(prepared);
  }

  async function acceptFile(file: File) {
    setCameraError(null);
    stopCamera();
    const prepared = await preparePhoto(file);
    replacePhoto(URL.createObjectURL(prepared));
    setMode("photo");
    onPhoto(prepared);
  }

  return (
    <div>
      <div className="stage">
        {mode === "camera" && (
          <>
            <video ref={videoRef} autoPlay playsInline muted aria-label="Camera pointed at the paper" />
            <div className="frame-guide">
              <span>Fit the paper in the frame</span>
            </div>
          </>
        )}
        {mode === "photo" && photoUrl && <img src={photoUrl} alt="Photo of the paper sketch" />}
        {mode === "empty" && (
          <div className="empty-stage">
            <p>Draw the app on paper first.</p>
            <p>Then take a photo of that page. Nothing is drawn on this screen.</p>
          </div>
        )}
      </div>
      <div className="actions">
        {mode !== "camera" && (
          <button type="button" className={mode === "photo" ? "secondary" : "primary"} disabled={busy} onClick={() => void openCamera()}>
            {mode === "photo" ? "Retake" : "Open camera"}
          </button>
        )}
        {mode === "camera" && (
          <button type="button" className="primary" disabled={busy} onClick={() => void capture()}>
            Take photo
          </button>
        )}
        <button type="button" className="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
          Use a photo of the paper
        </button>
        <input
          ref={fileRef}
          className="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void acceptFile(file);
            event.target.value = "";
          }}
        />
      </div>
      {cameraError && <p className="error">{cameraError}</p>}
    </div>
  );
}
