import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@council/shared";
import ReactMarkdown from "react-markdown";
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
  const isSystemMessage = message.kind === "system";
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
      className={`group border-l bg-surface px-2 py-1 transition-[border-color,box-shadow,background-color] duration-150 ease-in-out ${isSelf ? "border-l-[3px] border-message-line" : "border-l border-message-line"} ${isHighlighted ? " border-primary-bright bg-primary-soft-10" : ""} ${isSystemMessage ? "border-l-0 pl-0 bg-primary-soft-10" : ""}`.trim()}
      key={message.id}
    >
      {!isSystemMessage ? (
        <div className="flex items-center justify-between gap-1 text-text-muted">
          <span>{message.author.displayName}</span>
          <div className="inline-flex items-center gap-[0.34rem]">
            <button
              ref={reactButtonRef}
              className={`cursor-pointer rounded-[var(--radius)] border border-control-border bg-surface-control text-text-muted transition-[opacity,color,border-color] duration-150 hover:border-primary hover:text-primary-bright focus-visible:border-primary focus-visible:text-primary-bright focus-visible:outline-none opacity-0 group-hover:opacity-100 max-[900px]:opacity-100`}
              onClick={() => setIsPickerOpen((current) => !current)}
              type="button"
            >
              react
            </button>
            <button
              className={`cursor-pointer rounded-[var(--radius)] border border-control-border bg-surface-control text-text-muted transition-[opacity,color,border-color] duration-150 hover:border-primary hover:text-primary-bright focus-visible:border-primary focus-visible:text-primary-bright focus-visible:outline-none opacity-0 group-hover:opacity-100 max-[900px]:opacity-100`}
              type="button"
              onClick={() => onReply(message.id)}
            >
              reply
            </button>
            <span className="whitespace-nowrap">{formatTime(message.createdAt)}</span>
          </div>
        </div>
      ) : null}

      {!isSystemMessage && message.replyToMessageId ? (
        <div className="py-[0.15rem]">
          {replyToMessage ? (
            <button
              className="cursor-pointer border-0 bg-transparent p-0 text-left text-sm text-text-muted hover:text-primary-bright hover:underline focus-visible:text-primary-bright focus-visible:underline focus-visible:outline-none"
              type="button"
              onClick={() => onJumpToMessage(replyToMessage.id)}
            >
              <span className="text-xs">re: {replyPreview}</span>
            </button>
          ) : (
            <span className="text-xs text-text-muted">re: {replyPreview}</span>
          )}
        </div>
      ) : null}

      {isSystemMessage ? (
        <p className="m-0 text-[0.82rem] italic">
          <span className="whitespace-nowrap text-text-muted">{formatTime(message.createdAt)} - </span>
          <span>{message.text}</span>
        </p>
      ) : (
        <div className="markdown-content m-0 leading-[1.45] text-text max-w-[1100px]">
          <ReactMarkdown skipHtml>{message.text}</ReactMarkdown>
        </div>
      )}

      {!isSystemMessage ? (
        <ReactionBar
          messageId={message.id}
          reactions={message.reactions}
          currentSessionId={currentSessionId}
          onToggleReaction={onToggleReaction}
        />
      ) : null}

      {!isSystemMessage && isPickerOpen ? (
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
