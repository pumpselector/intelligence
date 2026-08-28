"use client";

import { borderClass, INPUT_BASE, isPasswordValid, PASSWORD_HINT, type FieldState } from "@/lib/password";

type Props = {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  idPrefix?: string;
  newLabel?: string;
  confirmLabel?: string;
};

/**
 * New password + Confirm password inputs with the shared live validation:
 * green border when the rule passes, red (plus hint) when the user has typed
 * something invalid, red on the confirm field when the two don't match.
 * Used by both the sign-up form and /settings "Change Password".
 */
export default function PasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  idPrefix = "pw",
  newLabel = "New password",
  confirmLabel = "Confirm new password",
}: Props) {
  const valid = isPasswordValid(password);
  const matches = confirmPassword.length > 0 && password === confirmPassword;

  const passwordState: FieldState = password.length === 0 ? "neutral" : valid ? "ok" : "bad";
  const confirmState: FieldState =
    confirmPassword.length === 0 ? "neutral" : matches ? "ok" : "bad";

  return (
    <>
      <div>
        <label
          htmlFor={`${idPrefix}-new`}
          className="text-xs font-medium uppercase tracking-wide text-slate-500"
        >
          {newLabel}
        </label>
        <input
          id={`${idPrefix}-new`}
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          className={`${INPUT_BASE} ${borderClass(passwordState)}`}
        />
        <p className={`mt-1 text-xs ${passwordState === "bad" ? "text-red-600" : "text-slate-400"}`}>
          {PASSWORD_HINT}
        </p>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-confirm`}
          className="text-xs font-medium uppercase tracking-wide text-slate-500"
        >
          {confirmLabel}
        </label>
        <input
          id={`${idPrefix}-confirm`}
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => onConfirmChange(e.target.value)}
          className={`${INPUT_BASE} ${borderClass(confirmState)}`}
        />
        {confirmState === "bad" && (
          <p className="mt-1 text-xs text-red-600">Passwords don&apos;t match.</p>
        )}
      </div>
    </>
  );
}
