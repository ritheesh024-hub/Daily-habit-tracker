# Daily Habits

**Daily Habits** is a personal habit tracking, nutrition analysis, and running application designed to help individuals build consistent routines, track outdoor workouts with live GPS, discover pedestrian-safe loop running routes, and visualize their long-term health and fitness progress.

The application combines minimalist habit tracking with live athletic running tracking, featuring offline-first local persistence and secure cloud synchronization.

---

## 1. Project Overview

- **Application Name:** Daily Habits
- **Tagline:** Build Better Habits. Track Every Run. Improve Every Day.
- **Purpose & Goals:**
  - Empower users to establish atomic daily habits and maintain long-term streaks.
  - Provide an outdoor running tracker with real-time GPS telemetry, interactive maps, pace calculations, and personal records.
  - Provide intelligent pedestrian loop route discovery (2 km to 10 km) starting from home or live location.
  - Deliver private nutritional meal analysis with macro breakdowns and caloric estimates.
  - Ensure uninterrupted offline usability on mobile PWAs with zero data loss and automated cloud sync.

---

## 2. Core Features

### Habit Tracking
- **Daily Habit Management:** Create, reorder, customize, and archive daily routines with custom icons, colors, targets, and priority levels.
- **Single-Tap Completion:** Effortlessly check off habits on a clean, single-screen dashboard.
- **Daily Progress Tracking:** Dynamic percentage completion rings, progress bars, and historical calendar logs.
- **Smart Streaks & Milestones:** Automatic streak calculations (current streak and all-time best) and milestone badge unlocks (3-day, 7-day, 30-day, 100-day).
- **Daily Notes:** Log reflections, journals, and personal context alongside each day's habit log.
- **Smart Reminders:** Configurable notifications for pending routines.
- **Analytics & Trends:** Weekly, monthly, and yearly habit consistency graphs and completion trends.
- **Theme Support:** Dark, Light, and System theme modes with optical contrast compensation.

### Food AI
- **Meal Image Analysis:** Powered by Google Gemini multimodal vision models to scan meal photos.
- **Nutritional Breakdown:** Instant estimates of Calories, Protein, Carbohydrates, Fat, and Dietary Fiber.
- **Food Suggestions:** Helpful dietary insights and balanced meal adjustments.
- **Disclaimer:** All nutritional metrics and caloric totals are clearly presented as helpful estimates.

### Daily Run
- **Live GPS Running Tracker:** Real-time outdoor workout tracking via browser Geolocation (`navigator.geolocation.watchPosition`).
- **Interactive Route Map:** Live path rendering powered by Leaflet and OpenStreetMap tiles.
- **Live Performance Metrics:**
  - Distance: High-precision Haversine calculations formatted to 2 decimals.
  - Duration: Active elapsed running time with automatic pause deduction.
  - Current & Average Pace: Rolling window current pace and overall average pace (`MM:SS /km`).
  - Current & Average Speed: Speed in `km/h`.
  - Estimated Calories: Based on verified user weight from profile.
- **Running Controls:** Clear state transitions: Start, Pause, Resume, Finish, and Discard.
- **Workout Summaries:** Comprehensive post-run summaries with interactive route review and custom workout titles/notes.
- **Run History & Performance Analytics:** Dedicated analytics screen with time filters (This Week, This Month, Last 30 Days, This Year, All Time, Custom Range), weekly/monthly SVG volume trend charts, personal records (longest distance, fastest pace, longest duration), running calendar, and consistency streaks.

### Offline & Android
- **Offline Recording:** Daily Run records GPS coordinates, timestamps, and calculates distance without requiring an internet connection.
- **Crash Recovery:** Unfinished active sessions are preserved in IndexedDB; accidental reloads or app closures prompt a 1-tap "Resume Run" recovery.
- **Automatic Cloud Synchronization:** Pending offline runs queue locally and automatically sync to Firebase Cloud Firestore upon network reconnection.
- **PWA Support:** Progressive Web App with service worker caching, installability prompts on Android/desktop, and offline asset availability.
- **Android Background GPS Status:** Browser-based foreground GPS tracking with lock screen awareness notices. (Native Android Background GPS service is on the roadmap).

