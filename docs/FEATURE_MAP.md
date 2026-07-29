# 🗺️ deals.seller Seller Portal — Comprehensive Feature Map & Serial Release History

> **Note**: This file is a mirror of the master [FEATURE_MAP.md](file:///f:/workspcae/deals-seller-portal/FEATURE_MAP.md) located at the root of the project repository.

---

## 📌 Table of Contents
1. [Visual System Architecture & Feature Flow](#-visual-system-architecture--feature-flow)
2. [Chronological Feature Release History (Added in Series)](#-chronological-feature-release-history-added-in-series)
3. [Feature Breakdown by Functional Modules](#-feature-breakdown-by-functional-modules)
4. [Summary Table of Series Releases](#-summary-table-of-series-releases)

---

## 🧭 Visual System Architecture & Feature Flow

```mermaid
graph TD
    subgraph Frontend ["Frontend (Next.js 14 App / Liquid Glass UI)"]
        AUTH[Auth System - JWT & Alias Login]
        BUYER[Buyer Portal SPA]
        ADMIN[Admin Control Center]
        EXP_MODAL[MIS Batch Export Pipeline Modal]
        AI_UI[AI & Analytics Suite Dashboard]
    end

    subgraph Backend ["Backend API & Core Engines (Next.js API Routes)"]
        API_AUTH[/api/auth/*]
        API_ORDERS[/api/orders/*]
        API_DEALS[/api/deals/*]
        API_EXPORT[/api/admin/orders/export-by-code]
        API_AI[/api/admin/analytics]
        API_SUPPORT[/api/tickets/*]
    end

    subgraph Database ["Cloud Database & Caching"]
        MONGO[(MongoDB Atlas Cloud)]
        TTL_CACHE[(Serverless In-Memory TTL Cache)]
    end

    AUTH --> API_AUTH
    BUYER --> API_ORDERS
    BUYER --> API_DEALS
    BUYER --> API_SUPPORT
    ADMIN --> API_ORDERS
    ADMIN --> API_EXPORT
    ADMIN --> API_AI
    EXP_MODAL --> API_EXPORT

    API_AUTH --> MONGO
    API_ORDERS --> TTL_CACHE
    API_DEALS --> TTL_CACHE
    TTL_CACHE --> MONGO
    API_EXPORT --> MONGO
    API_AI --> MONGO
```

---

## 📜 Chronological Feature Release History (Added in Series)

### Phase 1: Foundation & Static HTML/CSS/JS MVP (July 15, 2026)
- **Initial Core Architecture**: Created client-side SPA structure with Vanilla HTML5, CSS3, and JavaScript.
- **SHA-256 Auth & Session Security**: Implemented client-side cryptographic hashing via Web Crypto API with 8-hour auto-expiring sessions.
- **Role-Based Portals**: Created separated views for Buyer Dashboard (`/customer/dashboard.html`) and Admin Panel (`/admin/panel.html`).
- **5-Stage Refund Timeline**: Built an interactive visual timeline tracker for order refunds (0–6h, 6–24h, 24–36h, 36–48h, Resolved).
- **Basic Deal Catalog & Order Form**: Enabled deal browsing, order code submissions, and local mock storage persistence.

### Phase 2: Admin Operations Overhaul & CSV Exporter (July 16, 2026)
- **Bulk Action Operations**: Added multi-select batch status updates and **Delete All Orders** administrative purge utility (`199f786`).
- **User Fraud Sentinel**: Introduced suspension and user impersonation controls for buyer management (`64b5154`).
- **CSV Data Exporters**: Built instant download handlers for Orders CSV, Users CSV, and Refund Claims CSV.
- **Order Details Enhancements**: Added custom Order Name fields to streamline buyer submissions (`ad62e5e`).

### Phase 3: Zero-Dependency Deployment Engine (July 16 - July 19, 2026)
- **Client-Side Mock API Router**: Embedded a standalone mock route interceptor for zero-dependency preview deployments (`74cae83`).
- **Netlify & Vercel Deploy Pipelines**: Configured dynamic API URL rewrites, node 24 build triggers, and environment secret rotators (`d270b76`, `34e6267`).
- **Idempotent DB Seeder**: Built self-updating seed catalog logic to handle password updates and schema upgrades without data corruption (`66f2aa8`).
- **Demo Credential Hygiene**: Removed legacy quick login pills and sanitized login form inputs with automatic whitespace stripping (`98b3e8c`).

### Phase 4: Next.js 14 Migration & Apple Vision Pro Liquid Glass UI (July 25, 2026)
- **Framework Upgrade**: Refactored static SPA into **Next.js 14 App Architecture** with TypeScript, dynamic routing, and modular components (`615f67d`).
- **Apple Vision Pro Design System**: Built **Advanced Liquid Glass UI & UX** featuring frosted glassmorphism (`backdrop-filter: blur(24px)`), ambient glowing mesh backgrounds, specular highlights, and high-contrast typography (`98c69af`, `bc32d25`, `ee52714`).
- **Color Palette Overhaul**: Adopted **Electric Cyber Violet & Neon Cyan HSL Scheme** (`d8cca1b`).
- **Interactive Registration Modal**: Created live backend account registration flow with interactive error toasts (`24019a1`).
- **Liquid Controls & Data Tables**: Designed glowing glass table rows, status pills, and interactive search controls (`d530449`).

### Phase 5: Deal Types, Multi-Platform Expansion & Custom Deduction (July 25, 2026)
- **Multi-Platform Support**: Integrated standard platform definitions: **Amazon, Flipkart, Meesho, Myntra, Blinkit, Nykaa, Ajio** (`788808a`, `090f160`).
- **Expanded Deal Types (6 Variants)**: Original, Exchange, Empty, Review, Cashback, Rating (`2f4bcc9`, `7595503`).
- **Flat Rupee Cut System**: Replaced percentage deduction with explicit flat rupee deduction amounts for exact payout transparency (`8e1d5c8`, `ae4a261`).
- **Live Deduction & Refund Calculator**: Added real-time calculation previews (`Price - Cut = Net Refund`) directly inside buyer order submit forms (`41cb292`, `63bc8fb`).
- **Real-Time Slot Engine**: Implemented automatic slot decrements when a deal is claimed or order is submitted (`8eb681c`).
- **Support Ticket Desk**: Built real-time sync support desk with ticket submission, status tracking, and responses (`bee97c1`).
- **Mobile Touch Optimization**: Fine-tuned touch targets, viewport scaling, and safe-area padding for iOS and Android devices (`d4021dc`).

### Phase 6: MongoDB Cloud Architecture & Cross-Device JWT Auth (July 25 - July 27, 2026)
- **MongoDB Atlas Integration**: Migrated entire backend to **MongoDB Atlas Cloud Database** with 20+ production-grade API routes (`c4e0b11`).
- **Direct JWT API Layer**: Eliminated client-side localStorage fallback; enforced JWT authorization headers with 10-second background cloud sync (`c9def7f`).
- **TLS 80 & Client Optimization**: Fixed OpenSSL TLS alert 80 with global MongoDB client promise caching and explicit TLS connection options (`2b1ef0f`).
- **Single Admin Credentials**: Restricted administrative access strictly to single verified account (`admin` / `admin@123`) with instant alias matching (`5bc17fb`, `347254d`).

### Phase 7: Dynamic Order Code Engine & Buyer Real-Time Sync (July 27, 2026)
- **Universal Order Code Format Engine**: Added support for flexible order code formats (e.g., `1200`, `ORD-45891`, `INV20260727`, `ABC001`) with automatic query sanitization (`6b01006`).
- **Order Code Persistence**: Ensured custom codes entered by buyers/admins are persisted verbatim without auto-overwriting (`2a527ad`).
- **Buyer Live Status Sync**: Added real-time order status tracking, admin review notes/remarks, and interactive order detail modals in Buyer Panel (`4888bd8`).
- **Sidebar Tab Sync**: Fixed URL query listener and sidebar navigation sync so clicking any menu item dynamically switches tabs without page reloads (`0ef1cc1`).

### Phase 8: MIS Multi-Stage Order Export & Validation Pipeline (July 27, 2026)
- **Batch Export by Order Code**: Created specialized Admin MIS Export feature supporting comma-separated Order Code queries (`3917418`).
- **Multi-Stage Export Pipeline**: Built dynamic pipeline modal featuring code sanitization, server validation preview, and instant Excel/CSV download (`d731fcd`).

### Phase 9: AI & Advanced Analytics Suite + Audit Sentinel (July 27, 2026)
- **AI & Analytics Engine (`16676ec`)**: AI Fraud Sentinel, Predictive Cashback Model, Brand & Category Matrix, LTV & Repeat Purchase Analytics.
- **Enterprise Admin Tools (`ad00254`)**: Manual Cashback Adjustments, Bulk Order CSV Import, Bulk Cashback Approval Desk, RBAC & Audit Logs, Quick Launcher Bar (`9f6a83d`).

### Phase 10: Enterprise Performance Tuning & Skeleton Loading Architecture (July 27, 2026)
- **MongoDB Indexing**: Added compound background indexing on `orderCode`, `userId`, `status`, and `createdAt` (`94ab00a`).
- **Serverless TTL Cache**: Integrated memory cache layer for high-throughput deal catalog reads.
- **Netflix MIS Skeleton Loaders**: Implemented fluid skeleton loaders during dynamic server fetches (`d731fcd`).

---

## 📌 Summary Table of Series Releases

| Release Phase | Date | Key Focus Areas | Major Features Added |
| :--- | :--- | :--- | :--- |
| **Phase 1** | July 15, 2026 | HTML/CSS/JS MVP | SHA-256 Auth, Buyer Dashboard, Admin Panel, Refund Timeline |
| **Phase 2** | July 16, 2026 | Admin Tools & CSV | Bulk order actions, User suspension, Orders/Users CSV exports |
| **Phase 3** | July 16, 2026 | Deployment & Mock API | Client-side mock router, Netlify/Vercel pipelines, DB seeder |
| **Phase 4** | July 25, 2026 | Next.js 14 & Liquid UI | Next.js 14 refactor, Apple Vision Pro Liquid Glass UI, Registration flow |
| **Phase 5** | July 25, 2026 | Deals & Deductions | 6 Deal Types, Flat Rupee Cut, Live refund calculator, Support desk |
| **Phase 6** | July 25–27, 2026 | MongoDB & JWT Cloud | MongoDB Atlas migration, 20+ API routes, JWT auth, single admin security |
| **Phase 7** | July 27, 2026 | Dynamic Order Codes | Universal code matching (1200, ORD-xxx), Code persistence, Live buyer sync |
| **Phase 8** | July 27, 2026 | MIS Batch Export | Batch export by order code, 3-stage validation pipeline modal, Excel export |
| **Phase 9** | July 27, 2026 | AI & Analytics Suite | AI Fraud Sentinel, Predictive Cashback, LTV Analytics, Audit Logs |
| **Phase 10** | July 27, 2026 | Performance & Skeletons| MongoDB indexing, TTL memory cache, Netflix MIS skeleton loader |
