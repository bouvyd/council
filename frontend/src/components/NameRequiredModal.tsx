type NameRequiredModalProps = {
  roomId: string;
  routeName: string;
  submitting: boolean;
  onRouteNameChange: (value: string) => void;
  onSubmit: () => void;
};

export function NameRequiredModal({
  roomId,
  routeName,
  submitting,
  onRouteNameChange,
  onSubmit,
}: NameRequiredModalProps) {
  const labelClass = "grid gap-[0.45rem] text-text-muted";
  const inputClass =
    "w-full rounded-[var(--radius)] border border-input-border bg-input-bg px-[0.7rem] py-[0.62rem] text-text outline-1 outline-offset-0 focus:outline-primary focus:shadow-input-focus";
  const buttonClass =
    "cursor-pointer rounded-[var(--radius)] border border-btn-border bg-linear-to-b from-btn-start to-btn-end px-[0.85rem] py-[0.72rem] font-semibold leading-[1.4] tracking-[0.05em] text-btn-text hover:not-disabled:brightness-110 hover:not-disabled:shadow-primary-glow disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-black/74 p-4" role="presentation">
      <div
        aria-labelledby="name-modal-title"
        aria-describedby="name-modal-description"
        aria-modal="true"
        className="w-full max-w-[520px] rounded-[var(--radius)] border border-panel-border bg-panel p-4 shadow-modal"
        role="dialog"
      >
        <h2 className="m-0 font-semibold tracking-[0.08em] text-text-muted" id="name-modal-title">
          and who might you be?
        </h2>
        <p className="mt-[0.7rem] text-text-muted" id="name-modal-description">
          Join room <strong>#{roomId}</strong>.
        </p>
        <form
          className="mt-[0.85rem] grid gap-[0.65rem]"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className={labelClass} htmlFor="route-name-input">
            Name
          </label>
          <input
            id="route-name-input"
            className={inputClass}
            value={routeName}
            onChange={(event) => onRouteNameChange(event.target.value)}
            placeholder="damien"
            autoFocus
          />
          <button
            className={buttonClass}
            type="submit"
            disabled={submitting || !routeName.trim()}
          >
            Enter room
          </button>
        </form>
      </div>
    </div>
  );
}
