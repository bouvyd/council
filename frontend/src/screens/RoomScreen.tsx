import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, UserIdentity, VoiceChannel } from "@council/shared";
import { MessageComposer } from "../components/MessageComposer";
import { MessageItem } from "../components/MessageItem";

type RoomScreenProps = {
  currentRoomId: string;
  currentUser: UserIdentity | null;
  presence: UserIdentity[];
  voiceChannels: VoiceChannel[];
  activeVoiceChannelId: string | null;
  isLocalAudioMuted: boolean;
  mutedVoiceParticipantIds: string[];
  typingBySessionId: Record<string, boolean>;
  messages: ChatMessage[];
  activeReplyToMessageId: string | null;
  draft: string;
  submitting: boolean;
  inviteStatus: "idle" | "copied" | "error";
  isInfoPanelOpen: boolean;
  onDraftChange: (value: string) => void;
  onInvite: () => void;
  onLeaveRoom: () => void;
  onCloseInfoPanel: () => void;
  onRenameDisplayName: () => void;
  onCreateVoiceChannel: () => void;
  onJoinVoiceChannel: (channelId: string) => void;
  onToggleLocalAudioMute: () => void;
  onDisconnectVoice: () => void;
  onToggleParticipantAudio: (sessionId: string) => void;
  onSelectReply: (messageId: string) => void;
  onClearReply: () => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onSendMessage: () => void;
};

