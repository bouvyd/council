import type { FormEvent, KeyboardEvent } from "react";

type MessageComposerProps = {
  draft: string;
  submitting: boolean;
  replyPreview: string | null;
  onDraftChange: (value: string) => void;
  onClearReply: () => void;
  onSend: () => void;
};

export function MessageComposer({
  draft,
  submitting,
  replyPreview,
  onDraftChange,
  onClearReply,
  onSend,
}: MessageComposerProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !draft.trim()) {
      return;
    }

    onSend();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (submitting || !draft.trim()) {
      return;
    }

    onSend();
  };

  return (
    <form className="composer-row" onSubmit={handleSubmit}>
      {replyPreview ? (
        <div className="composer-reply-banner">
          <span>replying to: {replyPreview}</span>
          <button className="composer-reply-clear" type="button" onClick={onClearReply}>
            x
          </button>
        </div>
      ) : null}

      <label className="sr-only" htmlFor="message-input">
        Message
      </label>
      <textarea
        id="message-input"
        className="field-input"
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message"
        rows={2}
        aria-describedby="composer-help"
      />
      <button
        className="arcade-button"
        type="submit"
        disabled={submitting || !draft.trim()}
      >
        Send
      </button>
      <p className="sr-only" id="composer-help">
        Press Enter to send. Press Shift plus Enter for a new line.
      </p>
    </form>
  );
}
