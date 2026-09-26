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
- **Static Assets in Source**: Marketing assets, logos, and landing page visual mockups (`HERO_CARDS`) are stored as static source elements in the codebase.
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

### 4. Ultra-Robust Self-Profile Exclusion
- Excludes logged-in user profiles across **Discover**, **Search**, and **Matches** by checking multiple identifier formats (`userId`, `id`, `prof_user_`, `pm_auth_user`, `email`).

---

## 🔒 Security & Privacy Controls
- Photo visibility controls (`all_members`, `verified_only`, `on_request`).
- Soft deletion / profile unpublishing toggles (`published !== false`).
- Full client-side data isolation per user key.

---

## 🏃 Useful Commands
- **Run Frontend Dev Server**: `npm run dev`
- **Build Workspace**: `npm run build`
