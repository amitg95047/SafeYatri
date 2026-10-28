# safeYatri — free Firebase edition

A React + TypeScript app for community road observations in Northeast India. Includes **81 destinations**, **18 corridors**, real email/password and Google authentication, camera-only incident evidence, administrator review, one-time contribution rewards, and a favourite journey saved across devices.

## Run locally

```sh
npm install
npm run dev
```

The existing Firebase project `safeyatra-767eb` is configured in `.env.local`. Its project-owner account is `anshu.cse.24@nitap.ac.in`. To use another project, copy `.env.example` to `.env.local` and enter that project's public web-app settings. Never put private keys or account passwords in frontend files.

`npm run build` checks TypeScript and produces `dist/`. `npm test` runs the Firestore access and transaction tests in an isolated local emulator; it requires Java 21+ and downloads Google's emulator on its first run. Tests use `demo-safeyatra` and do not write production data.

## Free Spark architecture

The app uses Firebase Authentication, Firestore and static Firebase Hosting. It does **not** require Cloud Functions, Firebase Storage, a payment account, or a billing upgrade. The project remains on Spark; normal free-plan quotas apply. When quotas are exhausted, operations can fail until they reset.

Camera photos are resized and compressed to JPEG data URLs of at most 140,000 characters (roughly 105 KB of image data), stored in the incident document. This keeps a small community deployment compatible with Spark. Larger-scale media storage and background processing would require a different architecture.

Google sign-in falls back to a full-page redirect when popups are blocked. Prefer `https://safeyatra-767eb.firebaseapp.com` for redirect sign-in, which shares the default Firebase auth domain.

Authentication providers enabled for this project: Email/Password and Google. `localhost` and the project's hosting domains are authorised. Other deployment domains must be added in Firebase Console → Authentication → Settings.

## Administrator

Sign in with **amitag3007@gmail.com**, using Google or an email/password account whose email ownership has been verified. The app recognises the verified identity as the administrator. No default password or simulated login is present.

Email/password users can use **Resend verification email**, then **I’ve verified my email** to reload their Firebase profile and refresh the token used by Firestore rules. They stay signed in and keep their in-progress report and camera photo. Submission also rechecks verification when the local status is stale.

Firestore rules independently check Firebase's signed authentication token for **both the exact administrator email and `email_verified == true`**. Editing local storage, changing a React role, or typing the email into an unverified account cannot grant review access. No custom-claim provisioning or service-account key is needed for this single-admin free edition.

Administrators cannot review their own reports. To change the designated admin, update the exact email in both `src/services/auth.ts` and `firestore.rules`, then redeploy the rules and frontend.

## Reports and rewards

- Reporting requires a verified email, a live camera photo, location, a 12–1000 character description, and an observation from the last 24 hours.
- Camera capture uses `getUserMedia`; there is no file picker or gallery upload. HTTPS/localhost and camera permission are required. Camera tracks stop after capture, cancellation, or leaving the report screen.
- Text drafts are scoped to the signed-in UID and stay on that device. Photos stay in memory until submission and must be recaptured after refreshing.
- Report submission and its rate-limit record are written atomically. Rules enforce a one-minute interval, bounded fields, a compact JPEG data URL and a pending/orange initial status.
- First admin confirmation writes the report decision, **50 points**, and an immutable reward ledger entry in one Firestore transaction. Rules verify all three records together. Repeated confirmation or reopening cannot earn another reward.
- Points recognise community contributions and have no cash value. Awarded points currently remain if a report is later reopened or rejected.
- Submitted descriptions, coordinates, reporter email and evidence are visible to signed-in travellers. Avoid identifiable people, vehicle plates and private details. There is no report deletion workflow yet; plan retention before broader public rollout.
- A camera-only interface cannot prove a photo is truthful or live. A virtual camera or modified client can provide synthetic media; independent admin review is essential.

## Journey discovery

The catalogue covers all eight Northeast states and nearby West Bengal gateways, including Tawang, Ziro, Mechuka, Shillong, Sohra, Kohima, Haflong, Aizawl, Ukhrul, Jampui Hills, Gangtok, Pelling, Darjeeling and Kalimpong.

Starting point and destination inputs offer searchable suggestions with state labels. Selecting a corridor focuses its town pair when available. Map town centres are approximate, not calculated driving routes. “Open directions” opens Google Maps for the selected places. Corridor observations are filtered independently; there is no automatic route-matching engine or safety score.

Explore defaults to reports from the last 24 hours. Older reports can be shown by clearing that checkbox. Green does not guarantee safety; an empty report list means insufficient information. Fictional incident and weather seeds have been removed. The weather section links to IMD; live weather and official closure feeds are not connected.

## Rewards and subscription model

The **Free** plan provides incident reporting, road observations, rewards and one favourite journey saved across devices. Firestore rules enforce the one-favourite limit.

The **Plus** card describes proposed subscription extras: multiple saved journeys, personal route alerts and downloadable travel summaries. It is explicitly marked **planned**, with checkout disabled. Customer billing, recurring payments and Plus entitlements are **not implemented or enabled** in this free-only deployment. Enabling payments later requires choosing a supported merchant provider and a trusted payment backend; do not unlock paid features from client-side flags.

## Deploy

The Firebase CLI is installed as a development dependency. Authenticate with the project-owner account, then deploy:

```sh
npx firebase login --interactive
npm run build
npx firebase deploy --project safeyatra-767eb --only firestore:rules,hosting
```

The default Firestore database is in `asia-south1` (Mumbai), initially created with client access denied. The app-specific rules are in `firestore.rules`. Inspect/merge existing rules before reusing this configuration in a project that serves other apps.

## Validation

The local emulator checks anonymous and unverified access, spoofed reporter identities, time/coordinate/photo validation, report throttling, forged points, atomic 50-point awards, duplicate rewards, reopening, self-review, immutable ledgers, cross-account data, and the one-favourite limit.

Frontend and Firestore rules can be checked without making a real incident report. Do not submit fictional reports to the production community feed for testing.

## safeYatri refresh

The app is branded **safeYatri**. Its existing Firebase project ID and public hosting addresses stay the same so accounts, incidents, points and saved drafts continue working. Travellers land on their personal dashboard; the verified administrator lands on a dedicated review workspace. The header and My account page show the registered email, verification status and access level. Review notes are stored separately per report; actions are disabled while saving and for self-review.

**Yatri Help** is a free, local guided chatbot. It answers account, report-status, verification, admin-review, destination and reward questions from app data and prepared guidance. It is not an LLM, official advisory service or live navigation/safety feed. Messages stay in memory in the current page. The bot can navigate to relevant screens and offer share/copy/WhatsApp actions; it never submits or approves incidents. WhatsApp Support opens **+91 9341176771**; visitors choose what to send. Native sharing falls back to copying the canonical site URL.

`npm run test:help` checks the chatbot's account scoping, admin boundaries, safety limits and support actions.
