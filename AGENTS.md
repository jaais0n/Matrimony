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
- **Backend Service**: Express.js REST API (`artifacts/api-server`) with mock storage & SQLite fallback
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
├── artifacts/
│   ├── pentecostal-matrimony/        # Primary Web Application (Vite + React TSX)
│   │   ├── src/
│   │   │   ├── components/           # UI Components (Navbar, BottomNav, Footer, ProfileCard, etc.)
│   │   │   ├── pages/                # Page Views (LandingPage, DiscoverPage, MatchesPage, etc.)
│   │   │   ├── utils/                # Helpers (storageHelper, image compression, deduplication)
│   │   │   ├── auth.tsx              # Clerk / Local Authentication Provider
│   │   │   ├── App.tsx               # App Root Routing & Data Synchronization
│   │   │   └── main.tsx              # React Entry Point
│   │   ├── index.html                # Main HTML Shell (Clean SEO & Meta Tags)
│   │   └── vite.config.ts            # Vite Build & Dev Server Configuration
│   │
│   └── api-server/                   # Express REST API Server
│       └── src/
│           ├── index.ts              # API Entry Point & Express Setup
│           └── middlewares/          # Security & Auth Proxy Middlewares
│
└── lib/                              # Shared Workspace Libraries
    ├── api-client-react/             # Generated React Query API Hooks & Mock Handler
    ├── api-spec/                     # OpenAPI 3.0 YAML Schema
    └── api-zod/                      # Generated Zod Validation Schemas
```

---

## 🚀 Completed Features & Enhancements

### 1. Ultra-Robust Self-Profile Exclusion (Mobile & Network Sync)
- **Problem Resolved**: When logged-in users registered or viewed the app from mobile devices or local network IP addresses (`192.168.x.x`), their own profile cards could show up in **Discover**, **Search**, or **Matches**.
- **Fix Implemented**: Built an exhaustive multi-source self-filtering algorithm in `DiscoverPage.tsx`, `SearchPage.tsx`, and `MatchesPage.tsx`:
  - Collects all user markers (`userId`, `user.id`, `pm_auth_user`, `pm_my_profile`, `displayName`, `email`).
  - Normalizes and checks across all ID formats (`prof_`, `user_`, `prof_user_`, and clean raw IDs).
  - Guarantees 100% exclusion of the logged-in user's profile card on all screens and mobile viewports.

### 2. TypeScript Type Safety & `ProfileSummary` Fixes
- Fixed type mismatch errors where `userId` and `published` properties were missing on generated `ProfileSummary` interfaces.
- Updated `mock-handler.ts` to preserve `userId` and fallback fields in `toSummary()`.

### 3. Complete Replit Dependency & Reference Removal
- Removed all Replit-specific plugins (`@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`, `@replit/vite-plugin-runtime-error-modal`, `@replit/connectors-sdk`).
- Cleaned up configuration files (`.replit`, `.replitignore`, `replit.md`, `package.json`, `pnpm-workspace.yaml`, `vite.config.ts`, `index.html`).
- Eliminated 100% of Replit annotations, comments, and package references across all components.

### 4. Navbar & Branding Flow
- Fixed PM Logo brand button in `Navbar.tsx` so clicking the logo routes seamlessly to the Landing Page (`/`).
- Modernized header banner with spiritual motto: *"Faith. Values. A Life Together. A dedicated matrimonial community for Pentecostal Christian believers."*

### 5. Multi-Step Registration & Instant Image Processing
- 10-Step Registration Wizard (`OnboardingPage.tsx`) covering Faith, Denomination, Church Involvement, Education, Career, Family Background, and Partner Preferences.
- Canvas-based client-side image compression in `storageHelper.ts` (automatically resizes photo uploads to safe base64 payloads under quota limits).

### 6. Verification Queue & Admin Control
- Admin Dashboard (`AdminDashboardPage.tsx`) with single-click Admin credentials (`admin` / `admin`).
- Real-time profile verification status badge (`verified`, `under_review`, `rejected`).

---

## 🔒 Security & Privacy Controls
- Photo visibility modes (`all_members`, `verified_only`, `on_request`).
- Soft deletion / profile unpublishing toggles (`published !== false`).
- Full client-side data isolation per user key.

---

## 🏃 Useful Commands
- **Run Frontend Dev Server**: `npm run dev`
- **Typecheck Workspace**: `npm run typecheck`
