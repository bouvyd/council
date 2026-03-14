import { useEffect, useState } from "react";
import type { ChatMessage, PresenceUpdate, RoomJoined, UserIdentity } from "@council/shared";
import { socket } from "./lib/socket";
import { MessageComposer } from "./components/MessageComposer";

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [displayName, setDisplayName] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserIdentity | null>(null);
  const [presence, setPresence] = useState<UserIdentity[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onPresence = (payload: PresenceUpdate) => {
      if (!currentRoomId || payload.roomId !== currentRoomId) {
        return;
      }

      setPresence(payload.users);
    };

    const onMessageCreated = (payload: ChatMessage) => {
      if (!currentRoomId || payload.roomId !== currentRoomId) {
        return;
      }

      setMessages((current) => [...current, payload]);
    };

    const onSystemError = (payload: { message: string }) => {
      setError(payload.message);
      setSubmitting(false);
    };

    socket.on("room:presence", onPresence);
    socket.on("message:created", onMessageCreated);
    socket.on("system:error", onSystemError);

    return () => {
      socket.off("room:presence", onPresence);
      socket.off("message:created", onMessageCreated);
      socket.off("system:error", onSystemError);
    };
  }, [currentRoomId]);

  const handleRoomSuccess = (joined: RoomJoined) => {
    setCurrentRoomId(joined.roomId);
    setCurrentUser(joined.user);
    setRoomIdInput(joined.roomId);
    setPresence([joined.user]);
    setMessages([]);
    setError(null);
    setSubmitting(false);
  };

  const createRoom = () => {
    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    socket.emit("room:create", { displayName: displayName.trim() }, (result) => {
      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      handleRoomSuccess(result.data);
    });
  };

  const joinRoom = () => {
    if (!displayName.trim() || !roomIdInput.trim()) {
      setError("Display name and room id are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    socket.emit(
      "room:join",
      { displayName: displayName.trim(), roomId: roomIdInput.trim() },
      (result) => {
        if (!result.ok) {
          setError(result.error);
          setSubmitting(false);
          return;
        }

        handleRoomSuccess(result.data);
      },
    );
  };

  const leaveRoom = () => {
    setSubmitting(true);

    socket.emit("room:leave", (result) => {
      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      setCurrentRoomId(null);
      setCurrentUser(null);
      setPresence([]);
      setMessages([]);
      setDraft("");
      setError(null);
      setSubmitting(false);
    });
  };

  const sendMessage = () => {
    if (!currentRoomId || !draft.trim()) {
      return;
    }

    const text = draft.trim();
    const clientMessageId = crypto.randomUUID();

    setSubmitting(true);
    setError(null);

    socket.emit("message:send", { roomId: currentRoomId, text, clientMessageId }, (result) => {
      if (!result.ok) {
        setError(result.error);
      } else {
        setDraft("");
      }

      setSubmitting(false);
    });
  };

  return (
    <main className="arcade-app">
      <div className="arcade-scanlines" aria-hidden="true" />
      <div className="arcade-shell">
        <header className="app-header app-header-row">
          <h1 className="app-title">{currentRoomId ? `council #${currentRoomId}` : "council"}</h1>
          {currentRoomId ? (
            <button
              className="arcade-button arcade-button-alt header-leave"
              onClick={leaveRoom}
              type="button"
              disabled={submitting}
            >
              leave room
            </button>
          ) : null}
        </header>

        {error ? (
          <div className="error-banner">{error}</div>
        ) : null}

        {!currentRoomId ? (
          <section className="panel panel-join">
            <label className="field-label">
              Display name
              <input
                className="field-input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="damien"
              />
            </label>

            <label className="field-label">
              Room id (for join)
              <input
                className="field-input"
                value={roomIdInput}
                onChange={(event) => setRoomIdInput(event.target.value)}
                placeholder="a1b2c3d4"
              />
            </label>

            <div className="action-row">
              <button
                className="arcade-button"
                onClick={createRoom}
                type="button"
                disabled={submitting}
              >
                Create room
              </button>
              <button
                className="arcade-button arcade-button-alt"
                onClick={joinRoom}
                type="button"
                disabled={submitting}
              >
                Join room
              </button>
            </div>
          </section>
        ) : (
          <section className="chat-grid">
            <aside className="panel panel-sidebar">
              <p>take a seat, <span className="session-user">{currentUser?.displayName}</span></p>

              <div className="presence-block">
                <h3 className="panel-title">head count</h3>
                <ul className="presence-list">
                  {presence.map((user) => (
                    <li className="presence-item" key={user.sessionId}>
                      {user.displayName}
                    </li>
                  ))}
                </ul>
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
                onDraftChange={setDraft}
                onSend={sendMessage}
              />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
