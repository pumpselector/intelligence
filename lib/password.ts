// Single source of truth for the password rule, shared by the sign-up form and
// the /settings "Change Password" form.

/** At least 8 characters, with one letter and one number. */
export const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
export const PASSWORD_HINT = "At least 8 characters, with one letter and one number";

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RE.test(password);
}

export const INPUT_BASE =
  "mt-1 w-full rounded-md border px-3 py-2 text-sm text-slate-900 outline-none transition-colors";

export type FieldState = "neutral" | "ok" | "bad";

export function borderClass(state: FieldState): string {
  if (state === "ok") return "border-emerald-400 focus:border-emerald-500";
  if (state === "bad") return "border-red-400 focus:border-red-500";
  return "border-slate-300 focus:border-slate-400";
}
