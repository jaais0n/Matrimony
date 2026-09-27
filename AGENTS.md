# AGENTS.md — Pentecostal Matrimony Platform Architecture & Development Log

## 📌 Project Overview
**Pentecostal Matrimony** is a modern, high-performance, and feature-rich matrimonial platform specifically tailored for Pentecostal Christian believers. Built with high aesthetic standards, rich typography, smooth animations, and robust client-side & server-side data synchronization.

---

## 🛠️ Core Technology Stack
- **Frontend Framework**: React 19, TypeScript, Vite 7
- **Routing**: Wouter (`/`, `/discover`, `/matches`, `/search`, `/interests`, `/messages`, `/my-profile`, `/admin`, etc.)
- **Styling**: Tailwind CSS v4, Custom CSS tokens, Glassmorphism, Luxury Warm Palette (`rose-950`, `amber-200`, `slate-900`)
- **Icons**: Lucide React
- **State & Data Fetching**: TanStack React Query v5, Custom Sync Handlers
- **API Architecture**: OpenAPI Specification (`lib/api-spec/openapi.yaml`), Orval Zod & React Query client generators (`lib/api-client-react`)
- **Cloud Database Backend**: Serverless API backed by Neon PostgreSQL (`api/profiles`, `api/users`, `api/status`) with native SQL transactions and global edge response caching (`s-maxage=10, stale-while-revalidate=30`)
- **Authentication**: Modular Clerk integration (`@clerk/react`) with an instant built-in offline authentication engine fallback

---

## 📁 Repository Structure
```
Pentecostal-Matrimony/
├── AGENTS.md                         # Comprehensive System Architecture & Agent Log
├── package.json                      # Workspace Root Package Configuration
├── pnpm-workspace.yaml               # PNPM Workspace Settings & Shared Catalogs
├── tsconfig.json                     # Root TypeScript Configuration
│
├── api/                              # Production Vercel Serverless Functions
│   ├── _lib/                         # Database adapters (Neon PostgreSQL HTTP /sql engine)
│   ├── profiles/                     # /api/profiles (GET, POST, DELETE with ?all=true reset)
│   ├── users/                        # /api/users (GET, POST)
│   └── status.js                     # /api/status health check
│
├── artifacts/
│   ├── pentecostal-matrimony/        # Primary Web Application (Vite + React TSX)
│   │   ├── src/
│   │   │   ├── components/           # UI Components (Navbar, BottomNav, Footer, ProfileCard, etc.)
│   │   │   ├── pages/                # Page Views (LandingPage, DiscoverPage, MatchesPage, etc.)
│   │   │   ├── utils/                # Helpers (storageHelper, image compression <50KB)
│   │   │   ├── auth.tsx              # Clerk / Local Authentication Provider
│   │   │   ├── App.tsx               # App Root Routing & Data Synchronization
│   │   │   └── main.tsx              # React Entry Point
│   │   ├── index.html                # Main HTML Shell (Clean SEO & Meta Tags)
│   │   └── vite.config.ts            # Vite Build & Dev Server Configuration
│   │
│   └── api-server/                   # Express REST API Server (Local fallback)
│
└── lib/                              # Shared Workspace Libraries
    ├── api-client-react/             # Generated React Query API Hooks & Clean Mock Handler
    ├── api-spec/                     # OpenAPI 3.0 YAML Schema
    └── api-zod/                      # Generated Zod Validation Schemas
```

---

## 🚀 Key Architectural Guidelines & Completed Enhancements

### 1. Zero-Dummy Database & Clean Data Separation
- **Static Assets in Source**: Marketing assets, logos, and landing page visual mockups (`HERO_CARDS`) are stored as compressed, local static assets (`src/assets/hero/`) bundled directly with Vite for 0-latency instant rendering without external network requests.
- **Real User Data in Database**: Real candidate profiles and user accounts are created dynamically by registered users and stored exclusively in Neon PostgreSQL cloud database (`pm_store` table).
- **Zero Dummy Profiles in DB**: Database tables and mock registries are kept 100% clean with 0 seed/dummy profiles.

### 2. High-Performance Photo Compression (< 50 KB) & Fast DB Retrieval
- **Ultra-Lightweight Photo Compression**: In `storageHelper.ts`, photos are automatically resized to `720px` max dimension and progressively compressed strictly **under 50 KB (target 45–48 KB)**.
- **Instant Cloud Sync & Low Payload**: Small payload sizes ensure rapid uploads and near-instant database fetches on both desktop and mobile networks (`192.168.x.x`).
- **Edge Caching**: `/api/profiles` includes `Cache-Control: s-maxage=10, stale-while-revalidate=30` for low-latency Edge responses.
- **Clean UI**: Removed all technical file size badges, HD pills, and compression metrics from the user-facing interface for a polished, clean aesthetic.

