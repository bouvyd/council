import type { ScreenSignal, ScreenSignalRelayed } from "@council/shared";

type ScreenShareMeshOptions = {
  onSignal: (payload: { roomId: string; channelId: string; shareId: string; toSessionId: string; signal: ScreenSignal }) => void;
  onError: (message: string) => void;
  onWatchedStreamChange: (stream: MediaStream | null) => void;
  onLocalShareEnded: (payload: { roomId: string; channelId: string; shareId: string }) => void;
};

type LocalShareState = {
  roomId: string;
  channelId: string;
  selfSessionId: string;
  shareId: string;
  stream: MediaStream;
  hasAudio: boolean;
  peerConnections: Map<string, RTCPeerConnection>;
};

type WatchedShareState = {
  roomId: string;
  channelId: string;
  selfSessionId: string;
  shareId: string;
  ownerSessionId: string;
  peerConnection: RTCPeerConnection;
};

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302"] }];

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

export class ScreenShareMeshManager {
  private readonly onSignal: ScreenShareMeshOptions["onSignal"];
  private readonly onError: ScreenShareMeshOptions["onError"];
  private readonly onWatchedStreamChange: ScreenShareMeshOptions["onWatchedStreamChange"];
  private readonly onLocalShareEnded: ScreenShareMeshOptions["onLocalShareEnded"];
  private readonly rtcConfig: RTCConfiguration;

  private localShare: LocalShareState | null = null;
  private watchedShare: WatchedShareState | null = null;
  private pendingIceCandidates = new Map<string, RTCIceCandidateInit[]>();

  constructor(options: ScreenShareMeshOptions) {
    this.onSignal = options.onSignal;
    this.onError = options.onError;
    this.onWatchedStreamChange = options.onWatchedStreamChange;
    this.onLocalShareEnded = options.onLocalShareEnded;
    this.rtcConfig = { iceServers: parseIceServers() };
  }

  async startSharing(input: {
    roomId: string;
    channelId: string;
    selfSessionId: string;
    shareId: string;
  }): Promise<{ shareId: string; hasAudio: boolean }> {
    this.stopSharing();

    const stream = await this.captureDisplayStream();
    const hasAudio = stream.getAudioTracks().length > 0;
    const localShare: LocalShareState = {
      ...input,
      stream,
      hasAudio,
      peerConnections: new Map(),
    };

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.onended = () => {
        const endedShare = this.localShare;
        this.stopSharing();
        if (endedShare) {
          this.onLocalShareEnded({
            roomId: endedShare.roomId,
            channelId: endedShare.channelId,
            shareId: endedShare.shareId,
          });
        }
      };
    }

