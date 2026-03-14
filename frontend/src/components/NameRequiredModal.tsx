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
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        aria-labelledby="name-modal-title"
        aria-describedby="name-modal-description"
        aria-modal="true"
        className="panel modal-panel"
        role="dialog"
      >
        <h2 className="panel-title" id="name-modal-title">enter your call sign</h2>
        <p className="modal-copy" id="name-modal-description">
          Join room <strong>#{roomId}</strong>.
        </p>
        <form
          className="modal-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="field-label" htmlFor="route-name-input">
            Name
          </label>
          <input
            id="route-name-input"
            className="field-input"
            value={routeName}
            onChange={(event) => onRouteNameChange(event.target.value)}
            placeholder="damien"
            autoFocus
          />
          <button
            className="arcade-button"
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
