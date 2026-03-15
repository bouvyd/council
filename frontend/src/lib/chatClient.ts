import type {
  AckResult,
  CheckRoomInput,
  CreateRoomInput,
  RenameDisplayNameInput,
  ReactionToggleInput,
  RoomJoined,
  RoomRef,
  SendMessageInput,
  VoiceChannelCreateInput,
  VoiceChannelJoinInput,
  VoiceChannelLeaveInput,
  VoiceChannelsGetInput,
  VoiceChannelsUpdate,
  VoiceSignalRelayInput,
} from "@council/shared";
import { socket } from "./socket";

function fromAck<T>(result: AckResult<T>): T {
  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.data;
}

export function createRoomRequest(input: CreateRoomInput): Promise<RoomJoined> {
  return new Promise((resolve, reject) => {
    socket.emit("room:create", input, (result) => {
      try {
        resolve(fromAck(result));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function joinRoomRequest(input: { displayName: string; roomId: string }): Promise<RoomJoined> {
  return new Promise((resolve, reject) => {
    socket.emit("room:join", input, (result) => {
      try {
        resolve(fromAck(result));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function checkRoomRequest(input: CheckRoomInput): Promise<{ exists: boolean }> {
  return new Promise((resolve, reject) => {
    socket.emit("room:check", input, (result) => {
      try {
        resolve(fromAck(result));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function leaveRoomRequest(): Promise<RoomRef> {
  return new Promise((resolve, reject) => {
    socket.emit("room:leave", (result) => {
      try {
        resolve(fromAck(result));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function renameDisplayNameRequest(input: RenameDisplayNameInput): Promise<RoomJoined> {
  return new Promise((resolve, reject) => {
    socket.emit("room:rename", input, (result) => {
      try {
        resolve(fromAck(result));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function sendMessageRequest(input: SendMessageInput): Promise<{ messageId: string }> {
  return new Promise((resolve, reject) => {
    socket.emit("message:send", input, (result) => {
      try {
        resolve(fromAck(result));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function emitTypingUpdate(input: { roomId: string; isTyping: boolean }) {
  socket.emit("typing:update", input);
}

export function emitReactionToggle(input: ReactionToggleInput) {
  socket.emit("reaction:toggle", input);
}

export function getVoiceChannelsRequest(input: VoiceChannelsGetInput): Promise<VoiceChannelsUpdate> {
  return new Promise((resolve, reject) => {
    socket.emit("voice:channels:get", input, (result) => {
      try {
        resolve(fromAck(result));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function createVoiceChannelRequest(input: VoiceChannelCreateInput): Promise<VoiceChannelsUpdate> {
  return new Promise((resolve, reject) => {
    socket.emit("voice:channel:create", input, (result) => {
      try {
        resolve(fromAck(result));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function joinVoiceChannelRequest(input: VoiceChannelJoinInput): Promise<VoiceChannelsUpdate> {
  return new Promise((resolve, reject) => {
    socket.emit("voice:channel:join", input, (result) => {
      try {
        resolve(fromAck(result));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function leaveVoiceChannelRequest(input: VoiceChannelLeaveInput): Promise<VoiceChannelsUpdate> {
  return new Promise((resolve, reject) => {
    socket.emit("voice:channel:leave", input, (result) => {
      try {
        resolve(fromAck(result));
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function emitVoiceSignal(input: VoiceSignalRelayInput) {
  socket.emit("voice:signal", input);
}
