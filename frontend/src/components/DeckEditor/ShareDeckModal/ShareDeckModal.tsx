/**
 * Modal body for managing a deck's collaborators.
 *
 * The deck owner can invite new collaborators (by username, userId, or email),
 * change roles, remove collaborators, and transfer ownership. Non-owners see
 * the same list (so they know who else has access) but can only leave the deck
 * themselves — every action that would reshape the team is hidden.
 *
 * The invite form accepts a free-form identifier the backend resolves to a
 * userId or, if no user matches, creates a pending email-based row that gets
 * claimed on the invitee's first login.
 */
import { useState } from "react";
import { TrashIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { Btn } from "@/components/Common/Buttons/Btn";
import { Badge } from "@/components/Common/Badge";
import {
  useListCollaboratorsQuery,
  useInviteCollaboratorMutation,
  useUpdateCollaboratorRoleMutation,
  useRemoveCollaboratorMutation,
  useTransferOwnershipMutation,
  type DeckCollaboratorResponse,
} from "@/store/BrainFlexApi";
import { resolveAvatarSrc } from "@/utils/avatarUrl";
import styles from "./ShareDeckModal.module.css";

interface ShareDeckModalProps {
  deckId: string;
  callerUserId: string | undefined;
  callerIsOwner: boolean;
  onClose: () => void;
}

type InviteRole = "EDITOR" | "VIEWER";

const ROLE_VARIANT = {
  OWNER: "brand",
  EDITOR: "success",
  VIEWER: "info",
} as const;

const ROLE_LABEL = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
} as const;

