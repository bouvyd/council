import type { VoiceSignal, VoiceSignalRelayed, UserIdentity } from "@council/shared";

type VoiceMeshOptions = {
  onSignal: (payload: { roomId: string; channelId: string; toSessionId: string; signal: VoiceSignal }) => void;
  onError: (message: string) => void;
};

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302"] },
];

function parseIceServers(): RTCIceServer[] {
  const raw = import.meta.env.VITE_ICE_SERVERS_JSON as string | undefined;
  if (!raw) {
    return DEFAULT_ICE_SERVERS;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as RTCIceServer[];
    }
  } catch {
    // Fall back to default STUN if env is malformed.
  }

  return DEFAULT_ICE_SERVERS;
}

export class VoiceMeshManager {
  private readonly onSignal: VoiceMeshOptions["onSignal"];
  private readonly onError: VoiceMeshOptions["onError"];
  private readonly rtcConfig: RTCConfiguration;

  private roomId: string | null = null;
  private channelId: string | null = null;
  private selfSessionId: string | null = null;
  private localStream: MediaStream | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private pendingIceCandidates = new Map<string, RTCIceCandidateInit[]>();
  private remoteAudioElements = new Map<string, HTMLAudioElement>();

  constructor(options: VoiceMeshOptions) {
    this.onSignal = options.onSignal;
    this.onError = options.onError;
    this.rtcConfig = { iceServers: parseIceServers() };
  }

  async joinChannel(input: {
    roomId: string;
    channelId: string;
    selfSessionId: string;
    participants: UserIdentity[];
  }) {
    if (
      this.roomId !== input.roomId ||
      this.channelId !== input.channelId ||
      this.selfSessionId !== input.selfSessionId
    ) {
      this.leaveChannel();
      this.roomId = input.roomId;
      this.channelId = input.channelId;
      this.selfSessionId = input.selfSessionId;
    }

    try {
      await this.ensureLocalAudioStream();
      await this.syncPeers(input.participants.map((participant) => participant.sessionId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Voice setup failed.";
      this.onError(message);
      this.leaveChannel();
    }
  }

  leaveChannel() {
    for (const peerConnection of this.peerConnections.values()) {
      peerConnection.close();
    }
    this.peerConnections.clear();
    this.pendingIceCandidates.clear();

    for (const audioElement of this.remoteAudioElements.values()) {
      audioElement.srcObject = null;
      audioElement.remove();
    }
    this.remoteAudioElements.clear();

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }

    this.roomId = null;
    this.channelId = null;
    this.selfSessionId = null;
  }

  async handleSignal(payload: VoiceSignalRelayed) {
    if (!this.roomId || !this.channelId || !this.selfSessionId) {
      return;
    }

    if (payload.roomId !== this.roomId || payload.channelId !== this.channelId) {
      return;
    }

    try {
      await this.ensureLocalAudioStream();
      const peerConnection = this.getOrCreatePeerConnection(payload.fromSessionId);

      if (payload.signal.type === "offer") {
        await peerConnection.setRemoteDescription({ type: "offer", sdp: payload.signal.sdp });
        await this.flushPendingIceCandidates(payload.fromSessionId, peerConnection);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        this.onSignal({
          roomId: this.roomId,
          channelId: this.channelId,
          toSessionId: payload.fromSessionId,
          signal: {
            type: "answer",
            sdp: answer.sdp ?? "",
          },
        });
        return;
      }

      if (payload.signal.type === "answer") {
        await peerConnection.setRemoteDescription({ type: "answer", sdp: payload.signal.sdp });
        await this.flushPendingIceCandidates(payload.fromSessionId, peerConnection);
        return;
      }

      const candidate = {
        candidate: payload.signal.candidate,
        sdpMid: payload.signal.sdpMid ?? null,
        sdpMLineIndex: payload.signal.sdpMLineIndex ?? null,
        usernameFragment: payload.signal.usernameFragment ?? null,
      } satisfies RTCIceCandidateInit;

      if (!peerConnection.remoteDescription) {
        const queued = this.pendingIceCandidates.get(payload.fromSessionId) ?? [];
        queued.push(candidate);
        this.pendingIceCandidates.set(payload.fromSessionId, queued);
        return;
      }

      await this.addIceCandidateSafely(peerConnection, candidate);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Voice signal handling failed.";
      this.onError(message);
    }
  }

  private async ensureLocalAudioStream() {
    if (this.localStream) {
      return;
    }

    if (typeof RTCPeerConnection === "undefined") {
      throw new Error("WebRTC is not supported in this browser.");
    }

    const mediaDevices = globalThis.navigator?.mediaDevices;
    if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function") {
      throw new Error(
        "Microphone capture is unavailable. Use a supported browser and HTTPS (or localhost).",
      );
    }

    try {
      this.localStream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          throw new Error("Microphone permission was denied.");
        }
        if (error.name === "NotFoundError") {
          throw new Error("No microphone device was found.");
        }
        if (error.name === "NotReadableError") {
          throw new Error("Microphone is busy or unavailable.");
        }
      }

