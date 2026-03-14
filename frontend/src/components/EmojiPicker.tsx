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
      <button className="emoji-picker-backdrop" aria-label="close emoji picker" onClick={onClose} type="button" />
      <div className="emoji-picker-popover" style={{ top, left }}>
        <div className="emoji-picker-panel" role="dialog" aria-label="Choose a reaction">
          <p className="emoji-picker-title">Pick a reaction</p>
          <div className="emoji-picker-grid">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                className="emoji-picker-option"
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
