type AppHeaderProps = {
  currentRoomId: string | null;
  submitting: boolean;
  onLeaveRoom: () => void;
};

export function AppHeader({ currentRoomId, submitting, onLeaveRoom }: AppHeaderProps) {
  return (
    <header className="app-header app-header-row">
      <h1 className="app-title">{currentRoomId ? `council #${currentRoomId}` : "council"}</h1>
      {currentRoomId ? (
        <button
          className="arcade-button arcade-button-alt header-leave"
          onClick={onLeaveRoom}
          type="button"
          disabled={submitting}
        >
          leave room
        </button>
      ) : null}
    </header>
  );
}
