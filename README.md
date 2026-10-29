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

<<<<<<< HEAD
Authentication providers enabled for this project: Email/Password and Google. `localhost` and the project's hosting domains are authorised. Other deployment domains must be added in Firebase Console → Authentication → Settings.

## Administrator

Sign in with **amitag3007@gmail.com**, using Google or an email/password account whose email ownership has been verified. The app recognises the verified identity as the administrator. No default password or simulated login is present.

Email/password users can use **Resend verification email**, then **I’ve verified my email** to reload their Firebase profile and refresh the token used by Firestore rules. They stay signed in and keep their in-progress report and camera photo. Submission also rechecks verification when the local status is stale.

Firestore rules independently check Firebase's signed authentication token for **both the exact administrator email and `email_verified == true`**. Editing local storage, changing a React role, or typing the email into an unverified account cannot grant review access. No custom-claim provisioning or service-account key is needed for this single-admin free edition.

Administrators can review their own reports, but those reviews do not award points. To change the designated admin, update the exact email in both `src/services/auth.ts` and `firestore.rules`, then redeploy the rules and frontend.

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

Starting point and destination inputs offer searchable suggestions with state labels. Selecting a corridor focuses its town pair when available. Town centres are approximate endpoints. Check journey fetches driving geometry and alternative road options, matches reports within 2.5 km of the checked routes and shows closure evidence inside intersecting zones. Google Maps compares directions for the endpoints; its roads may differ from the selected option in SafeYatri. There is no safety score or turn-by-turn navigation.

Explore defaults to reports from the last 24 hours. Older reports can be shown by clearing that checkbox. Green does not guarantee safety; an empty report list means insufficient information. Fictional incident and weather seeds have been removed. The weather section links to IMD; live weather and official closure feeds are not connected.

## Rewards and subscription model

The **Free** plan provides incident reporting, road observations, rewards and one favourite journey saved across devices. Firestore rules enforce the one-favourite limit.

The **Plus** card describes proposed subscription extras: multiple synced saved journeys, background route alerts and scheduled travel digests. Route comparison, a downloadable journey brief, a device-saved departure checklist and bounded offline observations are available to all travellers now. It is explicitly marked **planned**, with checkout disabled. Customer billing, recurring payments and Plus entitlements are **not implemented or enabled** in this free-only deployment. Enabling payments later requires choosing a supported merchant provider and a trusted payment backend; do not unlock paid features from client-side flags.

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

The app is branded **safeYatri**. Its existing Firebase project ID and public hosting addresses stay the same so accounts, incidents, points and saved drafts continue working. Travellers land on their personal dashboard; the verified administrator lands on a dedicated review workspace. The header and My account page show the registered email, verification status and access level. Review notes are stored separately per report; actions are disabled while saving. Self-review is allowed without awarding points.

**Yatri Help** is a free, local guided chatbot. It answers account, report-status, verification, admin-review, destination and reward questions from app data and prepared guidance. It is not an LLM, official advisory service or live navigation/safety feed. It uses the selected route, mapped closures, matching report/photo counts and separate route/report/zone sync timestamps. It suggests follow-up questions, handles simple follow-ups, copies a journey brief and provides a departure checklist. Messages stay in memory in the current page and can be reset. The bot can navigate to relevant screens and offer share/copy/WhatsApp actions; it never submits or approves incidents. WhatsApp Support opens **+91 9341176771**; visitors choose what to send. Native sharing falls back to copying the canonical site URL.

`npm run test:help` checks the chatbot's account scoping, admin boundaries, safety limits and support actions.

## Journey zones and emergency access