function truncate(text: string, length: number): string {
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length)}...`;
}

export function RoomScreen({
  currentRoomId,
  currentUser,
  presence,
  voiceChannels,
  activeVoiceChannelId,
  isLocalAudioMuted,
  mutedVoiceParticipantIds,
  typingBySessionId,
  messages,
  activeReplyToMessageId,
  draft,
  submitting,
  inviteStatus,
  isInfoPanelOpen,
  onDraftChange,
  onInvite,
  onLeaveRoom,
  onCloseInfoPanel,
  onRenameDisplayName,
  onCreateVoiceChannel,
  onJoinVoiceChannel,
  onToggleLocalAudioMute,
  onDisconnectVoice,
  onToggleParticipantAudio,
  onSelectReply,
  onClearReply,
  onToggleReaction,
  onSendMessage,
}: RoomScreenProps) {
  const panelClass =
    "rounded-[var(--radius)] border border-panel-border bg-panel shadow-panel";
  const actionButtonClass =
    "cursor-pointer rounded-[var(--radius)] border border-btn-border bg-linear-to-b from-btn-start to-btn-end px-[0.85rem] py-[0.72rem] font-semibold leading-[1.4] tracking-[0.05em] text-btn-text hover:not-disabled:brightness-110 hover:not-disabled:shadow-primary-glow disabled:cursor-not-allowed disabled:opacity-45";

  const highlightTimeoutRef = useRef<number | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const otherUsers = presence.filter((user) => user.sessionId !== currentUser?.sessionId);
  const canCreateVoiceChannel = voiceChannels.length < 3;
  const activeVoiceChannel = voiceChannels.find((channel) => channel.channelId === activeVoiceChannelId) ?? null;
  const messageById = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const message of messages) {
      map.set(message.id, message);
    }

    return map;
  }, [messages]);

  const activeReplyMessage = activeReplyToMessageId ? messageById.get(activeReplyToMessageId) ?? null : null;
  const replyPreview = activeReplyMessage ? truncate(activeReplyMessage.text, 60) : null;

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const jumpToMessage = (messageId: string) => {
    const target = document.getElementById(`message-${messageId}`);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);

    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedMessageId((current) => (current === messageId ? null : current));
      highlightTimeoutRef.current = null;
    }, 2000);
  };

  return (
    <section className="grid min-h-0 flex-1 overflow-hidden gap-[0.85rem] grid-cols-1 min-[901px]:grid-cols-[290px_minmax(0,1fr)]">
      {isInfoPanelOpen ? (
        <button
          className="fixed inset-0 z-20 bg-black/45 min-[901px]:hidden"
          type="button"
          aria-label="Close info panel"
          onClick={onCloseInfoPanel}
        />
      ) : null}

      <aside
        id="room-info-panel"
        className={`${panelClass} fixed inset-y-0 left-0 z-30 flex w-[min(88vw,320px)] flex-col overflow-y-auto p-[0.95rem] transition-transform duration-200 ease-out min-[901px]:static min-[901px]:order-1 min-[901px]:z-auto min-[901px]:h-full min-[901px]:max-h-full min-[901px]:w-auto min-[901px]:translate-x-0 min-[901px]:overflow-y-auto min-[901px]:transition-none ${isInfoPanelOpen ? "translate-x-0" : "-translate-x-full min-[901px]:translate-x-0"}`}
      >
        <div className="mb-[0.75rem] flex items-center justify-between min-[901px]:hidden">
          <h3 className="m-0 font-bold tracking-[0.08em] text-text-muted">room info</h3>
          <button
            className="cursor-pointer rounded-[var(--radius)] border border-control-border bg-surface-control px-[0.5rem] py-[0.2rem] text-text-muted hover:border-primary hover:text-primary-bright"
            type="button"
            onClick={onCloseInfoPanel}
          >
            close
          </button>
        </div>

        <div className="flex-1">
          <p>
            take a seat, {" "}
            <span
              className="mt-[0.8rem] cursor-pointer text-primary [text-shadow:0_0_8px_var(--primary-soft)] hover:underline hover:decoration-primary-bright"
              onClick={onRenameDisplayName}
            >
              {currentUser?.displayName}
            </span>
          </p>

          <div className="mt-[1rem] grid gap-[0.45rem] min-[901px]:hidden">
            <h3 className="m-0 font-bold tracking-[0.08em] text-text-muted">room actions</h3>
            <button className={`${actionButtonClass} w-full`} onClick={onInvite} type="button">
              {inviteStatus === "copied" ? "copied!" : "invite"}
            </button>
            <button className={`${actionButtonClass} w-full`} onClick={onLeaveRoom} type="button" disabled={submitting}>
              leave room
            </button>
            {inviteStatus === "error" ? <span className="text-danger">copy failed</span> : null}
            <p className="m-0 text-[0.82rem] text-text-muted">share #{currentRoomId} with teammates</p>
          </div>

          <div className="mt-[1.1rem]">
            <h3 className="m-0 font-sbold tracking-[0.08em] text-text-muted">who&apos;s there</h3>
            {otherUsers.length === 0 ? (
              <p className="m-0 text-text-muted">it&apos;s just you for now</p>
            ) : (
              <ul className="mt-[0.7rem] grid list-none gap-[0.45rem] p-0">
                {otherUsers.map((user) => (
                  <li
                    className="flex items-baseline justify-between rounded-[var(--radius)] border border-presence-border bg-surface-muted px-[0.52rem] py-[0.38rem] text-text"
                    key={user.sessionId}
                  >
                    {user.displayName}
                    {typingBySessionId[user.sessionId] ? (
                      <span className="tracking-[0.02em] text-text-muted">typing...</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-[1.1rem] grid gap-[0.45rem]">
            <div className="flex items-center justify-between gap-[0.45rem]">
              <h3 className="m-0 font-bold tracking-[0.08em] text-text-muted">voice channels</h3>
              <button
                className="cursor-pointer rounded-[var(--radius)] border border-control-border bg-surface-control px-[0.45rem] py-[0.18rem] text-[0.82rem] text-text-muted hover:border-primary hover:text-primary-bright disabled:cursor-not-allowed disabled:opacity-45"
                type="button"
                onClick={onCreateVoiceChannel}
                disabled={!canCreateVoiceChannel}
              >
                + channel
              </button>
            </div>

            <ul className="m-0 grid list-none gap-[0.4rem] p-0">
              {voiceChannels.map((channel) => {
                const isJoined = activeVoiceChannelId === channel.channelId;
                const orderedParticipants = [...channel.participants].sort((left, right) => {
                  if (left.sessionId === currentUser?.sessionId) {
                    return -1;
                  }

                  if (right.sessionId === currentUser?.sessionId) {
                    return 1;
                  }

                  return 0;
                });

                return (
                  <li
                    key={channel.channelId}
                    className={`rounded-[var(--radius)] border px-[0.5rem] py-[0.42rem] ${isJoined ? "border-primary-bright bg-primary-soft-10" : "border-presence-border bg-surface-muted transition-colors hover:border-primary hover:bg-surface-control/60"}`}
                  >
                    {isJoined ? (
                      <>
                        <div className="flex items-center justify-between gap-[0.45rem]">
                          <span className="text-[0.9rem] text-text">
                            {channel.name}
                            {channel.isDefault ? <span className="ml-[0.3rem] text-text-muted">(default)</span> : null}
                          </span>
                          <span className="text-[0.8rem] text-text-muted">{channel.participants.length}/6</span>
                        </div>
                        <div className="mt-[0.32rem] flex flex-wrap items-center gap-[0.35rem]">
                          {orderedParticipants.map((participant) => {
                            const isCurrentUser = participant.sessionId === currentUser?.sessionId;
                            const isParticipantMuted = isCurrentUser
                              ? isLocalAudioMuted
                              : mutedVoiceParticipantIds.includes(participant.sessionId);
                            const canToggleParticipantAudio = isJoined;
                            const baseParticipantClass = `rounded-[var(--radius)] border border-control-border px-[0.32rem] py-[0.08rem] text-[0.72rem] ${isParticipantMuted ? "bg-surface-muted text-text-muted line-through opacity-80" : "bg-surface-control text-text-muted"}`;

                            return canToggleParticipantAudio ? (
                              <button
                                key={participant.sessionId}
                                className={`${baseParticipantClass} cursor-pointer hover:border-primary hover:text-primary-bright`}
                                type="button"
                                onClick={() => {
                                  if (isCurrentUser) {
                                    onToggleLocalAudioMute();
                                    return;
                                  }

                                  onToggleParticipantAudio(participant.sessionId);
                                }}
                                aria-pressed={isParticipantMuted}
                                title={
                                  isCurrentUser
                                    ? isParticipantMuted
                                      ? "Unmute yourself"
                                      : "Mute yourself"
                                    : isParticipantMuted
                                      ? "Unmute participant"
                                      : "Mute participant"
                                }
                              >
                                {participant.displayName}
                              </button>
                            ) : (
                              <span
                                className={baseParticipantClass}
                                key={participant.sessionId}
                              >
                                {participant.displayName}
                              </span>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <button
                        className="block w-full cursor-pointer text-left"
                        type="button"
                        onClick={() => onJoinVoiceChannel(channel.channelId)}
                        aria-label={`Join ${channel.name}`}
                      >
                        <div className="flex items-center justify-between gap-[0.45rem]">
                          <span className="text-[0.9rem] text-text">
                            {channel.name}
                            {channel.isDefault ? <span className="ml-[0.3rem] text-text-muted">(default)</span> : null}
                          </span>
                          <span className="text-[0.8rem] text-text-muted">{channel.participants.length}/6</span>
                        </div>
                        <div className="mt-[0.32rem] flex flex-wrap items-center gap-[0.35rem]">
                          {orderedParticipants.map((participant) => (
                            <span
                              className="rounded-[var(--radius)] border border-control-border bg-surface-control px-[0.32rem] py-[0.08rem] text-[0.72rem] text-text-muted"
                              key={participant.sessionId}
                            >
                              {participant.displayName}
                            </span>
                          ))}
                        </div>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {activeVoiceChannel ? (
          <div className="mt-[1.2rem] border-t border-panel-border pt-[0.9rem]">
            <h3 className="m-0 font-bold tracking-[0.08em] text-text-muted">voice controls</h3>
            <p className="mb-[0.65rem] mt-[0.3rem] text-[0.82rem] text-text-muted">
              connected to {activeVoiceChannel.name}
            </p>
            <div className="grid gap-[0.45rem]">
              <button
                className={`${actionButtonClass} w-full`}
                type="button"
                onClick={onToggleLocalAudioMute}
              >
                {isLocalAudioMuted ? "unmute" : "mute"}
              </button>
              <button
                className={`${actionButtonClass} w-full`}
                type="button"
                onClick={onDisconnectVoice}
              >
                disconnect
              </button>
            </div>
          </div>
        ) : null}
      </aside>

      <div className={`${panelClass} flex flex-col order-1 min-h-0 overflow-hidden p-[0.95rem] min-[901px]:order-2`}>
        <div className="min-h-0 flex-1 rounded-[var(--radius)] p-[0.55rem]">
          <div className="h-full overflow-y-auto overflow-x-hidden pr-[0.2rem]">
            <div className="ms-0 w-full">
              {messages.length === 0 ? (
                <p className="m-0 text-text-muted">No messages yet.</p>
              ) : (
                <ul className="m-0 grid list-none gap-[0.62rem] p-0">
                  {messages.map((message) => (
                    <MessageItem
                      key={message.id}
                      message={message}
                      isSelf={message.kind !== "system" && message.author.sessionId === currentUser?.sessionId}
                      isHighlighted={highlightedMessageId === message.id}
                      currentSessionId={currentUser?.sessionId ?? null}
                      replyToMessage={message.replyToMessageId ? messageById.get(message.replyToMessageId) ?? null : null}
                      onReply={onSelectReply}
                      onJumpToMessage={jumpToMessage}
                      onToggleReaction={onToggleReaction}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <MessageComposer
          draft={draft}
          submitting={submitting}
          replyPreview={replyPreview}
          onDraftChange={onDraftChange}
          onClearReply={onClearReply}
          onSend={onSendMessage}
        />
      </div>
    </section>
  );
}
