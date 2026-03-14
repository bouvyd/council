import type { ChatMessage } from "@council/shared";

type MessageItemProps = {
  message: ChatMessage;
  isSelf: boolean;
  isHighlighted: boolean;
  replyToMessage: ChatMessage | null;
  onReply: (messageId: string) => void;
  onJumpToMessage: (messageId: string) => void;
};

function truncate(text: string, length: number): string {
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length)}...`;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageItem({
  message,
  isSelf,
  isHighlighted,
  replyToMessage,
  onReply,
  onJumpToMessage,
}: MessageItemProps) {
  const replyPreview = replyToMessage ? truncate(replyToMessage.text, 60) : "<unknown message>";

  return (
    <li
      id={`message-${message.id}`}
      className={`message-item ${isSelf ? "message-item-self" : ""} ${isHighlighted ? "message-item-highlighted" : ""}`.trim()}
      key={message.id}
    >
      <div className="message-meta">
        <span>{message.author.displayName}</span>
        <span>{formatTime(message.createdAt)}</span>
      </div>

      {message.replyToMessageId ? (
        <div className="message-reply-context">
          {replyToMessage ? (
            <button
              className="message-reply-link"
              type="button"
              onClick={() => onJumpToMessage(replyToMessage.id)}
            >
              replying to: {replyPreview}
            </button>
          ) : (
            <span className="message-reply-missing">replying to: {replyPreview}</span>
          )}
        </div>
      ) : null}

      <p className="message-text">{message.text}</p>

      <div className="message-actions">
        <button className="message-reply-button" type="button" onClick={() => onReply(message.id)}>
          reply
        </button>
      </div>
    </li>
  );
}
