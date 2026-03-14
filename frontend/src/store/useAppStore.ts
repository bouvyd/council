import { create } from "zustand";
import type { ChatMessage, PresenceUpdate, RoomJoined, TypingUpdate, UserIdentity } from "@council/shared";

type JoinMode = "push" | "replace";

export type JoinRequest = {
  name: string;
  roomId: string;
  mode: JoinMode;
};

type AppStore = {
  displayName: string;
  routeName: string;
  roomIdInput: string;
  currentRoomId: string | null;
  currentUser: UserIdentity | null;
  targetRouteRoomId: string | null;
  pendingJoinRoomId: string | null;
  isNameModalOpen: boolean;
  presenceRoomId: string | null;
  presence: UserIdentity[];
  messages: ChatMessage[];
  typingBySessionId: Record<string, boolean>;
  draft: string;
  error: string | null;
  submitting: boolean;

  setDisplayName: (value: string) => void;
  setRouteName: (value: string) => void;
  setRoomIdInput: (value: string) => void;
  setDraft: (value: string) => void;
  setError: (value: string | null) => void;
  setSubmitting: (value: boolean) => void;
  setIsNameModalOpen: (value: boolean) => void;
  setPendingJoinRoomId: (roomId: string | null) => void;
  clearRouteTarget: () => void;
  prepareRouteTarget: (roomId: string) => void;
  setRouteIdentity: (name: string) => void;
  applyPresence: (payload: PresenceUpdate) => void;
  appendMessage: (payload: ChatMessage) => void;
  applyTypingUpdate: (payload: TypingUpdate) => void;
  applySystemError: (message: string) => void;
  applyRoomSuccess: (joined: RoomJoined) => void;
  clearRoomSession: () => void;
};

function normalizeRoomId(value: string | null): string | null {
  return value?.trim().toLowerCase() ?? null;
}

export function getNormalizedRoomId(value: string | null): string | null {
  return normalizeRoomId(value);
}

export const useAppStore = create<AppStore>((set, get) => ({
  displayName: "",
  routeName: "",
  roomIdInput: "",
  currentRoomId: null,
  currentUser: null,
  targetRouteRoomId: null,
  pendingJoinRoomId: null,
  isNameModalOpen: false,
  presenceRoomId: null,
  presence: [],
  messages: [],
  typingBySessionId: {},
  draft: "",
  error: null,
  submitting: false,

  setDisplayName: (value) => set({ displayName: value }),
  setRouteName: (value) => set({ routeName: value }),
  setRoomIdInput: (value) => set({ roomIdInput: value }),
  setDraft: (value) => set({ draft: value }),
  setError: (value) => set({ error: value }),
  setSubmitting: (value) => set({ submitting: value }),
  setIsNameModalOpen: (value) => set({ isNameModalOpen: value }),
  setPendingJoinRoomId: (roomId) => set({ pendingJoinRoomId: normalizeRoomId(roomId) }),

  clearRouteTarget: () => set({ targetRouteRoomId: null, isNameModalOpen: false }),

  prepareRouteTarget: (roomId) =>
    set({
      targetRouteRoomId: roomId,
      roomIdInput: roomId,
      error: null,
    }),

  setRouteIdentity: (name) =>
    set({
      routeName: name,
      displayName: name,
      isNameModalOpen: false,
    }),

  applyPresence: (payload) => {
    const state = get();
    const activeRoomId = state.currentRoomId ?? state.pendingJoinRoomId;

    if (!activeRoomId || normalizeRoomId(payload.roomId) !== normalizeRoomId(activeRoomId)) {
      return;
    }

    set({
      presence: payload.users,
      presenceRoomId: payload.roomId,
    });
  },

  appendMessage: (payload) => {
    const state = get();

    if (!state.currentRoomId || normalizeRoomId(payload.roomId) !== normalizeRoomId(state.currentRoomId)) {
      return;
    }

    set({ messages: [...state.messages, payload] });
  },

  applyTypingUpdate: (payload) => {
    const state = get();
    const activeRoomId = state.currentRoomId ?? state.pendingJoinRoomId;

    if (!activeRoomId || normalizeRoomId(payload.roomId) !== normalizeRoomId(activeRoomId)) {
      return;
    }

    const nextTyping = { ...state.typingBySessionId };
    if (payload.isTyping) {
      nextTyping[payload.sessionId] = true;
    } else {
      delete nextTyping[payload.sessionId];
    }

    set({ typingBySessionId: nextTyping });
  },

  applySystemError: (message) => set({ error: message, submitting: false }),

  applyRoomSuccess: (joined) => {
    const state = get();
    const nextPresence =
      normalizeRoomId(state.presenceRoomId) === normalizeRoomId(joined.roomId)
        ? state.presence
        : [joined.user];

    set({
      pendingJoinRoomId: null,
      currentRoomId: joined.roomId,
      currentUser: joined.user,
      roomIdInput: joined.roomId,
      targetRouteRoomId: null,
      isNameModalOpen: false,
      presence: nextPresence,
      presenceRoomId: joined.roomId,
      messages: [],
      typingBySessionId: {},
      error: null,
      submitting: false,
    });
  },

  clearRoomSession: () =>
    set({
      currentRoomId: null,
      currentUser: null,
      pendingJoinRoomId: null,
      presenceRoomId: null,
      presence: [],
      messages: [],
      typingBySessionId: {},
      draft: "",
      error: null,
      submitting: false,
    }),
}));
