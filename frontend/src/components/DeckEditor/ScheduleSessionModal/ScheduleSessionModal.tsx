/**
 * Modal body for scheduling a future InteractiveSession.
 *
 * Inputs:
 *   - scheduledStartAt (required, datetime-local in the host's local tz)
 *   - reminderEmailTemplate (optional free-text customisation of the boot reminder)
 *   - invitedEmails (chip-input — type an email, press Enter / "Add")
 *
 * Settings are not editable here in v1 — the schedule inherits the deck's
 * default session settings, and the host can edit them on /scheduled later
 * via the update endpoint.
 *
 * On success: closes the modal and navigates to /scheduled so the host can
 * see the new row alongside any others.
 */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Btn } from "@/components/Common/Buttons/Btn";
import { useCreateScheduledSessionMutation } from "@/store/AmbiApi";
import { extractErrorMessage } from "@/utils/utils";
import styles from "./ScheduleSessionModal.module.css";

interface ScheduleSessionModalProps {
  deckId: string;
  onClose: () => void;
}

// Matches a basic email shape. Pure UX guard; the backend re-validates.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ScheduleSessionModal = ({
  deckId,
  onClose,
}: ScheduleSessionModalProps) => {
  const navigate = useNavigate();
  const [scheduledStartAt, setScheduledStartAt] = useState("");
  const [reminderText, setReminderText] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [schedule, { isLoading, error: createError }] =
    useCreateScheduledSessionMutation();

  const addEmail = () => {
    const trimmed = emailDraft.trim().toLowerCase();
    if (!trimmed) return;
    if (!EMAIL_PATTERN.test(trimmed)) {
      setEmailError("That doesn't look like a valid email.");
      return;
    }
    if (emails.includes(trimmed)) {
      setEmailError("Already added.");
      return;
    }
    setEmails([...emails, trimmed]);
    setEmailDraft("");
    setEmailError(null);
  };

  const removeEmail = (target: string) => {
    setEmails(emails.filter((e) => e !== target));
  };

  // datetime-local emits "yyyy-MM-ddTHH:mm". The backend Jackson ObjectMapper
  // accepts that as a `LocalDateTime` without timezone — we serialise as-is.
  const canSubmit = scheduledStartAt !== "" && !isLoading;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      await schedule({
        createScheduledInteractiveSessionRequest: {
          deckId,
          scheduledStartAt,
          reminderEmailTemplate: reminderText || undefined,
          invitedEmails: emails,
        },
      }).unwrap();
      onClose();
      void navigate({ to: "/scheduled" });
    } catch {
      // Error is surfaced via createError below; no further handling needed.
    }
  };

  return (
    <div className={styles.body}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor='schedule-start-at'>
          Start time (your local timezone)
        </label>
        <input
          id='schedule-start-at'
          className={styles.dateInput}
          type='datetime-local'
          value={scheduledStartAt}
          onChange={(e) => {
            setScheduledStartAt(e.target.value);
          }}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor='schedule-emails'>
          Invite by email
        </label>
        <div className={styles.inviteRow}>
          <input
            id='schedule-emails'
            className={styles.inviteInput}
            type='email'
            placeholder='person@example.com'
            value={emailDraft}
            onChange={(e) => {
              setEmailDraft(e.target.value);
              setEmailError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addEmail();
              }
            }}
          />
          <Btn size='md' onClick={addEmail} disabled={!emailDraft.trim()}>
            Add
          </Btn>
        </div>
        {emailError && <span className={styles.error}>{emailError}</span>}
        {emails.length > 0 && (
          <div className={styles.chips}>
            {emails.map((email) => (
              <span key={email} className={styles.chip}>
                {email}
                <button
                  type='button'
                  className={styles.chipRemove}
                  aria-label={`Remove ${email}`}
                  onClick={() => {
                    removeEmail(email);
                  }}>
                  <XMarkIcon
                    style={{ width: "0.875rem", height: "0.875rem" }}
                  />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor='schedule-reminder'>
          Reminder note (optional)
        </label>
        <textarea
          id='schedule-reminder'
          className={styles.textArea}
          placeholder="Anything you'd like invitees to know when the session starts."
          value={reminderText}
          onChange={(e) => {
            setReminderText(e.target.value);
          }}
          maxLength={500}
        />
      </div>

      {createError && (
        <span className={styles.error} role='alert'>
          {extractErrorMessage(createError, "Couldn't schedule this session.")}
        </span>
      )}

      <div className={styles.footer}>
        <Btn size='md' shape='pill' onClick={onClose}>
          Cancel
        </Btn>
        <Btn
          size='md'
          shape='pill'
          variant='brand'
          disabled={!canSubmit}
          onClick={() => {
            void submit();
          }}>
          {isLoading ? "Scheduling…" : "Schedule"}
        </Btn>
      </div>
    </div>
  );
};

export { ScheduleSessionModal };
