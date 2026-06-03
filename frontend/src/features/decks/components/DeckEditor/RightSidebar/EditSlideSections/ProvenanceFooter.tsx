// Renders the chunk-10 provenance metadata as a quiet footer beneath the
// inspector sections: "Created by <name> · last edited by <name> · vN ·
// <relative updatedAt>". Author display names come from useGetUserProfile
// which is RTK-cached, so the second lookup of the same user id is free.
// When the two author ids match, only one name is shown.
import { useGetUserProfileQuery } from "@store/AmbiApi";
import styles from "./ProvenanceFooter.module.css";

interface ProvenanceFooterProps {
  createdByUserId: string | undefined;
  lastEditedByUserId: string | undefined;
  createdAt: string | undefined;
  updatedAt: string | undefined;
  version: number | undefined;
}

const useDisplayName = (
  userId: string | undefined,
): { displayName: string | undefined; isLoading: boolean } => {
  const { data, isLoading } = useGetUserProfileQuery(
    { id: userId ?? "" },
    { skip: !userId },
  );
  if (!userId) return { displayName: undefined, isLoading: false };
  return {
    displayName: data?.name ?? data?.userName,
    isLoading,
  };
};

const formatRelative = (iso: string | undefined): string | undefined => {
  if (!iso) return undefined;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return undefined;
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes.toString()}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours.toString()}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days.toString()}d ago`;
  return new Date(iso).toLocaleDateString();
};

const ProvenanceFooter = ({
  createdByUserId,
  lastEditedByUserId,
  createdAt,
  updatedAt,
  version,
}: ProvenanceFooterProps) => {
  const creator = useDisplayName(createdByUserId);
  const editor = useDisplayName(lastEditedByUserId);

  if (
    !createdByUserId &&
    !lastEditedByUserId &&
    version === undefined &&
    !updatedAt
  ) {
    return null;
  }

  const sameAuthor =
    !!createdByUserId &&
    !!lastEditedByUserId &&
    createdByUserId === lastEditedByUserId;

  const parts: string[] = [];
  if (creator.displayName) {
    parts.push(`Created by ${creator.displayName}`);
  } else if (createdByUserId) {
    parts.push("Created");
  }
  if (!sameAuthor) {
    if (editor.displayName) {
      parts.push(`last edited by ${editor.displayName}`);
    } else if (lastEditedByUserId) {
      parts.push("last edited");
    }
  }
  const relative = formatRelative(updatedAt ?? createdAt);
  if (relative) {
    parts.push(relative);
  }
  if (version !== undefined && version > 0) {
    parts.push(`v${version.toString()}`);
  }

  if (parts.length === 0) return null;

  return (
    <footer className={styles.footer} aria-label='Slide provenance'>
      {parts.join(" · ")}
    </footer>
  );
};

export { ProvenanceFooter };
