import { useEffect, useState } from "react";
import type { ChatMessage, PresenceUpdate, RoomJoined, UserIdentity } from "@council/shared";
import { Navigate, Route, Routes, useMatch, useNavigate } from "react-router-dom";
import { socket } from "./lib/socket";
import { AppHeader } from "./components/AppHeader";
import { NameRequiredModal } from "./components/NameRequiredModal";
import { LobbyScreen } from "./screens/LobbyScreen";
import { RoomScreen } from "./screens/RoomScreen";

function AppShell() {
  const navigate = useNavigate();
  const routeMatch = useMatch("/council/:roomId");
  const routeRoomId = routeMatch?.params.roomId ?? null;

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
  }, [routeRoomId, currentRoomId]);

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
      navigate(`/council/${result.data.roomId}`);
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

      if (mode === "replace") {
        navigate(`/council/${result.data.roomId}`, { replace: true });
      } else {
        navigate(`/council/${result.data.roomId}`);
      }
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
      navigate("/");
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
        <AppHeader currentRoomId={currentRoomId} submitting={submitting} onLeaveRoom={leaveRoom} />

        {error ? (
          <div className="error-banner">{error}</div>
        ) : null}

        {!currentRoomId ? (
          <LobbyScreen
            displayName={displayName}
            roomIdInput={roomIdInput}
            submitting={submitting}
            onDisplayNameChange={setDisplayName}
            onRoomIdInputChange={setRoomIdInput}
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
          />
        ) : (
          <RoomScreen
            currentUser={currentUser}
            presence={presence}
            messages={messages}
            draft={draft}
            submitting={submitting}
            onDraftChange={setDraft}
            onSendMessage={sendMessage}
          />
        )}

        {isNameModalOpen ? (
          <NameRequiredModal
            roomId={targetRouteRoomId ?? ""}
            routeName={routeName}
            submitting={submitting}
            onRouteNameChange={setRouteName}
            onSubmit={joinRoutedRoom}
          />
        ) : null}
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />} />
      <Route path="/council/:roomId" element={<AppShell />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
