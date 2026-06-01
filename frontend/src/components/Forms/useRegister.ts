import { useState } from "react";
import type { Dispatch, SetStateAction, SubmitEvent } from "react";
import { useRegisterMutation } from "../../store/AmbiApi";
import { extractErrorMessage } from "../../utils/utils";

export interface RegisterSearch {
  // Only the post-register destination. The OAuth identity (provider, email)
  // lives in the PRE_REGISTRATION session principal and is read from
  // `/api/auth/me` — never from the URL (backend auth/README Inv 5: any
  // `?provider=&email=` is untrusted display prefill only).
  returnUrl?: string;
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

// Mirrors the backend RegisterRequest constraints (@Size 3-30,
// @Pattern [A-Za-z0-9._-]). Kept in lockstep so the inline check matches what
// the server will accept.
function validateUsernameFormat(value: string): string | null {
  if (value.length < 3) return "Must be at least 3 characters";
  if (value.length > 30) return "Must be 30 characters or less";
  if (!/^[A-Za-z0-9._-]+$/.test(value))
    return "Letters, digits, '.', '_' or '-' only";
  return null;
}

export interface UseRegisterReturn {
  username: string;
  setUsername: (value: string) => void;
  displayName: string;
  setDisplayName: Dispatch<SetStateAction<string>>;
  agreedToTerms: boolean;
  setAgreedToTerms: Dispatch<SetStateAction<boolean>>;
  newsletter: boolean;
  setNewsletter: Dispatch<SetStateAction<boolean>>;
  usernameStatus: UsernameStatus;
  usernameMessage: string;
  submitError: string | null;
  canSubmit: boolean;
  isLoading: boolean;
  handleSubmit: (e: SubmitEvent<HTMLFormElement>) => Promise<void>;
}

const useRegister = ({ returnUrl }: RegisterSearch): UseRegisterReturn => {
  const [username, setUsernameRaw] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(true);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [register, { isLoading }] = useRegisterMutation();

  // Live format validation as the user types. The richer "checking"/"available"
  // states and the `taken` set below the cursor are reserved for the live
  // username-availability endpoint currently being built on the backend:
  // re-add a debounced `useLazyCheckUsernameQuery` call in this setter and flip
  // `usernameStatus` to "checking" then "available"/"taken". Until then we
  // validate format only and let the register call itself reject a duplicate
  // (the DB unique index is the authority — backend UserService).
  const setUsername = (value: string) => {
    setUsernameRaw(value);
    if (!value) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }
    const formatError = validateUsernameFormat(value);
    if (formatError) {
      setUsernameStatus("invalid");
      setUsernameMessage(formatError);
    } else {
      setUsernameStatus("idle");
      setUsernameMessage("");
    }
  };

  const canSubmit =
    agreedToTerms &&
    username.length > 0 &&
    validateUsernameFormat(username) === null &&
    !isLoading;

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitError(null);
    try {
      await register({
        registerRequest: {
          username,
          displayName: displayName.trim() || undefined,
          newsletter,
        },
      }).unwrap();
      // Full navigation so `/api/auth/me` is refetched cold and the session
      // flips to REGISTERED across the app (mirrors the logout/guest reload).
      window.location.assign(returnUrl ?? "/");
    } catch (err) {
      const status = (err as { status?: number }).status;
      const message = extractErrorMessage(
        err,
        "Something went wrong. Please try again.",
      );
      // 409 is the username-conflict the register endpoint raises — surface it
      // on the username field; anything else is a generic form-level error.
      if (status === 409) {
        setUsernameStatus("taken");
        setUsernameMessage(message);
      } else {
        setSubmitError(message);
      }
    }
  };

  return {
    username,
    setUsername,
    displayName,
    setDisplayName,
    agreedToTerms,
    setAgreedToTerms,
    newsletter,
    setNewsletter,
    usernameStatus,
    usernameMessage,
    submitError,
    canSubmit,
    isLoading,
    handleSubmit,
  };
};

export { useRegister };