      throw error;
    }
  }

  private async syncPeers(participantSessionIds: string[]) {
    if (!this.selfSessionId) {
      return;
    }

    const targetPeers = new Set(
      participantSessionIds.filter((sessionId) => sessionId !== this.selfSessionId),
    );

    for (const [sessionId, peerConnection] of this.peerConnections.entries()) {
      if (!targetPeers.has(sessionId)) {
        peerConnection.close();
        this.peerConnections.delete(sessionId);

        const audioElement = this.remoteAudioElements.get(sessionId);
        if (audioElement) {
          audioElement.srcObject = null;
          audioElement.remove();
          this.remoteAudioElements.delete(sessionId);
        }
      }
    }

    for (const sessionId of targetPeers) {
      if (this.peerConnections.has(sessionId)) {
        continue;
      }

      if (this.selfSessionId.localeCompare(sessionId) > 0) {
        continue;
      }

      const peerConnection = this.getOrCreatePeerConnection(sessionId);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      this.onSignal({
        roomId: this.roomId!,
        channelId: this.channelId!,
        toSessionId: sessionId,
        signal: {
          type: "offer",
          sdp: offer.sdp ?? "",
        },
      });
    }
  }

  private getOrCreatePeerConnection(peerSessionId: string): RTCPeerConnection {
    const existing = this.peerConnections.get(peerSessionId);
    if (existing) {
      return existing;
    }

    const peerConnection = new RTCPeerConnection(this.rtcConfig);

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        peerConnection.addTrack(track, this.localStream);
      }
    }

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate || !this.roomId || !this.channelId) {
        return;
      }

      this.onSignal({
        roomId: this.roomId,
        channelId: this.channelId,
        toSessionId: peerSessionId,
        signal: {
          type: "ice",
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: event.candidate.usernameFragment,
        },
      });
    };

    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) {
        return;
      }

      const existingAudio = this.remoteAudioElements.get(peerSessionId);
      if (existingAudio) {
        existingAudio.srcObject = stream;
        return;
      }

      const audioElement = document.createElement("audio");
      audioElement.autoplay = true;
      audioElement.setAttribute("playsinline", "true");
      audioElement.srcObject = stream;
      audioElement.style.display = "none";
      document.body.appendChild(audioElement);
      this.remoteAudioElements.set(peerSessionId, audioElement);
    };

    peerConnection.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(peerConnection.connectionState)) {
        peerConnection.close();
        this.peerConnections.delete(peerSessionId);

        const audioElement = this.remoteAudioElements.get(peerSessionId);
        if (audioElement) {
          audioElement.srcObject = null;
          audioElement.remove();
          this.remoteAudioElements.delete(peerSessionId);
        }
      }
    };

    this.peerConnections.set(peerSessionId, peerConnection);
    return peerConnection;
  }

  private async flushPendingIceCandidates(peerSessionId: string, peerConnection: RTCPeerConnection) {
    const queued = this.pendingIceCandidates.get(peerSessionId);
    if (!queued || queued.length === 0) {
      return;
    }

    this.pendingIceCandidates.delete(peerSessionId);

    for (const candidate of queued) {
      await this.addIceCandidateSafely(peerConnection, candidate);
    }
  }

  private async addIceCandidateSafely(
    peerConnection: RTCPeerConnection,
    candidate: RTCIceCandidateInit,
  ) {
    try {
      await peerConnection.addIceCandidate(candidate);
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "OperationError" &&
        /ufrag/i.test(error.message)
      ) {
        return;
      }

      throw error;
    }
  }
}
