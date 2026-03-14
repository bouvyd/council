# Council

Ephemeral gaming chat rooms. Connect, talk. No extra steps.

## What we're building

### MVP
- **No login** — pick a display name when you connect
- **Temporary rooms** — created on demand, gone when everyone leaves
- **Group chat** with optimistic UI and presence
- **One-level threads** on messages
- **Reactions**

### Stretch goals
- **Screen sharing** via WebRTC
- **e2e encryption**

## Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node + TypeScript + Express + Socket.IO
- Shared: typed event contracts in `shared/`

## Scope boundaries (v1)

**In:** temporary rooms, display-name identity, group chat, presence, threads, reactions, GIFs, screen sharing  
**Out:** auth, persistence, file uploads, mobile apps, moderation, audio/video calling

## Plan

1. **Phase 0: Minimal Setup**
- Goal: empty structure that runs.
- Milestones:
- `backend/`, `frontend/`, `shared/` folders exist
- basic npm scripts run (`dev`, `build`, `check`)
- both apps start without feature logic

2. **Phase 1: Backend Heartbeat**
- Goal: prove backend runtime first.
- Milestones:
- `GET /health` returns `{ ok: true }`
- Socket.IO server boots and accepts a connection
- no room/chat behavior yet

3. **Phase 2: Plan Schema + API Contract**
- Goal: lock protocol before coding features.
- Milestones:
- first event list drafted: `room:create`, `room:join`, `room:leave`, `message:send`, `message:created`, `room:presence`
- ack shape standardized (`{ ok: true, data } | { ok: false, error }`)
- shared types in `shared/` match the doc

4. **Phase 3: Core Backend Realtime**
- Goal: backend-only chat core.
- Milestones:
- ephemeral in-memory room registry
- display-name identity tied to socket session
- join/leave works, presence broadcasts
- two clients can exchange messages with ack

5. **Phase 4: Minimal Frontend Slice**
- Goal: thin UI over existing backend.
- Milestones:
- name input + create/join room form
- message list + composer + presence list
- end-to-end flow works in 2 browser tabs

6. **Phase 5: Stability Pass**
- Goal: make MVP core reliable before new features.
- Milestones:
- optimistic send + ack reconciliation
- reconnect behavior defined and tested
- lightweight protocol tests for join/leave/send

7. **Phase 6: MVP Feature Increments**
- Goal: one feature at a time, full cycle each.
- Milestones:
- reactions complete (types + backend + UI)
- threads complete (one-level only)
- no protocol regressions in core chat

8. **Phase 7: Stretch Goals**
- Goal: isolate complex features.
- Milestones:
- GIF embeds
- screen-share signaling + WebRTC
- evaluate E2E encryption feasibility (likely post-MVP)
