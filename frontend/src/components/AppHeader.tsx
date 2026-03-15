type AppHeaderProps = {
  currentRoomId: string | null;
  submitting: boolean;
  inviteStatus: "idle" | "copied" | "error";
  isInfoPanelOpen: boolean;
  onInvite: () => void;
  onLeaveRoom: () => void;
  onToggleInfoPanel: () => void;
};

export function AppHeader({
  currentRoomId,
  submitting,
  inviteStatus,
  isInfoPanelOpen,
  onInvite,
  onLeaveRoom,
  onToggleInfoPanel,
}: AppHeaderProps) {
  const arcadeButtonClass =
    "cursor-pointer rounded-[var(--radius)] border border-btn-border bg-linear-to-b from-btn-start to-btn-end p-2 font-semibold leading-[1.4] tracking-[0.05em] text-btn-text hover:not-disabled:brightness-110 hover:not-disabled:shadow-primary-glow disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-[0.55rem]">
        <h1 className="title-glow m-0 text-4xl font-semibold leading-[1.4] text-primary">
          {currentRoomId ? `council #${currentRoomId}` : "council"}
        </h1>
        {currentRoomId ? (
          <button className={`${arcadeButtonClass} hidden min-[901px]:inline-flex`} onClick={onInvite} type="button">
            {inviteStatus === "copied" ? "copied!" : "invite"}
          </button>
        ) : null}
        {currentRoomId ? (
          <button
            className={`${arcadeButtonClass} min-[901px]:hidden`}
            onClick={onToggleInfoPanel}
            type="button"
            aria-expanded={isInfoPanelOpen}
            aria-controls="room-info-panel"
          >
            info
          </button>
        ) : null}
      </div>

      {currentRoomId ? (
        <div className="hidden min-[901px]:flex min-[901px]:items-center min-[901px]:gap-[0.6rem]">
          {inviteStatus === "error" ? <span className="text-danger">copy failed</span> : null}
          <button className={`${arcadeButtonClass} shrink-0`} onClick={onLeaveRoom} type="button" disabled={submitting}>
            leave room
          </button>
        </div>
      ) : null}
    </header>
  );
}
