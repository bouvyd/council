type LobbyScreenProps = {
  displayName: string;
  roomIdInput: string;
  submitting: boolean;
  onDisplayNameChange: (value: string) => void;
  onRoomIdInputChange: (value: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
};

export function LobbyScreen({
  displayName,
  roomIdInput,
  submitting,
  onDisplayNameChange,
  onRoomIdInputChange,
  onCreateRoom,
  onJoinRoom,
}: LobbyScreenProps) {
  return (
    <section className="panel panel-join">
      <label className="field-label">
        Display name
        <input
          className="field-input"
          value={displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          placeholder="damien"
        />
      </label>

      <label className="field-label">
        Room id (for join)
        <input
          className="field-input"
          value={roomIdInput}
          onChange={(event) => onRoomIdInputChange(event.target.value)}
          placeholder="a1b2c3d4"
        />
      </label>

      <div className="action-row">
        <button className="arcade-button" onClick={onCreateRoom} type="button" disabled={submitting}>
          Create room
        </button>
        <button className="arcade-button" onClick={onJoinRoom} type="button" disabled={submitting}>
          Join room
        </button>
      </div>
    </section>
  );
}