### 3. Fully Operational Admin Dashboard (`/admin`)
- **Credentials**: `admin` / `admin`
- **Profiles Directory**: Filter by verification status, live search, candidate preview modal, verify/re-check action, single profile delete, and full database reset (`Clear All From DB`).
- **Verification Queue**: One-click actions to Verify, Hold (under review), or Reject candidates.
- **Moderation & Reports**: Log new candidate misconduct complaints, Dismiss reports, or Suspend accounts.
- **Churches & Denominations**: Add new churches/denominations with dynamic state lists and delete buttons.
- **Subscriptions & Quotas**: Tier breakdowns and "+ Grant 50 Requests & VIP" button.
- **Pastoral Broadcast**: Composer to dispatch platform announcements with full broadcast audit history.
- **Analytics & Settings**: Real-time progress bars for denominational distribution, gender ratio, verification pass rates, and platform policy switches.

### 5. Streamlined Post-Publish UX & Discovery Flow
- **Direct Route to Discover**: Completing profile publication directly transitions the user to the `/discover` directory to immediately explore candidate matches rather than looping back to the profile edit form.
- **Welcoming Celebration Banner**: Automatically displays an encouraging confirmation banner upon arrival at `/discover`.
- **Smooth Step Transitions**: Auto-scrolls to top (`window.scrollTo({ top: 0, behavior: 'smooth' })`) across wizard steps on both mobile and desktop viewports.

### 6. Card Button Alignment, Skeleton Shimmer, & Messaging Wiring
- **Razor-Straight Card Button Alignment**: `ProfileCard` action buttons use `mt-auto` and fixed `h-10` dimensions so buttons across all adjacent grid cards are strictly aligned to the exact same horizontal level regardless of chip wrapping or text lengths.
- **Sanitized Location Strings**: Eliminates orphan `, India` entries by cleanly composing `[location, country].filter(Boolean).join(', ')`.
- **Skeleton Shimmer Loading**: Replaced plain "Loading profile details..." with an animated skeleton matching the exact layout of the profile detail view.
- **Removed Unnecessary Publish Checkbox**: In `MyProfilePage`, removed the explicit "Publish profile to public Discover directory" checkbox; profiles default to published seamlessly upon save.
- **End-to-End Messaging & Interest Actions**: Clicking "Message" on any profile card or detail page immediately opens the candidate's direct conversation thread in `/messages`, with backend persistence for message sending and interest acceptance.

### 7. Database-First Authentication & Zero Ghost-Account Security
- **Strict DB-First Entry Barrier**: Users who do not exist in the live Neon PostgreSQL cloud database (`/api/auth/users`) are strictly forbidden from entering the member portal (`/discover`, `/search`, `/profiles/:id`, `/interests`, `/messages`, `/my-profile`, etc.).
- **Live Database Sign-In (`signIn`)**: The authentication flow asynchronously queries the live database with `cache: 'no-store'`. If credentials do not correspond to an active database record, login is blocked immediately with `"Account not found in database. This user is not registered or has been deleted from the database. Portal entry is not allowed."`
- **Silent Background Verification**: Session checks against Neon DB occur completely in the background without disruptive full-screen loading modals or page freezes. Active member portal views render instantly and smoothly.
- **Throttled Live Heartbeat & Eviction**: Background validation is throttled (minimum 60-second cooldown) to avoid redundant network overhead. If an administrator wipes the database or deletes an account, the background check quietly invalidates local session tokens and redirects to `/sign-in?error=not_in_db`.
- **Network Resilience**: In case of temporary network glitches or server spin-up delays, active sessions are preserved gracefully rather than falsely evicted.

### 8. Unique Credentials & Identity Collision Prevention
- **Unique User IDs**: Every registered account is issued an isolated, collision-free user identifier generated via `generateUniqueUserId(email, fullName)`.
- **Unique Email Constraint**: Prohibits multiple accounts with the same Gmail/email address across client forms (`OnboardingPage`, `SignUp`) and serverless handlers (`/api/auth/register`).
- **Unique Phone Constraint**: Prohibits multiple accounts with the same phone number (accounting for country codes and 10-digit national numbers) via `isPhoneMatch` and server validation.

---

## 🔒 Security & Privacy Controls
- Photo visibility controls (`all_members`, `verified_only`, `on_request`).
- Soft deletion / profile unpublishing toggles (`published !== false`).
- Full client-side data isolation per user key.
- Authoritative cloud database verification prior to portal access.

---

## 🏃 Useful Commands
- **Run Frontend Dev Server**: `npm run dev`
- **Build Workspace**: `npm run build`