    this.localShare = localShare;
    return {
      shareId: localShare.shareId,
      hasAudio,
    };
  }

  stopSharing() {
    if (!this.localShare) {
      return;
    }

    for (const peerConnection of this.localShare.peerConnections.values()) {
      peerConnection.close();
    }

    for (const track of this.localShare.stream.getTracks()) {
      track.onended = null;
      track.stop();
    }

    this.clearPendingIceCandidatesForShare(this.localShare.shareId);
    this.localShare = null;
  }

  getLocalPreviewStream(): MediaStream | null {
    return this.localShare?.stream ?? null;
  }

  async watchShare(input: {
    roomId: string;
    channelId: string;
    selfSessionId: string;
    shareId: string;
    ownerSessionId: string;
  }) {
    if (
      this.watchedShare &&
      this.watchedShare.roomId === input.roomId &&
      this.watchedShare.channelId === input.channelId &&
      this.watchedShare.shareId === input.shareId &&
      this.watchedShare.ownerSessionId === input.ownerSessionId
    ) {
      return;
    }

    this.stopWatching();

    const peerConnection = new RTCPeerConnection(this.rtcConfig);
    this.watchedShare = {
      ...input,
      peerConnection,
    };

    peerConnection.addTransceiver("video", { direction: "recvonly" });
    peerConnection.addTransceiver("audio", { direction: "recvonly" });

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate || !this.watchedShare) {
        return;
      }

      this.onSignal({
        roomId: this.watchedShare.roomId,
        channelId: this.watchedShare.channelId,
        shareId: this.watchedShare.shareId,
        toSessionId: this.watchedShare.ownerSessionId,
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
      if (stream) {
        this.onWatchedStreamChange(stream);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(peerConnection.connectionState)) {
        if (this.watchedShare?.peerConnection === peerConnection) {
          this.stopWatching();
        }
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    this.onSignal({
      roomId: input.roomId,
      channelId: input.channelId,
      shareId: input.shareId,
      toSessionId: input.ownerSessionId,
      signal: {
        type: "offer",
        sdp: offer.sdp ?? "",
      },
    });
  }

  stopWatching() {
    if (!this.watchedShare) {
      this.onWatchedStreamChange(null);
      return;
    }

    this.watchedShare.peerConnection.close();
    this.clearPendingIceCandidatesForShare(this.watchedShare.shareId);
    this.watchedShare = null;
    this.onWatchedStreamChange(null);
  }

  async handleSignal(payload: ScreenSignalRelayed) {
    try {
      if (this.localShare && this.matchesLocalShare(payload)) {
        await this.handleLocalShareSignal(payload);
        return;
      }

      if (this.watchedShare && this.matchesWatchedShare(payload)) {
        await this.handleWatchedShareSignal(payload);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Screen share signaling failed.";
      this.onError(message);
    }
  }

  private matchesLocalShare(payload: ScreenSignalRelayed): boolean {
    return Boolean(
      this.localShare &&
      payload.roomId === this.localShare.roomId &&
      payload.channelId === this.localShare.channelId &&
      payload.shareId === this.localShare.shareId,
    );
  }

  private matchesWatchedShare(payload: ScreenSignalRelayed): boolean {
    return Boolean(
      this.watchedShare &&
      payload.roomId === this.watchedShare.roomId &&
      payload.channelId === this.watchedShare.channelId &&
      payload.shareId === this.watchedShare.shareId &&
      payload.fromSessionId === this.watchedShare.ownerSessionId,
    );
  }

  private async handleLocalShareSignal(payload: ScreenSignalRelayed) {
    if (!this.localShare) {
      return;
    }

    const peerConnection = this.getOrCreateLocalSharePeerConnection(payload.fromSessionId);

    if (payload.signal.type === "offer") {
      await peerConnection.setRemoteDescription({ type: "offer", sdp: payload.signal.sdp });
      await this.flushPendingIceCandidates(this.getPendingIceKey(payload.shareId, payload.fromSessionId), peerConnection);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      this.onSignal({
        roomId: this.localShare.roomId,
        channelId: this.localShare.channelId,
        shareId: this.localShare.shareId,
        toSessionId: payload.fromSessionId,
        signal: {
          type: "answer",
          sdp: answer.sdp ?? "",
        },
      });
      return;
    }

    if (payload.signal.type === "ice") {
      const candidate = this.toIceCandidate(payload.signal);
      if (!peerConnection.remoteDescription) {
        this.queuePendingIceCandidate(this.getPendingIceKey(payload.shareId, payload.fromSessionId), candidate);
        return;
      }

      await this.addIceCandidateSafely(peerConnection, candidate);
    }
  }

  private async handleWatchedShareSignal(payload: ScreenSignalRelayed) {
    if (!this.watchedShare) {
      return;
    }

    const peerConnection = this.watchedShare.peerConnection;

    if (payload.signal.type === "answer") {
      await peerConnection.setRemoteDescription({ type: "answer", sdp: payload.signal.sdp });
      await this.flushPendingIceCandidates(this.getPendingIceKey(payload.shareId, payload.fromSessionId), peerConnection);
      return;
    }

    if (payload.signal.type === "ice") {
      const candidate = this.toIceCandidate(payload.signal);
      if (!peerConnection.remoteDescription) {
        this.queuePendingIceCandidate(this.getPendingIceKey(payload.shareId, payload.fromSessionId), candidate);
        return;
      }

      await this.addIceCandidateSafely(peerConnection, candidate);
    }
  }

  private getOrCreateLocalSharePeerConnection(peerSessionId: string): RTCPeerConnection {
    if (!this.localShare) {
      throw new Error("Local screen share is not active.");
    }

    const existing = this.localShare.peerConnections.get(peerSessionId);
    if (existing) {
      return existing;
    }

    const peerConnection = new RTCPeerConnection(this.rtcConfig);
    for (const track of this.localShare.stream.getTracks()) {
      peerConnection.addTrack(track, this.localShare.stream);
    }

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate || !this.localShare) {
        return;
      }

      this.onSignal({
        roomId: this.localShare.roomId,
        channelId: this.localShare.channelId,
        shareId: this.localShare.shareId,
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

    peerConnection.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(peerConnection.connectionState)) {
        peerConnection.close();
        this.localShare?.peerConnections.delete(peerSessionId);
      }
    };

    this.localShare.peerConnections.set(peerSessionId, peerConnection);
    return peerConnection;
  }

  private async captureDisplayStream(): Promise<MediaStream> {
    if (typeof RTCPeerConnection === "undefined") {
      throw new Error("WebRTC is not supported in this browser.");
    }

    const mediaDevices = globalThis.navigator?.mediaDevices;
    if (!mediaDevices || typeof mediaDevices.getDisplayMedia !== "function") {
      throw new Error("Screen sharing is unavailable in this browser.");
    }

    try {
      return await mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          throw new Error("Screen sharing was canceled or denied.");
        }
        if (error.name === "NotReadableError") {
          throw new Error("The selected screen could not be captured.");
        }
      }

      try {
        return await mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      } catch {
        throw error;
      }
    }
  }

  private getPendingIceKey(shareId: string, peerSessionId: string): string {
    return `${shareId}:${peerSessionId}`;
  }

  private clearPendingIceCandidatesForShare(shareId: string) {
    for (const key of this.pendingIceCandidates.keys()) {
      if (key.startsWith(`${shareId}:`)) {
        this.pendingIceCandidates.delete(key);
      }
    }
  }

  private queuePendingIceCandidate(key: string, candidate: RTCIceCandidateInit) {
    const queued = this.pendingIceCandidates.get(key) ?? [];
    queued.push(candidate);
    this.pendingIceCandidates.set(key, queued);
  }

  private async flushPendingIceCandidates(key: string, peerConnection: RTCPeerConnection) {
    const queued = this.pendingIceCandidates.get(key);
    if (!queued || queued.length === 0) {
      return;
    }

    this.pendingIceCandidates.delete(key);
    for (const candidate of queued) {
      await this.addIceCandidateSafely(peerConnection, candidate);
    }
  }

  private toIceCandidate(signal: Extract<ScreenSignal, { type: "ice" }>): RTCIceCandidateInit {
    return {
      candidate: signal.candidate,
      sdpMid: signal.sdpMid ?? null,
      sdpMLineIndex: signal.sdpMLineIndex ?? null,
      usernameFragment: signal.usernameFragment ?? null,
    };
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