### Daily Routes
- **Loop Route Discovery:** Intelligent circular route generator creating pedestrian-safe loop routes that return to the starting point.
- **Flexible Starting Location:**
  - Current live GPS location.
  - Saved Home location (custom label, editable, removable).
  - Manual map pin selection.
- **Target Distance Filters:** 2 km, 3 km, 5 km, 8 km, and 10 km loop requests.
- **Real Road & Path Geometry:** Powered by OpenStreetMap data and OSRM pedestrian foot routing to strictly avoid motorways and restricted highways.
- **Landmark Discovery:** Discovers public parks, running tracks, stadiums, lakes, and recreational areas as intermediate loop waypoints.
- **Elevation Profiles:** Cumulative elevation gain calculated via Open-Meteo elevation data.
- **Live Run Guidance:**
  - Planned loop route rendered alongside live GPS tracking.
  - Real-time progress bar (% completed, distance remaining).
  - Deviation tracking: alerts when runner is $> 50\text{m}$ off-route and confirms return to route.
  - Loop completion detection when returning to the start point.
- **Favourite Saved Routes:** Bookmark favourite routes for offline access and cloud synchronization under `users/{userId}/savedRoutes/{routeId}`.

---

## 3. Technology Stack

- **Frontend:** React 19 SPA, TypeScript 5.8
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **Backend / Server:** Node.js, Express 4, `tsx`, `esbuild`
- **Authentication:** Firebase Authentication 12 (Google Sign-In with popup flow)
- **Database:** Firebase Cloud Firestore 12 (Enterprise Edition)
- **Local Storage:** IndexedDB (custom transactional storage with in-memory fallbacks)
- **Mapping & Geospatial:**
  - Leaflet 1.9 & `@types/leaflet`
  - OpenStreetMap standard tiles
  - OSRM (Open Source Routing Machine) pedestrian `foot` profile
  - OpenStreetMap Nominatim Geocoding API
  - Open-Meteo Elevation API
- **AI & Multimodal:**
  - `@google/genai` (Google Gemini API for nutrition vision analysis)
  - `openai` SDK
- **Icons & Motion:** Lucide React (`lucide-react`), Motion (`motion` / framer-motion v12)
- **PWA:** `vite-plugin-pwa`, Service Worker (`workbox`), Web App Manifest

---

## 4. Project Structure

