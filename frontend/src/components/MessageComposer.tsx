import type { FormEvent, KeyboardEvent, RefObject } from "react";

type MessageComposerProps = {
  draft: string;
  submitting: boolean;
  replyPreview: string | null;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  onDraftChange: (value: string) => void;
  onClearReply: () => void;
  onSend: () => void;
};

export function MessageComposer({
  draft,
  submitting,
  replyPreview,
  inputRef,
  onDraftChange,
  onClearReply,
  onSend,
}: MessageComposerProps) {
  const inputClass =
    "min-h-[2.6rem] w-full resize-none rounded-[var(--radius)] border border-input-border bg-input-bg px-[0.7rem] py-[0.62rem] text-text outline-1 outline-offset-0 focus:outline-primary focus:shadow-input-focus";
  const buttonClass =
    "cursor-pointer rounded-[var(--radius)] border border-btn-border bg-linear-to-b from-btn-start to-btn-end px-[0.85rem] py-[0.72rem] font-semibold leading-[1.4] tracking-[0.05em] text-btn-text hover:not-disabled:brightness-110 hover:not-disabled:shadow-primary-glow disabled:cursor-not-allowed disabled:opacity-45";

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
    <form className="mt-[0.7rem] grid grid-cols-1 gap-[0.45rem] min-[901px]:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
      {replyPreview ? (
        <div className="col-span-full flex items-center justify-between gap-[0.6rem] border-l-2 border-reply-border bg-reply-bg px-[0.5rem] py-[0.32rem] text-text-muted">
          <span className="text-xs">replying to: {replyPreview}</span>
          <button
            className="cursor-pointer rounded-[var(--radius)] border border-control-border bg-surface-control px-[0.4rem] py-[0.12rem] text-text-muted hover:border-primary hover:text-primary-bright focus-visible:border-primary focus-visible:text-primary-bright focus-visible:outline-none"
            type="button"
            onClick={onClearReply}
          >
            x
          </button>
        </div>
      ) : null}

      <label className="sr-only" htmlFor="message-input">
        Message
      </label>
      <textarea
        id="message-input"
        ref={inputRef}
        className={inputClass}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message"
        rows={2}
        aria-describedby="composer-help"
      />
      <button className={`${buttonClass} text-lg`} type="submit" disabled={submitting || !draft.trim()}>
        send
      </button>
      <p className="sr-only" id="composer-help">
        Press Enter to send. Press Shift plus Enter for a new line.
      </p>
    </form>
  );
}
