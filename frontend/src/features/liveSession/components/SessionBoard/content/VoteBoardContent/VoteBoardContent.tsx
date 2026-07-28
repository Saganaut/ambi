// Best-answer voting surface for the board (D3), rendered for every question
// kind while the round is in its VOTE phase. The anonymised submissions arrive
// as opaque vote options (text, or a presigned drawing image) — the
// option→author mapping never reaches the client, so nothing here can hint at
// whose answer a card is.
//
// Voting: a participant taps a card and the vote posts immediately (a re-tap on
// another card changes it — last vote while voting is open wins; the backend
// rejects a vote for the voter's own answer). `myVoteOptionId` comes back from
// the read model once the POST is accepted. Only the running votes-cast count
// is shown — per-option tallies stay hidden until the results reveal, so early
// votes can't sway the room.
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import type { SlideView } from "../../../../store/liveSessionApi.gen";
import styles from "./VoteBoardContent.module.css";

interface VoteBoardContentProps {
  slide: SlideView;
  interactive: boolean;
}

const VoteBoardContent = ({ slide, interactive }: VoteBoardContentProps) => {
  const slideId = slide.id ?? "";
  const { sendVote } = useSessionConnection();
  const { voteOptions, myVoteOptionId, votesCast } = useLiveSessionQuery();

  const castVote = (optionId: string) => {
    if (!interactive || optionId === myVoteOptionId) return;
    sendVote(slideId, optionId);
  };

  // Even two-column grid, matching the MCQ option layout.
  const columns = voteOptions.length
    ? Math.max(Math.ceil(voteOptions.length / 2), 2)
    : 2;

  return (
    <div className={styles.voteBoardContent}>
      <p className={styles.callToAction}>
        {interactive
          ? "Vote for the best answer"
          : "Participants are voting for the best answer"}
      </p>
      <div
        className={styles.options}
        style={{ "--cols": columns } as React.CSSProperties}>
        {voteOptions.map((option) => {
          const id = option.optionId ?? "";
          const mine = id === myVoteOptionId;
          const classes = [
            styles.option,
            mine ? styles.voted : "",
            interactive ? styles.selectable : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={id}
              type='button'
              className={classes}
              disabled={!interactive}
              aria-pressed={interactive ? mine : undefined}
              onClick={() => {
                castVote(id);
              }}>
              {option.imageUrl ? (
                <img
                  className={styles.drawing}
                  src={option.imageUrl}
                  alt='A submitted drawing'
                />
              ) : (
                <span className={styles.label}>{option.text}</span>
              )}
              {mine && <span className={styles.mine}>Your vote ✓</span>}
            </button>
          );
        })}
      </div>
      <p className={styles.count}>
        {votesCast === 1 ? "1 vote cast" : `${votesCast.toString()} votes cast`}
      </p>
    </div>
  );
};

export { VoteBoardContent };
