import type { ChatMessage, UserIdentity } from "@council/shared";
import { MessageComposer } from "../components/MessageComposer";

type RoomScreenProps = {
  currentUser: UserIdentity | null;
  presence: UserIdentity[];
  typingBySessionId: Record<string, boolean>;
  messages: ChatMessage[];
  draft: string;
  submitting: boolean;
  onDraftChange: (value: string) => void;
  onSendMessage: () => void;
};

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function RoomScreen({
  currentUser,
  presence,
  typingBySessionId,
  messages,
  draft,
  submitting,
  onDraftChange,
  onSendMessage,
}: RoomScreenProps) {
  const otherUsers = presence.filter((user) => user.sessionId !== currentUser?.sessionId);

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
                  <li
                    className={`message-item ${message.author.sessionId === currentUser?.sessionId ? "message-item-self" : ""}`.trim()}
                    key={message.id}
                  >
                    <div className="message-meta">
                      <span>{message.author.displayName}</span>
                      <span>{formatTime(message.createdAt)}</span>
                    </div>
                    <p className="message-text">{message.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <MessageComposer
          draft={draft}
          submitting={submitting}
          onDraftChange={onDraftChange}
          onSend={onSendMessage}
        />
      </div>
    </section>
  );
}
