import { useEffect, useRef } from "react";
import type { RoomJoined } from "@council/shared";
import { Navigate, Route, Routes, useMatch, useNavigate } from "react-router-dom";
import { socket } from "./lib/socket";
import { getRoomIdentity, saveRoomIdentity } from "./lib/persistence";
import { getNormalizedRoomId, useAppStore } from "./store/useAppStore";
import { AppHeader } from "./components/AppHeader";
import { NameRequiredModal } from "./components/NameRequiredModal";
import { LobbyScreen } from "./screens/LobbyScreen";
import { RoomScreen } from "./screens/RoomScreen";

function AppShell() {
  const navigate = useNavigate();
  const routeMatch = useMatch("/council/:roomId");
  const routeRoomId = routeMatch?.params.roomId ?? null;
  const suppressRouteAutoJoinRef = useRef(false);

  const {
    displayName,
    routeName,
    roomIdInput,
    currentRoomId,
    currentUser,
    targetRouteRoomId,
    isNameModalOpen,
    presence,
    messages,
    draft,
    error,
    submitting,
    setDisplayName,
    setRouteName,
    setRoomIdInput,
    setDraft,
    setError,
    setSubmitting,
    setPendingJoinRoomId,
    setIsNameModalOpen,
    prepareRouteTarget,
    clearRouteTarget,
    setRouteIdentity,
    applyRoomSuccess,
    clearRoomSession,
  } = useAppStore();

  const handleRoomSuccess = (joined: RoomJoined) => {
    saveRoomIdentity(joined.roomId, joined.user.displayName);
    useAppStore.getState().applyRoomSuccess(joined);
  };

  const joinRoomById = (name: string, roomId: string, mode: "push" | "replace" = "push") => {
    setPendingJoinRoomId(roomId);
    setSubmitting(true);
    setError(null);

    socket.emit("room:join", { displayName: name, roomId }, (result) => {
      if (!result.ok) {
        useAppStore.getState().setPendingJoinRoomId(null);
        useAppStore.getState().setError(result.error);
        useAppStore.getState().setSubmitting(false);
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

  useEffect(() => {
    if (suppressRouteAutoJoinRef.current) {
      if (!routeRoomId) {
        suppressRouteAutoJoinRef.current = false;
        clearRouteTarget();
      }

      return;
    }

    if (!routeRoomId) {
      clearRouteTarget();
      return;
    }

    if (getNormalizedRoomId(currentRoomId) === getNormalizedRoomId(routeRoomId)) {
      return;
    }

    prepareRouteTarget(routeRoomId);

    const persistedIdentity = getRoomIdentity(routeRoomId);
    if (persistedIdentity) {
      setRouteIdentity(persistedIdentity);
      joinRoomById(persistedIdentity, routeRoomId, "replace");
      return;
    }

    setIsNameModalOpen(true);
  }, [routeRoomId, currentRoomId, clearRouteTarget, prepareRouteTarget, setIsNameModalOpen, setRouteIdentity]);

  useEffect(() => {
    const onPresence = useAppStore.getState().applyPresence;
    const onMessageCreated = useAppStore.getState().appendMessage;
    const onSystemError = (payload: { message: string }) => useAppStore.getState().applySystemError(payload.message);

    socket.on("room:presence", onPresence);
    socket.on("message:created", onMessageCreated);
    socket.on("system:error", onSystemError);

    return () => {
      socket.off("room:presence", onPresence);
      socket.off("message:created", onMessageCreated);
      socket.off("system:error", onSystemError);
    };
  }, []);

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
    suppressRouteAutoJoinRef.current = true;
    setPendingJoinRoomId(null);
    setSubmitting(true);

    socket.emit("room:leave", (result) => {
      if (!result.ok) {
        suppressRouteAutoJoinRef.current = false;
        setError(result.error);
        setSubmitting(false);
        return;
      }

      clearRoomSession();
      clearRouteTarget();
      navigate("/", { replace: true });
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
