type ReactionBarProps = {
  messageId: string;
  reactions?: Record<string, string[]>;
  currentSessionId: string | null;
  onToggleReaction: (messageId: string, emoji: string) => void;
};

export function ReactionBar({
  messageId,
  reactions,
  currentSessionId,
  onToggleReaction,
}: ReactionBarProps) {
  const reactionEntries = Object.entries(reactions ?? {});

  const handleToggle = (emoji: string) => {
    onToggleReaction(messageId, emoji);
  };

  if (reactionEntries.length === 0) {
    return null;
  }

  return (
    <div className="message-reactions-wrap">
      <div className="message-reactions">
        {reactionEntries.map(([emoji, sessionIds]) => {
          const isMine = currentSessionId ? sessionIds.includes(currentSessionId) : false;

          return (
            <button
              key={emoji}
              className={`reaction-pill ${isMine ? "reaction-pill-mine" : ""}`.trim()}
              onClick={() => handleToggle(emoji)}
              type="button"
            >
              <span>{emoji}</span>
              <span>{sessionIds.length}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
