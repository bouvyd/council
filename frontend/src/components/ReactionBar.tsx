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
    <div className="mt-[0.45rem] flex flex-wrap items-center gap-[0.36rem]">
      <div className="flex flex-wrap items-center gap-[0.32rem]">
        {reactionEntries.map(([emoji, sessionIds]) => {
          const isMine = currentSessionId ? sessionIds.includes(currentSessionId) : false;

          return (
            <button
              key={emoji}
              className={`inline-flex cursor-pointer items-center gap-[0.32rem] rounded-full border border-control-border bg-surface-control px-[0.46rem] py-[0.18rem] text-text-muted hover:border-primary hover:text-primary-bright focus-visible:border-primary focus-visible:text-primary-bright focus-visible:outline-none ${isMine ? "border-primary bg-primary-soft-muted text-primary-bright" : ""}`.trim()}
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
