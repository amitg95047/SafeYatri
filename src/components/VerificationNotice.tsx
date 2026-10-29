import { useEffect, useState } from "react";
import {
  refreshVerification,
  resendVerificationEmail,
  type AppUser,
} from "../services/auth";

export function VerificationNotice({
  user,
  onVerified,
}: {
  user: AppUser;
  onVerified: (user: AppUser) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000));

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  const check = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const refreshed = await refreshVerification();
      if (refreshed.verified) onVerified(refreshed);
      else
        setMessage(
          "Your email is not verified yet. Open the latest verification link in your inbox or Spam, then check again.",
        );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not check verification. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const resend = async () => {
    if (busy || remaining) return;
    setBusy(true);
    setMessage("");
    try {
      const alreadyVerified = await resendVerificationEmail();
      if (alreadyVerified) onVerified(await refreshVerification());
      else {
        setNow(Date.now());
        setRetryAt(Date.now() + 60000);
        setMessage(
          `Verification email sent to ${user.email}. Check your inbox and Spam folder.`,
        );
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "auth/too-many-requests") {
        setNow(Date.now());
        setRetryAt(Date.now() + 60000);
        setMessage(
          "Firebase has temporarily limited verification emails. Wait a few minutes before trying again, and check your Spam folder.",
        );
      } else
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not send verification email. Try again.",
        );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="verification-notice" aria-label="Email verification">
      <strong>Verify your email to report incidents</strong>
      <p>
        Open the verification link sent to <b>{user.email}</b>, then check your
        status here. Your report and camera photo stay on this page.
      </p>
      <div className="verification-actions">
        <button
          type="button"
          className="btn btn-outline btn-small"
          disabled={busy || remaining > 0}
          onClick={resend}
        >
          {remaining ? `Resend in ${remaining}s` : "Resend verification email"}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-small"
          disabled={busy}
          onClick={check}
        >
          {busy ? "Please wait…" : "I’ve verified my email"}
        </button>
      </div>
      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}
    </section>
  );
}
