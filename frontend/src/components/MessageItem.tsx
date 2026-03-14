import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@council/shared";
import { EmojiPickerPopover } from "./EmojiPicker";
import { ReactionBar } from "./ReactionBar";

type MessageItemProps = {
  message: ChatMessage;
  isSelf: boolean;
  isHighlighted: boolean;
  currentSessionId: string | null;
  replyToMessage: ChatMessage | null;
  onReply: (messageId: string) => void;
  onJumpToMessage: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
};

function truncate(text: string, length: number): string {
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length)}...`;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageItem({
  message,
  isSelf,
  isHighlighted,
  currentSessionId,
  replyToMessage,
  onReply,
  onJumpToMessage,
  onToggleReaction,
}: MessageItemProps) {
  const reactButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });

  const replyPreview = replyToMessage ? truncate(replyToMessage.text, 60) : "<unknown message>";

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }

    const updatePosition = () => {
      const rect = reactButtonRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const desiredLeft = rect.right - 300;
      setPickerPosition({
        top: rect.bottom + 8,
        left: Math.max(8, desiredLeft),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isPickerOpen]);

  return (
    <li
      id={`message-${message.id}`}
      className={`message-item ${isSelf ? "message-item-self" : ""} ${isHighlighted ? "message-item-highlighted" : ""}`.trim()}
      key={message.id}
    >
      <div className="message-meta">
        <span>{message.author.displayName}</span>
        <div className="message-meta-right">
          <button
            ref={reactButtonRef}
            className="message-meta-action message-react-button"
            onClick={() => setIsPickerOpen((current) => !current)}
            type="button"
          >
            react
          </button>
          <button className="message-meta-action message-reply-button" type="button" onClick={() => onReply(message.id)}>
            reply
          </button>
          <span className="message-meta-time">{formatTime(message.createdAt)}</span>
        </div>
      </div>

      {message.replyToMessageId ? (
        <div className="message-reply-context">
          {replyToMessage ? (
            <button className="message-reply-link" type="button" onClick={() => onJumpToMessage(replyToMessage.id)}>
              replying to: {replyPreview}
            </button>
          ) : (
            <span className="message-reply-missing">replying to: {replyPreview}</span>
          )}
        </div>
      ) : null}

      <p className="message-text">{message.text}</p>

      <ReactionBar
        messageId={message.id}
        reactions={message.reactions}
        currentSessionId={currentSessionId}
        onToggleReaction={onToggleReaction}
      />

      {isPickerOpen ? (
        <EmojiPickerPopover
          top={pickerPosition.top}
          left={pickerPosition.left}
          onClose={() => setIsPickerOpen(false)}
          onSelect={(emoji) => {
            onToggleReaction(message.id, emoji);
            setIsPickerOpen(false);
          }}
        />
      ) : null}
    </li>
  );
}
