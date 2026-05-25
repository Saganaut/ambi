/* eslint-disable react-x/set-state-in-effect */
import { useState, useEffect } from "react";
import type { Dispatch, SetStateAction, SubmitEvent } from "react";
import {
  useLazyCheckUsernameQuery,
  useRegisterMutation,
} from "../../store/BrainFlexApi";

export interface RegisterSearch {
  provider?: string;
  providerId?: string;
  email?: string;
  name?: string;
  picture?: string;
  returnUrl?: string;
}

interface RegistrationPayload {
  username: string;
  newsletter: boolean;
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

interface SpringError {
  status: number;
  error: string;
  message: string;
}

function isApiError(
  err: unknown,
): err is { status: number; data: SpringError } {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof err.status === "number"
  );
}

function validateUsernameFormat(value: string): string | null {
  if (value.length < 3) return "Must be at least 3 characters";
  if (value.length > 20) return "Must be 20 characters or less";
  if (!/^[a-zA-Z0-9_]+$/.test(value))
    return "Letters, numbers, and underscores only";
  return null;
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

const useRegister = (
  registerSearchParams: RegisterSearch,
): UseRegisterReturn => {
  const [username, setUsername] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(true);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [checkUsername] = useLazyCheckUsernameQuery();
  const [register, { isLoading }] = useRegisterMutation();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const timer = setTimeout(async () => {
      try {
        const result = await checkUsername({ username }).unwrap();
        if (result.available) {
          setUsernameStatus("available");
        } else {
          setUsernameStatus("taken");
          setUsernameMessage("Username is already taken");
        }
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [username, checkUsername]);

  const canSubmit = agreedToTerms && usernameStatus === "available";

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    const payload: RegistrationPayload = {
      username,
      newsletter,
    };
    setSubmitError(null);
    try {
      const user = await register({ registerRequest: payload }).unwrap();
      console.log("registered", user);
      window.location.href = registerSearchParams.returnUrl ?? "/";
    } catch (err) {
      if (isApiError(err)) {
        setSubmitError(err.data.message);
      } else {
        setSubmitError("Something went wrong. Please try again.");
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
