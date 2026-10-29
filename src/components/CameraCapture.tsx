import { useEffect, useRef, useState } from "react";
export function CameraCapture({
  onCapture,
}: {
  onCapture: (photo: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const [starting, setStarting] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setOpen(false);
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  const start = async () => {
    if (starting) return;
    setStarting(true);
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera requires HTTPS or localhost and a supported browser.",
        );
      const next = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
      if (!mounted.current) {
        next.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = next;
      setOpen(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Allow camera access to capture evidence.",
      );
    } finally {
      if (mounted.current) setStarting(false);
    }
  };
  useEffect(() => {
    if (open && video.current) {
      video.current.srcObject = stream.current;
      void video.current
        .play()
        .catch(() => setError("Could not start camera preview."));
    }
  }, [open]);
  return (
    <div className="camera-capture">
      {open ? (
        <>
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", borderRadius: 12 }}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const v = video.current;
              if (!v?.videoWidth) return;
              const canvas = document.createElement("canvas");
              const scale = Math.min(1, 1600 / v.videoWidth);
              canvas.width = Math.round(v.videoWidth * scale);
              canvas.height = Math.round(v.videoHeight * scale);
              canvas
                .getContext("2d")!
                .drawImage(v, 0, 0, canvas.width, canvas.height);
              onCapture(canvas.toDataURL("image/jpeg", 0.82));
              stop();
            }}
          >
            Capture photo
          </button>
          <button type="button" className="btn btn-outline" onClick={stop}>
            Close camera
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-outline btn-wide"
          disabled={starting}
          onClick={start}
        >
          {starting ? "Opening camera…" : "Open camera · live evidence only"}
        </button>
      )}
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      <p className="form-footnote">
        Stop safely before taking a photo. Gallery uploads are unavailable.
      </p>
    </div>
  );
}
