import { useEffect, useRef } from "react";
import type { RoomJoined } from "@council/shared";
import { Navigate, Route, Routes, useMatch, useNavigate } from "react-router-dom";
import { socket } from "./lib/socket";
import {
  checkRoomRequest,
  createRoomRequest,
  emitReactionToggle,
  emitTypingUpdate,
  joinRoomRequest,
  leaveRoomRequest,
  sendMessageRequest,
} from "./lib/chatClient";
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
  const typingIdleTimeoutRef = useRef<number | null>(null);

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
    typingBySessionId,
    activeReplyToMessageId,
    draft,
    error,
    submitting,
    setDisplayName,
    setRouteName,
    setRoomIdInput,
    setDraft,
    setActiveReplyToMessageId,
    clearActiveReplyToMessageId,
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

  const emitTyping = (isTyping: boolean) => {
    const roomId = useAppStore.getState().currentRoomId;
    if (!roomId) {
      return;
    }

    emitTypingUpdate({ roomId, isTyping });
  };

  const resetTypingIdleTimer = () => {
    if (typingIdleTimeoutRef.current !== null) {
      window.clearTimeout(typingIdleTimeoutRef.current);
    }

    typingIdleTimeoutRef.current = window.setTimeout(() => {
      emitTyping(false);
      typingIdleTimeoutRef.current = null;
    }, 1400);
  };

  const clearTypingIdleTimer = () => {
    if (typingIdleTimeoutRef.current !== null) {
      window.clearTimeout(typingIdleTimeoutRef.current);
      typingIdleTimeoutRef.current = null;
    }
  };

  const handleRoomSuccess = (joined: RoomJoined) => {
    saveRoomIdentity(joined.roomId, joined.user.displayName);
    useAppStore.getState().applyRoomSuccess(joined);
  };

  const joinRoomById = async (name: string, roomId: string, mode: "push" | "replace" = "push") => {
    setPendingJoinRoomId(roomId);
    setSubmitting(true);
    setError(null);

    try {
      const joined = await joinRoomRequest({ displayName: name, roomId });
      handleRoomSuccess(joined);

      if (mode === "replace") {
        navigate(`/council/${joined.roomId}`, { replace: true });
      } else {
        navigate(`/council/${joined.roomId}`);
      }
    } catch (joinError) {
      useAppStore.getState().setPendingJoinRoomId(null);
      const message = joinError instanceof Error ? joinError.message : "Join failed.";
      const normalizedError = message.trim().toLowerCase();
      if (mode === "replace" && normalizedError === "room not found.") {
        clearRouteTarget();
        navigate("/", { replace: true });
      }
      useAppStore.getState().setError(message);
      useAppStore.getState().setSubmitting(false);
    }
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

    void (async () => {
      try {
        const result = await checkRoomRequest({ roomId: routeRoomId });
        if (!result.exists) {
          setError("room not found.");
          clearRouteTarget();
          navigate("/", { replace: true });
          return;
        }

        prepareRouteTarget(routeRoomId);

        const persistedIdentity = getRoomIdentity(routeRoomId);
        if (persistedIdentity) {
          setRouteIdentity(persistedIdentity);
          await joinRoomById(persistedIdentity, routeRoomId, "replace");
          return;
        }

        setIsNameModalOpen(true);
      } catch (checkError) {
        const message = checkError instanceof Error ? checkError.message : "Room check failed.";
        setError(message);
        clearRouteTarget();
        navigate("/", { replace: true });
      }
    })();
  }, [routeRoomId, currentRoomId, clearRouteTarget, prepareRouteTarget, setIsNameModalOpen, setRouteIdentity]);

  useEffect(() => {
    const onPresence = useAppStore.getState().applyPresence;
    const onMessageCreated = useAppStore.getState().appendMessage;
    const onMessageReactionUpdated = useAppStore.getState().applyMessageReactionUpdated;
    const onTypingUpdate = useAppStore.getState().applyTypingUpdate;
    const onSystemError = (payload: { message: string }) => useAppStore.getState().applySystemError(payload.message);

    socket.on("room:presence", onPresence);
    socket.on("message:created", onMessageCreated);
    socket.on("message:reaction-updated", onMessageReactionUpdated);
    socket.on("typing:update", onTypingUpdate);
    socket.on("system:error", onSystemError);

    return () => {
      socket.off("room:presence", onPresence);
      socket.off("message:created", onMessageCreated);
      socket.off("message:reaction-updated", onMessageReactionUpdated);
      socket.off("typing:update", onTypingUpdate);
      socket.off("system:error", onSystemError);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearTypingIdleTimer();
    };
  }, []);

  const createRoom = () => {
    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    void (async () => {
      try {
        const joined = await createRoomRequest({ displayName: displayName.trim() });
        handleRoomSuccess(joined);
        navigate(`/council/${joined.roomId}`);
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : "Room creation failed.");
        setSubmitting(false);
      }
    })();
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
    clearTypingIdleTimer();
    emitTyping(false);
    setPendingJoinRoomId(null);
    setSubmitting(true);

    void (async () => {
      try {
        await leaveRoomRequest();
        clearRoomSession();
        clearRouteTarget();
        navigate("/", { replace: true });
      } catch (leaveError) {
        suppressRouteAutoJoinRef.current = false;
        setError(leaveError instanceof Error ? leaveError.message : "Leave failed.");
        setSubmitting(false);
      }
    })();
  };

  const sendMessage = () => {
    if (!currentRoomId || !draft.trim()) {
      return;
    }

    const text = draft.trim();
    const clientMessageId = crypto.randomUUID();

    setSubmitting(true);
    setError(null);
    clearTypingIdleTimer();
    emitTyping(false);

    void (async () => {
      try {
        await sendMessageRequest({
          roomId: currentRoomId,
          text,
          clientMessageId,
          replyToMessageId: activeReplyToMessageId ?? undefined,
        });
        setDraft("");
        clearActiveReplyToMessageId();
      } catch (sendError) {
        setError(sendError instanceof Error ? sendError.message : "Send failed.");
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);

    if (!currentRoomId) {
      return;
    }

    if (!value.trim()) {
      clearTypingIdleTimer();
      emitTyping(false);
      return;
    }

    emitTyping(true);
    resetTypingIdleTimer();
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    if (!currentRoomId) {
      return;
    }

    emitReactionToggle({
      roomId: currentRoomId,
      messageId,
      emoji,
    });
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="scanlines-bg pointer-events-none absolute inset-0 opacity-[0.18]"
        aria-hidden="true"
      />
      <div className="relative z-[1] m-0 flex min-h-screen w-full max-w-none flex-col px-[1.1rem] pb-[2.8rem] pt-[2.2rem]">
        <AppHeader currentRoomId={currentRoomId} submitting={submitting} onLeaveRoom={leaveRoom} />

        {error ? (
          <div className="mb-[0.8rem] rounded-[var(--radius)] border border-danger-border bg-danger-bg px-[0.74rem] py-[0.58rem] text-danger-text">
            {error}
          </div>
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
            typingBySessionId={typingBySessionId}
            messages={messages}
            activeReplyToMessageId={activeReplyToMessageId}
            draft={draft}
            submitting={submitting}
            onDraftChange={handleDraftChange}
            onSelectReply={setActiveReplyToMessageId}
            onClearReply={clearActiveReplyToMessageId}
            onToggleReaction={handleToggleReaction}
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
