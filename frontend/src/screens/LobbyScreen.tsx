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
  const panelClass =
    "grid max-w-[620px] gap-[0.95rem] rounded-[var(--radius)] border border-panel-border bg-panel p-[1.15rem] shadow-panel";
  const labelClass = "grid gap-[0.45rem] text-text-muted";
  const inputClass =
    "w-full rounded-[var(--radius)] border border-input-border bg-input-bg px-[0.7rem] py-[0.62rem] text-text outline-1 outline-offset-0 focus:outline-primary focus:shadow-input-focus";
  const buttonClass =
    "cursor-pointer rounded-[var(--radius)] border border-btn-border bg-linear-to-b from-btn-start to-btn-end px-[0.85rem] py-[0.72rem] font-semibold leading-[1.4] tracking-[0.05em] text-btn-text hover:not-disabled:brightness-110 hover:not-disabled:shadow-primary-glow disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <section className={panelClass}>
      <label className={labelClass}>
        display name
        <input
          className={inputClass}
          value={displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          placeholder="damien"
        />
      </label>

      <label className={labelClass}>
        room id (for join)
        <input
          className={inputClass}
          value={roomIdInput}
          onChange={(event) => onRoomIdInputChange(event.target.value)}
          placeholder="a1b2c3d4"
        />
      </label>

      <div className="mt-[0.35rem] flex flex-wrap gap-[0.6rem]">
        <button className={buttonClass} onClick={onCreateRoom} type="button" disabled={submitting}>
          create room
        </button>
        <button className={buttonClass} onClick={onJoinRoom} type="button" disabled={submitting}>
          join room
        </button>
      </div>
    </section>
  );
}
