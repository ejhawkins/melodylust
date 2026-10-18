// Supabase Auth reports errors in developer terms ("email rate limit exceeded"). The sign-in
// window shows readers these instead, keeping Supabase's own text only as a last resort.
type AuthError = { message?: string; code?: string } | null | undefined;

export function authMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : (error as AuthError)?.message ?? "";
  const code = (error as AuthError)?.code ?? "";

  const wait = /after (\d+) seconds?/i.exec(raw);
  if (wait) return `For your security, wait ${wait[1]} seconds before asking for another email.`;
  if (code === "over_email_send_rate_limit" || /email rate limit/i.test(raw))
    return "Too many emails have gone out in the last hour. Wait a little before asking for another, or sign in with your password.";
  if (code === "over_request_rate_limit" || /rate limit/i.test(raw)) return "Too many tries in a row. Wait a minute, then try again.";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(raw)) return "That email and password don't match.";
  if (code === "email_not_confirmed" || /email not confirmed/i.test(raw)) return "Confirm your email first: the link is in your inbox.";
  if (code === "user_already_exists" || /already registered/i.test(raw)) return "That email already has an account. Sign in instead.";
  if (code === "weak_password" || /password should be/i.test(raw)) return "Choose a longer password, at least 8 characters.";
  if (code === "same_password" || /different from the old password/i.test(raw)) return "Choose a password you haven't used here before.";
  if (/auth session missing/i.test(raw)) return "This reset link has expired. Ask for a new one.";
  return raw || "Sign-in isn't available right now. Try again in a moment.";
}
