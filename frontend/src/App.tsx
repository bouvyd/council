import { useEffect, useRef, useState } from "react";
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

function generateClientMessageId(): string {
  const webCrypto = globalThis.crypto;

  if (webCrypto?.randomUUID) {
    return webCrypto.randomUUID();
  }

  if (webCrypto?.getRandomValues) {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));

    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }

  return `msg-${Date.now()}-${Math.random().toString(16).slice(2, 10)}-${Math.random().toString(16).slice(2, 10)}`;
}

function AppShell() {
  const navigate = useNavigate();
  const routeMatch = useMatch("/council/:roomId");
  const routeRoomId = routeMatch?.params.roomId ?? null;
  const suppressRouteAutoJoinRef = useRef(false);
  const typingIdleTimeoutRef = useRef<number | null>(null);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<"idle" | "copied" | "error">("idle");

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

  useEffect(() => {
    setIsInfoPanelOpen(false);
  }, [currentRoomId]);

  useEffect(() => {
    if (inviteStatus !== "copied") {
      return;
    }

    const timeoutId = window.setTimeout(() => setInviteStatus("idle"), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [inviteStatus]);

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
    setIsInfoPanelOpen(false);
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

  const copyInviteLink = async () => {
    if (!currentRoomId) {
      return;
    }

    const inviteUrl = new URL(`/council/${currentRoomId}`, window.location.origin).toString();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = inviteUrl;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setInviteStatus("copied");
    } catch {
      setInviteStatus("error");
    }
  };

  const sendMessage = () => {
    if (!currentRoomId || !draft.trim()) {
      return;
    }

    const text = draft.trim();
    const clientMessageId = generateClientMessageId();

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
    <main className="relative min-h-screen min-h-[100dvh] overflow-hidden">
      <div
        className="scanlines-bg pointer-events-none absolute inset-0 opacity-[0.18]"
        aria-hidden="true"
      />
      <div className="relative z-[1] m-0 flex min-h-screen min-h-[100dvh] w-full max-w-none flex-col px-[1.1rem] pb-[2.8rem] pt-[2.2rem]">
        <AppHeader
          currentRoomId={currentRoomId}
          submitting={submitting}
          inviteStatus={inviteStatus}
          isInfoPanelOpen={isInfoPanelOpen}
          onInvite={copyInviteLink}
          onLeaveRoom={leaveRoom}
          onToggleInfoPanel={() => setIsInfoPanelOpen((current) => !current)}
        />

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
            currentRoomId={currentRoomId}
            currentUser={currentUser}
            presence={presence}
            typingBySessionId={typingBySessionId}
            messages={messages}
            activeReplyToMessageId={activeReplyToMessageId}
            draft={draft}
            submitting={submitting}
            inviteStatus={inviteStatus}
            isInfoPanelOpen={isInfoPanelOpen}
            onDraftChange={handleDraftChange}
            onInvite={copyInviteLink}
            onLeaveRoom={leaveRoom}
            onCloseInfoPanel={() => setIsInfoPanelOpen(false)}
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