```
├── public/                       # Static public assets, icons, PWA manifest
│   ├── icon.svg                  # Vector application mark
│   ├── manifest.json             # Web App Manifest
│   ├── apple-touch-icon.png      # iOS home screen icon
│   └── pwa-192x192.png, pwa-512x512.png
├── src/                          # Frontend source code
│   ├── assets/                   # Local media & visual assets
│   ├── components/               # Core application UI components
│   │   ├── LandingPage.tsx       # Marketing landing page & sign-in gate
│   │   ├── HabitList.tsx         # Active habit checklist
│   │   ├── HabitRow.tsx          # Interactive habit item row
│   │   ├── ManageHabitsView.tsx  # Habit management & configuration
│   │   ├── AnalyticsView.tsx     # Habit analytics & consistency charts
│   │   ├── MilestonesView.tsx    # Streak milestones & badges
│   │   ├── ProfileModal.tsx      # User profile, weight tracking, settings
│   │   ├── DailyNote.tsx         # Journal & reflection logging
│   │   └── PWAInstallButton.tsx  # PWA installation prompt
│   ├── features/                 # Modular domain features
│   │   └── daily-run/            # Daily Run & Daily Routes feature module
│   │       ├── __tests__/        # Automated Node test runner suites
│   │       │   ├── dailyRoutes.test.ts        # Route generation & deviation tests
│   │       │   ├── runAnalytics.test.ts       # Performance metrics & streak tests
│   │       │   ├── runFirebaseService.test.ts # Cloud serialization & bounds tests
│   │       │   ├── runIndexedDB.test.ts       # Offline storage & crash recovery tests
│   │       │   └── runStats.test.ts           # Haversine distance & pace tests
│   │       ├── components/       # Daily Run sub-components
│   │       │   ├── DailyRoutesView.tsx        # Loop discovery & route planner UI
│   │       │   ├── RunAnalyticsView.tsx       # Running analytics & volume charts
│   │       │   ├── RunCalendar.tsx            # Monthly running calendar
│   │       │   ├── RunControls.tsx            # Start, Pause, Resume, Finish buttons
│   │       │   ├── RunDetailsModal.tsx        # Detailed workout map review
│   │       │   ├── RunHistoryView.tsx         # Workout history list & search
│   │       │   ├── RunMap.tsx                 # Leaflet interactive GPS map
│   │       │   ├── RunMetricCard.tsx          # Stat telemetry display cards
│   │       │   └── RunSummaryView.tsx         # Post-run workout summary
│   │       ├── hooks/            # Daily Run custom React hooks
│   │       │   ├── useOnlineStatus.ts         # Network connectivity monitor
│   │       │   └── useRunSession.ts           # State machine for live workouts
│   │       ├── pages/            # Feature root pages
│   │       │   └── DailyRunPage.tsx           # Daily Run parent container
│   │       ├── services/         # Storage, routing, and synchronization services
│   │       │   ├── gpsTrackerService.ts       # Geolocation watchPosition wrapper
│   │       │   ├── routeFirebaseService.ts    # Firestore saved routes service
│   │       │   ├── routeGenerationService.ts  # OSRM loop generator & deviation tracker
│   │       │   ├── runFirebaseService.ts      # Firestore run documents service
│   │       │   ├── runIndexedDB.ts            # IndexedDB local transactional storage
│   │       │   ├── runStorageService.ts       # Unified local storage adapter
│   │       │   └── runSyncService.ts          # Automatic background sync queue
│   │       ├── types/            # TypeScript contracts & interfaces
│   │       └── utils/            # Calculation formulas & formatters
│   ├── lib/                      # Shared libraries, Firebase, and helpers
│   │   ├── firebase.ts           # Firebase SDK initialization & Firestore handle
│   │   ├── habitService.ts       # Firestore habit CRUD operations
│   │   ├── dateUtils.ts          # Timezone-safe date formatters
│   │   ├── themeService.ts       # Dark / Light / System theme manager
│   │   └── usePWA.ts             # Service worker registration & installation
│   ├── App.tsx                   # Main React container & routing state
│   ├── main.tsx                  # React entry point
│   ├── index.css                 # Global CSS & Tailwind v4 theme configuration
│   └── types.ts                  # Shared habit and user domain models
├── firebase-blueprint.json       # Intermediate Representation of data schemas
├── firebase-applet-config.json   # Provisioned Firebase project configuration
├── firestore.rules               # Production Firestore security rules
├── server.ts                     # Full-stack Express server with Vite middleware
├── vite.config.ts                # Vite build and PWA configuration
├── tsconfig.json                 # TypeScript compiler configuration
└── package.json                  # Dependencies and build scripts
```

---

## 5. Installation and Setup

### Prerequisites
- Node.js 20+ installed
- npm or bun package manager

### Steps

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd react-example
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```
   The application runs on `http://localhost:3000`.

4. **Run automated test suites:**
   ```bash
   npx tsx --test src/features/daily-run/__tests__/*.test.ts
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

6. **Start production server:**
   ```bash
   npm start
   ```

---

## 6. Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```env
# Firebase Client Configuration (Public Web Credentials)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_FIRESTORE_DATABASE_ID=(default)

