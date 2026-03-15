import { useEffect, useRef } from "react";

type ScreenShareViewerProps = {
  stream: MediaStream;
  title: string;
  hasAudio: boolean;
  isAudioMuted: boolean;
  onToggleAudioMute: () => void;
  onMiniPlayer: () => void;
  onStopWatching: () => void;
};

export function ScreenShareViewer({
  stream,
  title,
  hasAudio,
  isAudioMuted,
  onToggleAudioMute,
  onMiniPlayer,
  onStopWatching,
}: ScreenShareViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.srcObject = stream;
    videoRef.current.muted = isAudioMuted;
  }, [stream, isAudioMuted]);

  const handleFullscreen = async () => {
    if (!containerRef.current) {
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await containerRef.current.requestFullscreen();
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col gap-[0.7rem] rounded-[var(--radius)] border border-panel-border bg-surface-muted p-[0.65rem]"
    >
      <div className="flex items-start justify-between gap-[0.7rem]">
        <div>
          <h3 className="m-0 text-[1rem] tracking-[0.04em] text-text">{title}</h3>
          <p className="m-0 mt-[0.18rem] text-[0.82rem] text-text-muted">
            {hasAudio ? "Screen share with audio" : "Screen share"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-[0.4rem]">
          <button
            className="cursor-pointer rounded-[var(--radius)] border border-control-border bg-surface-control px-[0.55rem] py-[0.28rem] text-[0.78rem] text-text-muted hover:border-primary hover:text-primary-bright"
            type="button"
            onClick={onMiniPlayer}
          >
            mini player
          </button>
          <button
            className="cursor-pointer rounded-[var(--radius)] border border-control-border bg-surface-control px-[0.55rem] py-[0.28rem] text-[0.78rem] text-text-muted hover:border-primary hover:text-primary-bright"
            type="button"
            onClick={() => {
              void handleFullscreen();
            }}
          >
            fullscreen
          </button>
          {hasAudio ? (
            <button
              className="cursor-pointer rounded-[var(--radius)] border border-control-border bg-surface-control px-[0.55rem] py-[0.28rem] text-[0.78rem] text-text-muted hover:border-primary hover:text-primary-bright"
              type="button"
              onClick={onToggleAudioMute}
            >
              {isAudioMuted ? "unmute stream" : "mute stream"}
            </button>
          ) : null}
          <button
            className="cursor-pointer rounded-[var(--radius)] border border-control-border bg-surface-control px-[0.55rem] py-[0.28rem] text-[0.78rem] text-text-muted hover:border-primary hover:text-primary-bright"
            type="button"
            onClick={onStopWatching}
          >
            stop watching
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[var(--radius)] border border-control-border bg-black/60">
        <video
          ref={videoRef}
          className="h-full w-full bg-black object-contain"
          autoPlay
          playsInline
        />
      </div>
    </div>
  );
}
