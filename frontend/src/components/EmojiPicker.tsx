import { createPortal } from "react-dom";

const EMOJI_OPTIONS = [
  "👍",
  "❤️",
  "😂",
  "🔥",
  "👏",
  "🙏",
  "🎉",
  "✅",
  "👀",
  "🤔",
  "🙌",
  "💯",
  "😍",
  "😎",
  "😅",
  "😢",
  "😭",
  "😡",
  "🤯",
  "🥳",
  "🚀",
  "✨",
  "💥",
  "👎",
  "👌",
  "🤝",
  "🙈",
  "🤖",
  "🍕",
  "☕",
] as const;

type EmojiPickerPopoverProps = {
  top: number;
  left: number;
  onClose: () => void;
  onSelect: (emoji: string) => void;
};

export function EmojiPickerPopover({ top, left, onClose, onSelect }: EmojiPickerPopoverProps) {
  return createPortal(
    <>
      <button className="fixed inset-0 z-[110] m-0 cursor-default border-0 bg-transparent p-0" aria-label="close emoji picker" onClick={onClose} type="button" />
      <div
        className="fixed z-[120] max-w-[calc(100vw-16px)] overflow-hidden rounded-[var(--radius)] border border-btn-border shadow-popover"
        style={{ top, left }}
      >
        <div className="w-[300px] max-w-[calc(100vw-16px)] bg-surface-muted p-[0.58rem]" role="dialog" aria-label="Choose a reaction">
          <p className="mb-[0.45rem] mt-0 uppercase tracking-[0.02em] text-text-muted">Pick a reaction</p>
          <div className="grid grid-cols-6 gap-[0.28rem]">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                className="cursor-pointer rounded-[var(--radius)] border border-control-border bg-surface-control py-[0.36rem] leading-none text-text transition-[border-color,color,transform] duration-150 hover:-translate-y-px hover:border-primary hover:text-primary-bright focus-visible:-translate-y-px focus-visible:border-primary focus-visible:text-primary-bright focus-visible:outline-none"
                onClick={() => onSelect(emoji)}
                type="button"
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