# AI Service Credentials (Server-Side Proxy Routes)
GEMINI_API_KEY=your_google_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Node Environment
NODE_ENV=development
PORT=3000
```

> **Security Note:** Never commit your `.env` file or expose private API keys in client-side code. Google Workspace OAuth and Firebase client configurations use client-safe tokens, while AI model requests are mediated via server-side endpoints.

---

## 7. Firebase Setup & Data Structure

### Authentication
- Configured for **Google Authentication** via Firebase Auth popup (`signInWithPopup`).
- Unauthenticated users can explore the Landing Page; authenticating creates an isolated user account mapped to `request.auth.uid`.

### Firestore Subcollection Structure
All user data is strictly scoped beneath their individual UID to ensure complete account isolation:

```
users/{userId}
  ├── habitSettings/{habitId}      # User habit definitions
  ├── dailyLogs/{date}             # Daily completion records (YYYY-MM-DD)
  ├── reminderSettings/{habitId}   # Scheduled notification times
  ├── settings/{settingId}         # User preferences and theme
  ├── milestones/{milestoneId}     # Unlocked streak milestone badges
  ├── foodLogs/{foodLogId}         # AI meal scans and macronutrient records
  ├── weightHistory/{entryId}      # Voluntary weight tracking check-ins
  ├── goals/{goalId}               # Personal habit goals
  ├── runs/{runId}                 # Completed GPS runs with route telemetry
  └── savedRoutes/{routeId}        # Favourite loop routes and custom paths
```

### Security Rules (`firestore.rules`)
Firestore enforces Attribute-Based Access Control (ABAC):
- Catch-all default deny on all collections.
- `isOwner(userId)` checks ensure only the authenticated user matching `request.auth.uid == userId` can read, create, update, or delete their documents.
- Strict payload validation on `runs` and `savedRoutes` prevents document tampering or orphaned writes.

---

## 8. PWA & Android Setup

- **Progressive Web App (PWA):** Configured via `vite-plugin-pwa` with `registerType: 'autoUpdate'`.
- **Manifest:** Defined in `public/manifest.json` with standalone display mode, high-contrast launcher icons (192px and 512px maskable), and theme color `#09090b`.
- **Installability:** In-app banner and install triggers (`beforeinstallprompt`) allow adding Daily Habits directly to the home screen on Android and iOS.
- **Service Worker:** Caches application shell assets for offline startup.
- **Android Device Guidance:** When running outdoor GPS tracks in a browser, keeping the screen active or tab visible ensures uninterrupted GPS collection. Native Android background service integration is planned for future phases.

---

## 9. Deployment

- **Containerized Full-Stack Web Application:** Hosted on Google Cloud Run via AI Studio Build infrastructure.
- **Production Build Process:**
  - `npm run build` compiles frontend assets to `/dist` via Vite.
  - `esbuild` bundles `server.ts` into a standalone Node.js production runner (`dist/server.cjs`).
  - Container runs `npm start` (`node dist/server.cjs`) serving the Express backend and static assets on port 3000.

---

## 10. Daily Run Development Roadmap

| Phase | Description | Implementation Status |
| :--- | :--- | :--- |
| **Phase 1** | Daily Run UI & Layout Foundation | ✅ Completed |
| **Phase 2** | Live GPS Tracking & Interactive Route Map | ✅ Completed |
| **Phase 3** | Running Statistics & Real-time Pace Engine | ✅ Completed |
| **Phase 4** | Firebase Integration & Cloud Run History | ✅ Completed |
| **Phase 5** | Offline Support & Automatic Cloud Sync | ✅ Completed |
| **Phase 6** | Native Android Background GPS Service | ⏳ Planned (Android Native Service) |
| **Phase 7** | Running History, Analytics & Performance Insights | ✅ Completed |
| **Feature** | Daily Routes: Loop Discovery & Deviation Guidance | ✅ Completed |

---

## 11. Privacy and Security

- **Strict Account Isolation:** User data (habits, notes, weight, runs, routes) is partitioned under `users/{userId}` and mathematically guarded by Firebase security rules. Users can never query or view other users' records.
- **GPS Location Privacy:** GPS coordinates are stored only when the user explicitly taps "Start Run" and confirms saving. Coordinates are never transmitted to third parties or used for background telemetry.
- **Data Export & Deletion:** Users retain full data ownership with 1-tap JSON data export and complete account deletion options in their Profile.

---

## 12. License

This project is licensed under the **Apache-2.0** License.
