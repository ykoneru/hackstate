import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Block, Screen } from "../contract";
import { InkBoxes } from "./InkBoxes";
import { preparePhoto } from "./preparePhoto";
import { RecentSheets } from "./RecentSheets";
import { photoFromSheet, type Sheet } from "./sheets";
import "./capture.css";

type Mode = "empty" | "camera" | "photo";

const CAMERA_KEY = "napkin.camera";
const COUNTDOWN = 3;

type CapturePanelProps = {
  busy: boolean;
  onPhoto: (photo: Blob | null) => void;
  onReplay: (photo: Blob, screen: Screen) => void;
  // Blocks read from the photo on the stage, so their boxes can be drawn over the ink.
  blocks: Block[];
  activeBlock: number | null;
  onHoverBlock: (index: number | null) => void;
  // The next step after the photo, shown above the recent sheets so it stays next to the photo.
  children?: ReactNode;
};

export function CapturePanel({
  busy,
  onPhoto,
  onReplay,
  blocks,
  activeBlock,
  onHoverBlock,
  children,
}: CapturePanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<Mode>("empty");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [streamVersion, setStreamVersion] = useState(0);
  const [count, setCount] = useState<number | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [photoSize, setPhotoSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (mode !== "camera" || !video || !streamRef.current) return;
    video.srcObject = streamRef.current;
    // Switching cameras interrupts the previous play(); that rejection is expected.
    video.play().catch(() => undefined);
  }, [mode, streamVersion]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // An iPhone offered through Continuity Camera can appear after the camera is already open.
  useEffect(() => {
    if (mode !== "camera") return;
    const devices = navigator.mediaDevices;
    const refresh = () => void listCameras();
    devices.addEventListener("devicechange", refresh);
    return () => devices.removeEventListener("devicechange", refresh);
  }, [mode]);

  useEffect(() => {
    if (count === null) return;
    if (count === 0) {
      setCount(null);
      void capture();
      return;
    }
    const timer = window.setTimeout(() => setCount(count - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [count]);

  // Space starts the countdown so both hands can stay off the paper. Space again shoots now, Escape cancels.
  useEffect(() => {
    if (mode !== "camera" || busy) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (event.code === "Space") {
        event.preventDefault();
        shoot();
      } else if (event.key === "Escape") {
        setCount(null);
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "Space" && !isTyping(event.target)) event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [mode, busy]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function replacePhoto(url: string | null) {
    setPhotoSize(null);
    setPhotoUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return url;
    });
  }

  async function listCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    setCameras(devices.filter((device) => device.kind === "videoinput"));
  }

  async function openCamera(deviceId = readSavedCamera()) {
    setProblem(null);
    setCount(null);
    onPhoto(null);
    stopCamera();
    try {
      let stream: MediaStream;
      try {
        stream = await requestCamera(deviceId);
      } catch (error) {
        // The saved camera may be unplugged. Fall back to any camera unless permission was refused.
        if (!deviceId || (error instanceof DOMException && error.name === "NotAllowedError")) throw error;
        stream = await requestCamera(null);
      }
      streamRef.current = stream;
      setCameraId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? "");
      setStreamVersion((value) => value + 1);
      setMode("camera");
      await listCameras();
    } catch (error) {
      setMode(photoUrl ? "photo" : "empty");
      setProblem(
        error instanceof DOMException && error.name === "NotReadableError"
          ? "Another app is using that camera. Close it or pick a different camera."
          : "Camera permission was blocked. Use a photo of the paper instead.",
      );
    }
  }

  function switchCamera(deviceId: string) {
    saveCamera(deviceId);
    void openCamera(deviceId);
  }

  function shoot() {
    setCount((current) => (current === null ? COUNTDOWN : 0));
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
    if (blob) await keepPhoto(blob);
  }

  async function keepPhoto(raw: Blob) {
    setProblem(null);
    setCount(null);
    onPhoto(null);
    setPreparing(true);
    try {
      const prepared = await preparePhoto(raw);
      stopCamera();
      replacePhoto(URL.createObjectURL(prepared));
      setMode("photo");
      onPhoto(prepared);
    } catch {
      setProblem("That photo could not be opened. Try another one.");
    } finally {
      setPreparing(false);
    }
  }

  async function replay(sheet: Sheet) {
    setProblem(null);
    setCount(null);
    stopCamera();
    const photo = await photoFromSheet(sheet);
    replacePhoto(sheet.photo);
    setMode("photo");
    onReplay(photo, sheet.screen);
  }

  const locked = busy || preparing;

  return (
    <div>
      <div className="stage">
        {mode === "camera" && (
          <>
            <video ref={videoRef} autoPlay playsInline muted aria-label="Camera pointed at the paper" />
            <div className="frame-guide">
              <span>Fit the paper in the frame · Space takes the photo</span>
            </div>
            {count !== null && count > 0 && (
              <div className="countdown" aria-live="assertive">
                {count}
              </div>
            )}
          </>
        )}
        {mode === "photo" && photoUrl && (
          <>
            <img
              src={photoUrl}
              alt="Photo of the paper sketch"
              onLoad={(event) =>
                setPhotoSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })
              }
            />
            {photoSize && (
              <InkBoxes {...photoSize} blocks={blocks} active={activeBlock} onHover={onHoverBlock} />
            )}
          </>
        )}
        {mode === "empty" && (
          <div className="empty-stage">
            <p>Draw the app on paper first.</p>
            <p>Then take a photo of that page. Nothing is drawn on this screen.</p>
          </div>
        )}
        {preparing && <p className="stage-note">Cleaning up the photo…</p>}
      </div>
      <div className="actions">
        {mode !== "camera" && (
          <button type="button" className={mode === "photo" ? "secondary" : "primary"} disabled={locked} onClick={() => void openCamera()}>
            {mode === "photo" ? "Retake" : "Open camera"}
          </button>
        )}
        {mode === "camera" && (
          <button type="button" className="primary" disabled={locked} onClick={shoot}>
            {count === null ? `Take photo in ${COUNTDOWN}` : "Take it now"}
          </button>
        )}
        <button type="button" className="secondary" disabled={locked} onClick={() => fileRef.current?.click()}>
          Use a photo of the paper
        </button>
        {mode === "camera" && cameras.length > 1 && (
          <label className="camera-pick">
            <span>Camera</span>
            <select value={cameraId} disabled={locked} onChange={(event) => switchCamera(event.target.value)}>
              {cameras.map((camera, index) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
          </label>
        )}
        <input
          ref={fileRef}
          className="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void keepPhoto(file);
            event.target.value = "";
          }}
        />
      </div>
      {problem && <p className="error">{problem}</p>}
      {children}
      <RecentSheets disabled={locked} onPick={(sheet) => void replay(sheet)} />
    </div>
  );
}

function requestCamera(deviceId: string | null) {
  const video: MediaTrackConstraints = { width: { ideal: 1600 } };
  if (deviceId) video.deviceId = { exact: deviceId };
  else video.facingMode = "environment";
  return navigator.mediaDevices.getUserMedia({ video, audio: false });
}

function readSavedCamera(): string | null {
  try {
    return localStorage.getItem(CAMERA_KEY);
  } catch {
    return null;
  }
}

function saveCamera(deviceId: string) {
  try {
    localStorage.setItem(CAMERA_KEY, deviceId);
  } catch {
    // Remembering the camera is only a convenience.
  }
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}
