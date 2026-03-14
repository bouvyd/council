const STORAGE_KEY = "council.identity.byRoom.v1";
const ROOM_IDENTITY_TTL_MS = 24 * 60 * 60 * 1000;

type PersistedRoomIdentity = {
  displayName: string;
  lastSeenAt: string;
};

type PersistedIdentityStore = {
  version: 1;
  rooms: Record<string, PersistedRoomIdentity>;
};

function nowIso() {
  return new Date().toISOString();
}

function isExpired(lastSeenAt: string, nowMs: number): boolean {
  const parsed = Date.parse(lastSeenAt);
  if (Number.isNaN(parsed)) {
    return true;
  }

  return nowMs - parsed > ROOM_IDENTITY_TTL_MS;
}

function readStore(): PersistedIdentityStore {
  if (typeof window === "undefined") {
    return { version: 1, rooms: {} };
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return { version: 1, rooms: {} };
    }

    const parsed = JSON.parse(rawValue) as Partial<PersistedIdentityStore>;
    if (parsed.version !== 1 || !parsed.rooms || typeof parsed.rooms !== "object") {
      return { version: 1, rooms: {} };
    }

    const nowMs = Date.now();
    const cleanedRooms: Record<string, PersistedRoomIdentity> = {};

    for (const [roomId, value] of Object.entries(parsed.rooms)) {
      if (!value || typeof value !== "object") {
        continue;
      }

      const displayName = "displayName" in value ? String(value.displayName ?? "") : "";
      const lastSeenAt = "lastSeenAt" in value ? String(value.lastSeenAt ?? "") : "";

      if (!displayName.trim() || !lastSeenAt || isExpired(lastSeenAt, nowMs)) {
        continue;
      }

      cleanedRooms[roomId] = {
        displayName,
        lastSeenAt,
      };
    }

    return {
      version: 1,
      rooms: cleanedRooms,
    };
  } catch {
    return { version: 1, rooms: {} };
  }
}

function writeStore(store: PersistedIdentityStore) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage write failures (private mode, quota, etc).
  }
}

export function saveRoomIdentity(roomId: string, displayName: string) {
  const trimmedRoomId = roomId.trim();
  const trimmedName = displayName.trim();

  if (!trimmedRoomId || !trimmedName) {
    return;
  }

  const store = readStore();
  store.rooms[trimmedRoomId] = {
    displayName: trimmedName,
    lastSeenAt: nowIso(),
  };

  writeStore(store);
}

export function getRoomIdentity(roomId: string): string | null {
  const trimmedRoomId = roomId.trim();
  if (!trimmedRoomId) {
    return null;
  }

  const store = readStore();
  const identity = store.rooms[trimmedRoomId];

  if (!identity) {
    return null;
  }

  writeStore(store);
  return identity.displayName;
}
