import React from "react";
import { useRegister } from "./useRegister";
import type { RegisterSearch } from "./useRegister";
import styles from "./Forms.module.css";
import { Link } from "@tanstack/react-router";
import { Input } from "../Common/Input/Input/Input";
import { Checkbox } from "../Common/Input/Checkbox/Checkbox";
import { Btn } from "../Common/Buttons/Btn";
import { Alert } from "../Common/Alert/Alert";
export type { RegisterSearch };

interface RegistrationFormProps {
  registerSearchParams: RegisterSearch;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({
  registerSearchParams,
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
      <form
        className={styles.registrationForm}
        onSubmit={(e) => void handleSubmit(e)}>
        <Input
          id='username'
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
          }}
          maxLength={20}
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
            <Btn type='submit' disabled={!canSubmit || isLoading}>
              Submit
            </Btn>
          </div>
        </div>
      </form>
    </div>
  );
};

export { RegistrationForm };