The header has an explicit **112** dial link (`tel:112`), opening the visitor’s dialler. The app never calls automatically. Source: [India Emergency Response Support System](https://112.gov.in/).

Administrators have **Zone control**: pick a centre on the map, choose a radius (0.5–20 km), status, note and expiry (up to 7 days), then publish directly. No report, camera evidence or further approval is required. Zones are separate from traveller incident reports. Firebase rules enforce the existing administrator identity, bounded geometry, expiry and authenticated update attribution. Switch Active off to archive; expired and archived zones disappear from journey maps.

Ten clearly labelled demonstration zones are included in Northeast locations. Dashed circles are demo examples, not live closures or safety guidance. They can be hidden. Admins can edit these examples or create their own zones; new zones default to demo until the administrator explicitly changes that setting. Archive overrides for demo IDs prevent hidden examples from reappearing.

**Check journey** commits the selected start/destination, fits the map to the road route, draws endpoints A/B and shows intersecting zone advisories. Driving geometry, approximate distance and duration come from the public [OSRM route service](https://project-osrm.org/docs/v5.24.0/api/). Requests include only the selected public town-centre coordinates. This shared public service has no availability guarantee and does not include live traffic or know about SafeYatri closures. SafeYatri requests up to three options, checks their geometry against real closures, and recommends the fastest returned option avoiding mapped closures. If all are blocked it makes up to two bounded waypoint requests and accepts only actual returned road geometry that avoids the known closures. If none is found it explicitly says no suitable alternative was found. On failure, an exact-endpoint saved route is shown with its original sync time, or endpoints and an explicit error if nothing was saved; it never invents a driving line. Route-zone matching uses circle radius plus a 500 m buffer around the route. Road portions inside closure areas plus the matching buffer are clipped and drawn red; the original blocked sections remain visible when an alternative is selected. Verified, genuine red reports observed within 24 hours also produce approximate 250 m closure areas plus the buffer. Older observations remain evidence but do not automatically close a road. Demo closures are dashed, labelled and excluded from real route recommendations. Map popups and blockage cards show available photos, notes, review labels and observation times, including observations from other catalogue corridors in the affected area. Copy/download journey brief includes demo labels, sync timestamps and advisory limits.

The light theme uses mint, sky and ivory surfaces with a locally stored misty mountain background; road/zone colours retain their semantic meaning. `npm run test:help` now also checks route geometry conversion, zone intersection, expiry, demo visibility and archived demo overrides.


## Last-synced access and the free travel toolkit

After an online check, up to eight exact endpoint route geometries are kept on the device. Reports and admin zones are cached separately per signed-in UID, with timestamps advanced only by server-backed Firestore snapshots. Up to 100 latest report descriptions, 12 available photos and 300 zones are retained; storage limits can remove photos or prevent caching, which the UI reports. Empty initial Firestore cache events do not erase the last confirmed data; confirmed server deletions do. The last checked place pair and a per-journey departure checklist are also retained on the device.

Offline access requires an earlier visit on that device, a retained Firebase sign-in session and browser storage. A production-only service worker caches the app shell, bundled scripts/styles and local imagery. It deliberately excludes authentication requests, API responses and third-party map tiles; the road line, route comparison, blockage list and saved evidence remain usable even if the map background cannot load. Route retries happen on reconnection. Development mode does not register the worker; use a built production preview to test offline reloads.

Saved information is labelled with its last sync time and is not a live road-status feed. Administrative expiry and the 24-hour report matching window do not prove a road has reopened. No matching closure, an alternative route, or a green zone guarantees safety. Routing only compares the options the road service returns; it cannot guarantee an exhaustive or locally permitted detour.

The route brief can be copied or downloaded as text for your travel group. The departure checklist is saved per account and journey on the current device. These tools do not require Plus or payments.

### Mountain artwork

`public/images/mountain-mist.jpg` was created with the built-in image generation tool and compressed for the app. Final built-in image prompt: “Use case: photorealistic-natural. Asset type: wide background photograph for SafeYatri, a Northeast India mountain road awareness web app. Primary request: light, airy Himalayan foothills with multiple layers of misty blue-green mountains, an understated winding mountain road in the distance, soft sunrise daylight. Wide landscape, high horizon, generous pale sky and mist, calm realistic travel photography, pastel mint, pale cyan, sage, warm ivory palette. Avoid people, vehicles, buildings, text, logos, watermarks, saturated colors, dark shadows. Intended as a subtle light background behind interface cards, never incident evidence.” This decorative image is never used as incident evidence.
=======
Copy `.env.example` to `.env` only when configuring public Firebase client settings and Cloudinary upload settings. Never add private keys or admin credentials to `VITE_` variables.
>>>>>>> 3361aa4154425a8c6e1712ef2bf88f55419d7048
