# Safe Yatra — Frontend demo

A responsive React + TypeScript + Vite frontend for hill-road incident reporting in Northeast India.

## Run on macOS

1. Install Node.js 20+ if needed: https://nodejs.org/
2. Open Terminal and move into the project folder. If you extracted it into Documents:
   ```bash
   cd ~/Documents/safeYatra
   ```
3. Install dependencies and start the app:
   ```bash
   npm install
   npm run dev
   ```
4. Open the local URL Vite prints (usually `http://localhost:5173`).
5. For a production build, run `npm run build`.

## Demo access

- Login/signup is simulated locally; use any email and a password with at least 6 characters.
- Reviewer demo identity: `amitag3007@gmail.com`. Any 6+ character password works in this demo.
- Demo role switching is not exposed as a general toggle. The configured email gets the reviewer demo view.
- Seed incidents and the weather note are **fictional examples**, not live road or weather information.
- Reports, decisions and drafts persist in this browser's `localStorage`. Clearing site data clears demo data. Photo data URLs can consume browser storage.
- Map tiles come from OpenStreetMap. The app does not bulk-download tiles.

## Frontend features

- Explore a sample NH-10 Siliguri–Gangtok corridor with map/list views, status filters, markers, observation time and verification status.
- Five status colours: red, orange, yellow, green and white. Green means no issue is currently recorded, not guaranteed safety. White means insufficient data.
- Start/destination inputs (route calculation is intentionally a demo placeholder).
- Incident submission with GPS or map-picked location, observation time, description, optional image, validation and locally saved drafts.
- My Reports with review state and decision history.
- Reviewer queue with confirm, reject, request clarification and reopen actions.
- Weather advisory kept separate with a source and expiry field.

## Production integrations still required

- **Firebase Auth:** replace `src/services/auth.ts` demo auth with Firebase Authentication, including real email/password and Google provider flows.
- **Firestore:** replace `src/services/storage.ts` and `src/services/reports.ts` localStorage persistence with Firestore reads/writes, server timestamps and error/offline handling.
- **Cloudinary:** replace `src/services/media.ts` data-URL storage with a signed upload flow or restricted unsigned preset. Do not expose API secrets in frontend environment variables.
- **Reviewer security:** enforce reviewer claims and report decisions with Firestore Security Rules and/or a trusted backend. Hiding a button or checking an email in React is not authorization.
- **Official road/weather data:** replace the clearly labelled fictional seed/advisory with trusted source integrations, observation freshness and expiry. Do not infer safety from an empty report list.
- Add production-grade account recovery, validation/rate limits, image moderation, privacy policy, accessibility testing and deployment configuration before public release.

Copy `.env.example` to `.env` only when configuring public Firebase client settings and Cloudinary upload settings. Never add private keys or admin credentials to `VITE_` variables.
