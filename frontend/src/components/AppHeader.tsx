import { useEffect, useState } from "react";

type AppHeaderProps = {
  currentRoomId: string | null;
  submitting: boolean;
  onLeaveRoom: () => void;
};

export function AppHeader({ currentRoomId, submitting, onLeaveRoom }: AppHeaderProps) {
  const arcadeButtonClass =
    "cursor-pointer rounded-[var(--radius)] border border-btn-border bg-linear-to-b from-btn-start to-btn-end p-2 font-semibold leading-[1.4] tracking-[0.05em] text-btn-text hover:not-disabled:brightness-110 hover:not-disabled:shadow-primary-glow disabled:cursor-not-allowed disabled:opacity-45";

  const [inviteStatus, setInviteStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (inviteStatus !== "copied") {
      return;
    }

    const timeoutId = window.setTimeout(() => setInviteStatus("idle"), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [inviteStatus]);

  const copyInviteLink = async () => {
    if (!currentRoomId) {
      return;
    }

    const inviteUrl = new URL(`/council/${currentRoomId}`, window.location.origin).toString();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = inviteUrl;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setInviteStatus("copied");
    } catch {
      setInviteStatus("error");
    }
  };

  return (
    <header className="mb-5 flex flex-col justify-between gap-3 min-[901px]:flex-row min-[901px]:items-center">
      <div className="flex flex-wrap items-center gap-[0.55rem]">
        <h1 className="title-glow m-0 text-4xl font-semibold leading-[1.4] text-primary">
          {currentRoomId ? `council #${currentRoomId}` : "council"}
        </h1>
        {currentRoomId ? (
          <button className={arcadeButtonClass} onClick={copyInviteLink} type="button">
            {inviteStatus === "copied" ? "copied!" : "invite"}
          </button>
        ) : null}
      </div>
      {currentRoomId ? (
        <button className={`${arcadeButtonClass} shrink-0`} onClick={onLeaveRoom} type="button" disabled={submitting}>
          leave room
        </button>
      ) : null}
      {inviteStatus === "error" ? <span className="text-danger">copy failed</span> : null}
    </header>
  );
}
