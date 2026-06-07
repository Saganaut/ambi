import { useState, useEffect } from "react";
import type { Dispatch, SetStateAction, SubmitEvent } from "react";
import {
  useLazyUsernameAvailableQuery,
  useRegisterMutation,
} from "@store/AmbiApi";
import { validation } from "@store/validationConstants";
import { validateText } from "@utils/fieldValidation";
import { extractErrorMessage } from "@utils/utils";

export interface RegisterSearch {
  // Only the post-register destination. The OAuth identity (provider, email)
  // lives in the PRE_REGISTRATION session principal and is read from
  // `/api/auth/me` — never from the URL (backend auth/README Inv 5: any
  // `?provider=&email=` is untrusted display prefill only).
  returnUrl?: string;
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

// Sourced from the generated validationConstants (backend RegisterRequest
// @Size/@Pattern), so the inline check stays in lockstep with what the server
// accepts and never drifts — sparing a round-trip on obviously-bad input.
function validateUsernameFormat(value: string): string | null {
  return validateText(value, validation.RegisterRequest.username, {
    patternMessage: "Letters, digits, '.', '_' or '-' only",
  });
}

export interface UseRegisterReturn {
  username: string;
  setUsername: Dispatch<SetStateAction<string>>;
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
  const [username, setUsername] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(true);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [checkUsername] = useLazyUsernameAvailableQuery();
  const [register, { isLoading }] = useRegisterMutation();

  // Live username validation: instant format check, then a debounced remote
  // availability check (GET /api/auth/username-available). The effect's cleanup
  // sets `cancelled` so a slow response for a since-changed value is ignored —
  // the last keystroke always wins. The register call re-validates against the
  // DB unique index, so a missed/errored check never lets a dup through.
  useEffect(() => {
    setUsernameStatus("idle");
    setUsernameMessage("");
    if (!username) return;

    const formatError = validateUsernameFormat(username);
    if (formatError) {
      setUsernameStatus("invalid");
      setUsernameMessage(formatError);
      return;
    }

    setUsernameStatus("checking");
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const result = await checkUsername({ username }).unwrap();
          if (cancelled) return;
          if (result.available) {
            setUsernameStatus("available");
            setUsernameMessage("");
          } else {
            setUsernameStatus("taken");
            setUsernameMessage("Username is already taken");
          }
        } catch {
          // Transient/failed check — drop back to idle rather than blocking;
          // register's authoritative check still guards the conflict.
          if (!cancelled) {
            setUsernameStatus("idle");
            setUsernameMessage("");
          }
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, checkUsername]);

  // Block while a check is mid-flight or the name is taken/invalid; allow on a
  // confirmed-available name (or an inconclusive idle, since register is the
  // authority). Format is re-checked here so submit can't fire on a bad value.
  const canSubmit =
    agreedToTerms &&
    username.length > 0 &&
    validateUsernameFormat(username) === null &&
    usernameStatus !== "checking" &&
    usernameStatus !== "taken" &&
    !isLoading;

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitError(null);
    try {
      await register({
        registerRequest: {
          username,
          // Display name defaults to the username server-side; the user can
          // change it later in their account settings (out of scope here).
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
      // 409 is the username conflict — covers the race where availability
      // passed but the name was claimed before submit. Surface it on the field.
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
