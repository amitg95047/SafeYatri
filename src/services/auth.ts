import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onIdTokenChanged,
  reload,
  type User,
} from "firebase/auth";
import { auth, requireFirebase } from "./firebase";
export const ADMIN_EMAIL = "amitag3007@gmail.com";
export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: "traveller" | "reviewer";
  verified: boolean;
}
function toAppUser(user: User): AppUser {
  return {
    uid: user.uid,
    email: user.email || "",
    name: user.displayName || user.email?.split("@")[0] || "Traveller",
    role:
      user.emailVerified && user.email === ADMIN_EMAIL
        ? "reviewer"
        : "traveller",
    verified: user.emailVerified,
  };
}
export function watchUser(callback: (user: AppUser | null) => void) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onIdTokenChanged(auth, (user) =>
    callback(user ? toAppUser(user) : null),
  );
}
export async function refreshVerification(): Promise<AppUser> {
  requireFirebase();
  const user = auth!.currentUser;
  if (!user) throw new Error("Sign in to check your email verification.");
  await reload(user);
  // Firestore rules read the ID token, so refresh it as well as the profile.
  await user.getIdToken(true);
  if (auth!.currentUser?.uid !== user.uid)
    throw new Error("Your session changed. Please try again.");
  return toAppUser(user);
}
export async function resendVerificationEmail(): Promise<boolean> {
  const user = await refreshVerification();
  if (user.verified) return true;
  await sendEmailVerification(auth!.currentUser!);
  return false;
}
export async function emailSignIn(
  email: string,
  password: string,
  name: string,
  signup: boolean,
) {
  requireFirebase();
  if (signup) {
    const { user } = await createUserWithEmailAndPassword(
      auth!,
      email,
      password,
    );
    await updateProfile(user, { displayName: name });
    await sendEmailVerification(user);
    await user.getIdToken(true);
  } else await signInWithEmailAndPassword(auth!, email, password);
}
export async function googleSignIn() {
  requireFirebase();
  try {
    await signInWithPopup(auth!, new GoogleAuthProvider());
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/popup-blocked") throw error;
    // Firebase's default hosting domain shares Auth's storage origin.
    // Move there before redirect sign-in when a web.app popup is blocked.
    if (window.location.hostname.endsWith(".web.app")) {
      window.location.assign(
        `https://${auth!.config.authDomain}/?signin=google`,
      );
      return;
    }
    await signInWithRedirect(auth!, new GoogleAuthProvider());
  }
}
export async function resetPassword(email: string) {
  requireFirebase();
  if (!email) throw new Error("Enter your email first.");
  await sendPasswordResetEmail(auth!, email);
}
export async function logOut() {
  if (auth) await signOut(auth);
}

export async function completeRedirectSignIn() {
  if (!auth) return;
  await getRedirectResult(auth);
  const url = new URL(window.location.href);
  if (url.searchParams.get("signin") === "google") {
    url.searchParams.delete("signin");
    window.history.replaceState(null, "", url.href);
    if (!auth.currentUser)
      await signInWithRedirect(auth, new GoogleAuthProvider());
  }
}
