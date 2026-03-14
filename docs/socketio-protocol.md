# Socket.IO Messaging Protocol (v0)

This document defines the initial realtime contract for core chat flows.

## Envelope Pattern

- Client-originated mutations use acknowledgements.
- Ack shape is consistent across events:
  - Success: `{ ok: true, data: ... }`
  - Failure: `{ ok: false, error: string }`

## Client -> Server Events

### `room:create`
- Payload:
```json
{ "displayName": "damien" }
```
- Ack success data:
```json
{ "roomId": "a1b2c3d4", "user": { "sessionId": "socket-id", "displayName": "damien" } }
```

### `room:join`
- Payload:
```json
{ "roomId": "a1b2c3d4", "displayName": "damien" }
```
- Ack success data: same shape as `room:create`.

### `room:leave`
- Payload: none.
- Ack success data:
```json
{ "roomId": "a1b2c3d4" }
```

### `message:send`
- Payload:
```json
{ "roomId": "a1b2c3d4", "text": "hello", "clientMessageId": "uuid" }
```
- Ack success data:
```json
{ "messageId": "server-id" }
```

## Server -> Client Events

### `room:presence`
Broadcast participant list changes in a room.

### `message:created`
Canonical created message broadcast to the room.

### `system:error`
Non-fatal server error payload for current socket context.

## Core Rules

- Server owns canonical message IDs and timestamps.
- `clientMessageId` is for optimistic reconciliation only.
- Room state is ephemeral for MVP.
- Reconnection handling will be expanded in a later phase.
