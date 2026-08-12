import React from "react";

import styles from "./Forms.module.css";
import { Link } from "@tanstack/react-router";

import { RegisterSearch, useRegister } from "@auth/hooks/useRegister";
import { Alert } from "@ui/Alert/Alert";
import { Btn } from "@saganaut/ambi-ui";
import { Checkbox } from "@/shared/components/Forms/Input/Checkbox/Checkbox";
import { Input } from "@/shared/components/Forms/Input/Input/Input";
import { authValidation } from "@/features/auth/store/authValidationConstants";
export type { RegisterSearch };

interface RegistrationFormProps {
  registerSearchParams: RegisterSearch;
  /** The OAuth email from the PRE_REGISTRATION session (`/api/auth/me`), shown
   *  read-only so the user can see which account they're completing. */
  email?: string;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({
  registerSearchParams,
  email,
}) => {
  const {
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
  } = useRegister(registerSearchParams);

  const usernameInfoMessage =
    usernameStatus === "checking"
      ? "Checking..."
      : usernameStatus === "available"
        ? "Available"
        : undefined;

  const usernameErrorMessage =
    usernameStatus === "invalid" || usernameStatus === "taken"
      ? usernameMessage
      : undefined;

  return (
    <div className={styles.registrationFormContainer}>
      <h1>What shall we call you?</h1>
      {email != null && email !== "" && (
        <p>
          Completing sign-up for <strong>{email}</strong>
        </p>
      )}
      <form
        className={styles.registrationForm}
        onSubmit={(e) => void handleSubmit(e)}>
        <Input
          id='username'
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
          }}
          maxLength={authValidation.RegisterRequest.username.maxLength}
          label='Username'
          infoMessage={usernameInfoMessage}
          errorMessage={usernameErrorMessage}
          checked={usernameStatus === "available"}
        />
        <Checkbox
          id='terms'
          label={
            <>
              Agree to our{" "}
              <Link to='/terms-and-conditions' viewTransition>
                Terms &amp; Conditions
              </Link>
            </>
          }
          checked={agreedToTerms}
          onChange={(e) => {
            setAgreedToTerms(e.target.checked);
          }}
        />
        <Checkbox
          id='newsletter'
          label='Stay informed'
          checked={newsletter}
          onChange={(e) => {
            setNewsletter(e.target.checked);
          }}
        />
        <div>
          {submitError != null && submitError !== "" && (
            <Alert severity='error'>{submitError}</Alert>
          )}
          <div className={styles.finalRow}>
            <Btn type='submit' isDisabled={!canSubmit || isLoading}>
              Submit
            </Btn>
          </div>
        </div>
      </form>
    </div>
  );
};

export { RegistrationForm };
