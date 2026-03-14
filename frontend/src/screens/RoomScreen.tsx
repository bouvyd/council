import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, UserIdentity } from "@council/shared";
import { MessageComposer } from "../components/MessageComposer";
import { MessageItem } from "../components/MessageItem";

type RoomScreenProps = {
  currentUser: UserIdentity | null;
  presence: UserIdentity[];
  typingBySessionId: Record<string, boolean>;
  messages: ChatMessage[];
  activeReplyToMessageId: string | null;
  draft: string;
  submitting: boolean;
  onDraftChange: (value: string) => void;
  onSelectReply: (messageId: string) => void;
  onClearReply: () => void;
  onSendMessage: () => void;
};

function truncate(text: string, length: number): string {
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length)}...`;
}

export function RoomScreen({
  currentUser,
  presence,
  typingBySessionId,
  messages,
  activeReplyToMessageId,
  draft,
  submitting,
  onDraftChange,
  onSelectReply,
  onClearReply,
  onSendMessage,
}: RoomScreenProps) {
  const highlightTimeoutRef = useRef<number | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const otherUsers = presence.filter((user) => user.sessionId !== currentUser?.sessionId);
  const messageById = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const message of messages) {
      map.set(message.id, message);
    }

    return map;
  }, [messages]);

  const activeReplyMessage = activeReplyToMessageId ? messageById.get(activeReplyToMessageId) ?? null : null;
  const replyPreview = activeReplyMessage ? truncate(activeReplyMessage.text, 60) : null;

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const jumpToMessage = (messageId: string) => {
    const target = document.getElementById(`message-${messageId}`);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);

    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedMessageId((current) => (current === messageId ? null : current));
      highlightTimeoutRef.current = null;
    }, 2000);
  };

  return (
    <section className="chat-grid">
      <aside className="panel panel-sidebar">
        <p>take a seat, <span className="session-user">{currentUser?.displayName}</span></p>

        <div className="presence-block">
          <h3 className="panel-title">who&apos;s there</h3>
          {otherUsers.length === 0 ? (
            <p className="empty-state">it&apos;s just you for now</p>
          ) : (
            <ul className="presence-list">
              {otherUsers.map((user) => (
                <li className="presence-item" key={user.sessionId}>
                  {user.displayName}
                  {typingBySessionId[user.sessionId] ? <span className="presence-typing">typing...</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="panel panel-chat">
        <div className="message-container">
          <div className="message-scroll">
            {messages.length === 0 ? (
              <p className="empty-state">No messages yet.</p>
            ) : (
              <ul className="message-list">
                {messages.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    isSelf={message.author.sessionId === currentUser?.sessionId}
                    isHighlighted={highlightedMessageId === message.id}
                    replyToMessage={message.replyToMessageId ? messageById.get(message.replyToMessageId) ?? null : null}
                    onReply={onSelectReply}
                    onJumpToMessage={jumpToMessage}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        <MessageComposer
          draft={draft}
          submitting={submitting}
          replyPreview={replyPreview}
          onDraftChange={onDraftChange}
          onClearReply={onClearReply}
          onSend={onSendMessage}
        />
      </div>
    </section>
  );
}
