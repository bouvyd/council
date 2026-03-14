import { useEffect, useState } from "react";

type AppHeaderProps = {
  currentRoomId: string | null;
  submitting: boolean;
  onLeaveRoom: () => void;
};

export function AppHeader({ currentRoomId, submitting, onLeaveRoom }: AppHeaderProps) {
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
    <header className="app-header app-header-row">
      <div className="app-header-main">
        <h1 className="app-title">{currentRoomId ? `council #${currentRoomId}` : "council"}</h1>
        {currentRoomId ? (
          <button className="arcade-button" onClick={copyInviteLink} type="button">
            {inviteStatus === "copied" ? "copied!" : "invite"}
          </button>
        ) : null}
      </div>
      {currentRoomId ? (
        <button
          className="arcade-button header-leave"
          onClick={onLeaveRoom}
          type="button"
          disabled={submitting}
        >
          leave room
        </button>
      ) : null}
      {inviteStatus === "error" ? <span className="header-feedback">copy failed</span> : null}
    </header>
  );
}
