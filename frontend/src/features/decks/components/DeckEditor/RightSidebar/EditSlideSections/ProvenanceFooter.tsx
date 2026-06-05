// Renders slide provenance metadata as a quiet footer beneath the inspector
// sections: "Created by <userId> · last edited by <userId> · vN · <relative updatedAt>".
// TODO: Wire useGetUserProfileQuery (by userId) once that endpoint is available —
// currently the API only exposes /me, so author names cannot be resolved.
import styles from "./ProvenanceFooter.module.css";

interface ProvenanceFooterProps {
  createdByUserId: string | undefined;
  lastEditedByUserId: string | undefined;
  createdAt: string | undefined;
  updatedAt: string | undefined;
  version: number | undefined;
}

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
  if (
    !createdByUserId &&
    !lastEditedByUserId &&
    version === undefined &&
    !updatedAt &&
    !createdAt
  ) {
    return null;
  }

  const sameAuthor =
    !!createdByUserId &&
    !!lastEditedByUserId &&
    createdByUserId === lastEditedByUserId;

  const parts: string[] = [];
  if (createdByUserId) {
    parts.push(`Created`);
  }
  if (!sameAuthor && lastEditedByUserId) {
    parts.push("last edited");
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
