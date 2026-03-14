import { useEffect, useState } from "react";
import type { ChatMessage, PresenceUpdate, RoomJoined, UserIdentity } from "@council/shared";
import { socket } from "./lib/socket";
import { MessageComposer } from "./components/MessageComposer";

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function parseRoomIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/council\/([a-zA-Z0-9_-]+)\/?$/);
  return match?.[1] ?? null;
}

function syncPath(roomId: string | null, mode: "push" | "replace" = "push"): void {
  const targetPath = roomId ? `/council/${roomId}` : "/";

  if (window.location.pathname === targetPath) {
    return;
  }

  if (mode === "replace") {
    window.history.replaceState({}, "", targetPath);
    return;
  }

  window.history.pushState({}, "", targetPath);
}

export default function App() {
  const [displayName, setDisplayName] = useState("");
  const [routeName, setRouteName] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserIdentity | null>(null);
  const [targetRouteRoomId, setTargetRouteRoomId] = useState<string | null>(null);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [presence, setPresence] = useState<UserIdentity[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const applyRoute = () => {
      const routeRoomId = parseRoomIdFromPath(window.location.pathname);

      if (!routeRoomId) {
        setTargetRouteRoomId(null);
        setIsNameModalOpen(false);
        return;
      }

      if (currentRoomId === routeRoomId) {
        return;
      }

      setTargetRouteRoomId(routeRoomId);
      setRoomIdInput(routeRoomId);
      setIsNameModalOpen(true);
      setError(null);
    };

    applyRoute();
    window.addEventListener("popstate", applyRoute);

    return () => {
      window.removeEventListener("popstate", applyRoute);
    };
  }, [currentRoomId]);

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
    setTargetRouteRoomId(null);
    setIsNameModalOpen(false);
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
      syncPath(result.data.roomId, "push");
    });
  };

  const joinRoomById = (name: string, roomId: string, mode: "push" | "replace" = "push") => {
    setSubmitting(true);
    setError(null);

    socket.emit("room:join", { displayName: name, roomId }, (result) => {
      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      handleRoomSuccess(result.data);
      syncPath(result.data.roomId, mode);
    });
  };

  const joinRoom = () => {
    if (!displayName.trim() || !roomIdInput.trim()) {
      setError("Display name and room id are required.");
      return;
    }

    joinRoomById(displayName.trim(), roomIdInput.trim(), "push");
  };

  const joinRoutedRoom = () => {
    if (!targetRouteRoomId || !routeName.trim()) {
      setError("Display name is required.");
      return;
    }

    setDisplayName(routeName.trim());
    joinRoomById(routeName.trim(), targetRouteRoomId, "replace");
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
      syncPath(null, "push");
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

        {isNameModalOpen ? (
          <div className="modal-backdrop" role="presentation">
            <div
              aria-labelledby="name-modal-title"
              aria-describedby="name-modal-description"
              aria-modal="true"
              className="panel modal-panel"
              role="dialog"
            >
              <h2 className="panel-title" id="name-modal-title">enter your call sign</h2>
              <p className="modal-copy" id="name-modal-description">
                Join room <strong>#{targetRouteRoomId}</strong>.
              </p>
              <form
                className="modal-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  joinRoutedRoom();
                }}
              >
                <label className="field-label" htmlFor="route-name-input">
                  Name
                </label>
                <input
                  id="route-name-input"
                  className="field-input"
                  value={routeName}
                  onChange={(event) => setRouteName(event.target.value)}
                  placeholder="damien"
                  autoFocus
                />
                <button
                  className="arcade-button"
                  type="submit"
                  disabled={submitting || !routeName.trim()}
                >
                  Enter room
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
