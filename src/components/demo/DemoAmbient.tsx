import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

const poster = "/demo-media/demo-background-poster.webp";

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

function shouldPlayBackground(): boolean {
  const connection = (navigator as Navigator & {
    connection?: NetworkInformation;
  }).connection;

  return (
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !connection?.saveData &&
    connection?.effectiveType !== "slow-2g" &&
    connection?.effectiveType !== "2g"
  );
}

export default function DemoAmbient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canUseVideo] = useState(shouldPlayBackground);
  const [videoReady, setVideoReady] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!canUseVideo) return;

    const onVisibilityChange = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) {
        video.pause();
      } else if (!paused) {
        void video.play().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [canUseVideo, paused]);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play().then(() => setPaused(false)).catch(() => {});
    } else {
      video.pause();
      setPaused(true);
    }
  }

  return (
    <div className="demo-ambient">
      <img
        className="demo-ambient-poster"
        src={poster}
        alt=""
        aria-hidden="true"
        width="960"
        height="540"
        decoding="async"
        fetchPriority="high"
      />
      {canUseVideo ? (
        <video
          ref={videoRef}
          aria-hidden="true"
          className={`demo-ambient-video${videoReady ? " is-ready" : ""}`}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          onCanPlay={() => setVideoReady(true)}
        >
          <source src="/demo-media/demo-background.webm" type="video/webm" />
          <source src="/demo-media/demo-background.mp4" type="video/mp4" />
        </video>
      ) : null}
      <div className="demo-ambient-shade" />
      {canUseVideo && videoReady ? (
        <button
          type="button"
          className="demo-ambient-control"
          onClick={togglePlayback}
          aria-label={paused ? "Putar video latar" : "Jeda video latar"}
          title={paused ? "Putar video" : "Jeda video"}
        >
          {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
        </button>
      ) : null}
    </div>
  );
}