const ShareDeckModal = ({
  deckId,
  callerUserId,
  callerIsOwner,
  onClose,
}: ShareDeckModalProps) => {
  const { data: rows = [], isLoading } = useListCollaboratorsQuery(
    { id: deckId },
    { refetchOnMountOrArgChange: true },
  );

  const [invite, { isLoading: isInviting }] = useInviteCollaboratorMutation();
  const [updateRole, { isLoading: isUpdatingRole }] =
    useUpdateCollaboratorRoleMutation();
  const [remove, { isLoading: isRemoving }] = useRemoveCollaboratorMutation();
  const [transfer, { isLoading: isTransferring }] =
    useTransferOwnershipMutation();

  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState<InviteRole>("EDITOR");
  const [error, setError] = useState<string | undefined>();

  const isBusy = isInviting || isUpdatingRole || isRemoving || isTransferring;

  const handleInvite = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    const trimmed = identifier.trim();
    if (trimmed === "" || isBusy) return;
    setError(undefined);
    try {
      await invite({
        id: deckId,
        inviteCollaboratorRequest: { userIdOrEmail: trimmed, role },
      }).unwrap();
      setIdentifier("");
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to invite"));
    }
  };

  const handleRoleChange = async (
    row: DeckCollaboratorResponse,
    next: InviteRole,
  ) => {
    const userId = row.user?.userId;
    if (userId == null || isBusy) return;
    try {
      await updateRole({
        id: deckId,
        userId,
        updateCollaboratorRoleRequest: { role: next },
      }).unwrap();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to update role"));
    }
  };

  const handleRemove = async (row: DeckCollaboratorResponse) => {
    const userId = row.user?.userId;
    if (userId == null || isBusy) return;
    try {
      await remove({ id: deckId, userId }).unwrap();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to remove"));
    }
  };

  const handleTransfer = async (row: DeckCollaboratorResponse) => {
    const userId = row.user?.userId;
    if (userId == null || isBusy) return;
    setError(undefined);
    try {
      await transfer({
        id: deckId,
        transferOwnershipRequest: { userId },
      }).unwrap();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to transfer ownership"));
    }
  };

  return (
    <div className={styles.body}>
      {callerIsOwner && (
        <form
          className={styles.inviteForm}
          onSubmit={(e) => void handleInvite(e)}>
          <label className={styles.inviteLabel} htmlFor='collab-identifier'>
            Invite by username or email
          </label>
          <div className={styles.inviteRow}>
            <input
              id='collab-identifier'
              type='text'
              autoComplete='off'
              className={styles.inviteInput}
              placeholder='alice or alice@example.com'
              value={identifier}
              maxLength={200}
              onChange={(e) => {
                setIdentifier(e.target.value);
              }}
              disabled={isBusy}
            />
            <select
              className={styles.roleSelect}
              aria-label='Role for new invite'
              value={role}
              onChange={(e) => {
                setRole(e.target.value as InviteRole);
              }}
              disabled={isBusy}>
              <option value='EDITOR'>Editor</option>
              <option value='VIEWER'>Viewer</option>
            </select>
            <Btn
              size='md'
              variant='brand'
              type='submit'
              disabled={isBusy || identifier.trim() === ""}>
              <UserPlusIcon className={styles.icon} />
              Invite
            </Btn>
          </div>
        </form>
      )}

      {error != null && <p className={styles.error}>{error}</p>}

      {isLoading ? (
        <p className={styles.empty}>Loading collaborators…</p>
      ) : rows.length === 0 ? (
        <p className={styles.empty}>
          No collaborators yet. {callerIsOwner ? "Invite someone above." : ""}
        </p>
      ) : (
        <ul className={styles.list} role='list'>
          {rows.map((row) => {
            const isSelf =
              callerUserId != null && row.user?.userId === callerUserId;
            const isRowOwner = row.role === "OWNER";
            const canManageRow = callerIsOwner && !isRowOwner;
            const canSelfLeave = isSelf && !isRowOwner;
            const displayName =
              row.userName ?? row.user?.name ?? row.email ?? "Unknown user";
            const isPending = row.user?.userId == null;

            return (
              <li key={row.id} className={styles.row}>
                <div className={styles.avatarSlot}>
                  {row.user?.pictureUrl != null &&
                  row.user.pictureUrl !== "" ? (
                    <img
                      src={resolveAvatarSrc(row.user.pictureUrl)}
                      alt=''
                      className={styles.avatar}
                      loading='lazy'
                    />
                  ) : (
                    <span className={styles.avatarFallback} aria-hidden='true'>
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className={styles.rowMain}>
                  <span className={styles.rowName}>
                    {displayName}
                    {isSelf && <span className={styles.youTag}> (you)</span>}
                  </span>
                  {row.email != null && row.userName != null && (
                    <span className={styles.rowMeta}>{row.email}</span>
                  )}
                  {isPending && (
                    <span className={styles.rowMeta}>Invite pending</span>
                  )}
                </div>
                <div className={styles.rowActions}>
                  {canManageRow && !isPending ? (
                    <select
                      className={styles.roleSelect}
                      aria-label={`Change role for ${displayName}`}
                      value={row.role ?? "VIEWER"}
                      onChange={(e) => {
                        void handleRoleChange(
                          row,
                          e.target.value as InviteRole,
                        );
                      }}
                      disabled={isBusy}>
                      <option value='EDITOR'>Editor</option>
                      <option value='VIEWER'>Viewer</option>
                    </select>
                  ) : (
                    <Badge
                      size='sm'
                      variant={ROLE_VARIANT[row.role ?? "VIEWER"]}
                      label={ROLE_LABEL[row.role ?? "VIEWER"]}
                    />
                  )}
                  {canManageRow && row.user?.userId != null && (
                    <Btn
                      size='sm'
                      fill='ghost'
                      onClick={() => {
                        void handleTransfer(row);
                      }}
                      disabled={isBusy}>
                      Make owner
                    </Btn>
                  )}
                  {(canManageRow || canSelfLeave) && (
                    <Btn
                      size='sm'
                      variant='error'
                      aria-label={
                        canSelfLeave ? `Leave deck` : `Remove ${displayName}`
                      }
                      onClick={() => {
                        void handleRemove(row);
                      }}
                      disabled={isBusy}>
                      <TrashIcon className={styles.icon} />
                    </Btn>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.footer}>
        <Btn fill='ghost' onClick={onClose}>
          Done
        </Btn>
      </div>
    </div>
  );
};

interface RtkErrorShape {
  data?: { message?: string };
  status?: number;
}

const extractErrorMessage = (err: unknown, fallback: string): string => {
  if (err != null && typeof err === "object") {
    const shaped = err as RtkErrorShape;
    if (shaped.data?.message != null && shaped.data.message !== "") {
      return shaped.data.message;
    }
  }
  return fallback;
};

export { ShareDeckModal };
