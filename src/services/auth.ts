/** Demo-only authentication adapter. Replace with Firebase Auth; never trust client role in production. */
export const DEMO_ADMIN_EMAIL = 'amitag3007@gmail.com';
export interface DemoUser { email: string; name: string; role: 'traveller' | 'reviewer'; }
export function demoSignIn(email: string, password: string, name = ''): DemoUser {
  if (!email.includes('@') || password.length < 6) throw new Error('Enter a valid email and a password with at least 6 characters.');
  const isReviewer = email.trim().toLowerCase() === DEMO_ADMIN_EMAIL;
  const user = { email: email.trim().toLowerCase(), name: name || email.split('@')[0], role: isReviewer ? 'reviewer' as const : 'traveller' as const };
  localStorage.setItem('safeyatra.demo.user', JSON.stringify(user)); return user;
}
export function demoSignOut() { localStorage.removeItem('safeyatra.demo.user'); }
