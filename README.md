# Neverfade POS — Frontend

React/TypeScript client for a multi-tenant point-of-sale system covering checkout, merchant operations, and specialized retail, restaurant, and laundry workflows. This is the frontend companion to [Neverfade POS Backend](https://github.com/karkandea/backend-pos-neverfade).

> **Status:** Active engineering development. The default branch contains implemented screens and integration contracts, while additional features remain in draft PRs and release gates. This repository is not evidence of a fully certified production rollout.

## Engineering snapshot

| Area | Implementation |
| --- | --- |
| UI | React, TypeScript, Vite, React Router |
| State and API | Zustand stores and Axios-backed requests |
| Tenant boundaries | Auth restoration, server-derived tenant capability context, role-aware routes |
| POS workflows | Cashier, transactions, products, stock, customers, reports and finance |
| Vertical workflows | Restaurant tables/kitchen, laundry work orders, retail variants/returns |
| Platform area | Separate platform login and tenant-management screens |
| Verification | TypeScript build, ESLint, Playwright E2E sources and QA gate scripts |

## What is in the repository

- **Merchant operations:** dashboard, product management, inventory, customer management, user/employee administration, attendance, settings and reports.
- **Checkout and transactions:** cashier-facing views and a contract-bound API client. Server calculations and authorization belong to the backend.
- **Vertical modules:** restaurant order/table flows, laundry operational queues, fashion/retail variant pricing and returns.
- **Multi-tenant UX:** tenant capability loading and navigation gating; the UI waits for context and reports loading errors instead of assuming access.
- **Platform control plane:** separate platform screens for tenant records and related owner operations.

Key entry points: [`src/App.tsx`](src/App.tsx), [`src/pages`](src/pages), [`src/stores`](src/stores), and [`src/features`](src/features).

## Run locally

Requirements: Node.js compatible with Vite 8, npm, and a compatible Neverfade POS API for authenticated flows.

```bash
npm ci
cp .env.example .env
# Set VITE_API_URL to your local or isolated test backend.
npm run dev
```

The example API target is `http://localhost:5012`. Never point automated tests at a production database. Values prefixed `VITE_` are bundled into browser code, so do not store secrets there.

## Verification

```bash
npm run lint
npm run build
npm run test:e2e:list
# Run browser tests only after preparing the required isolated API/test fixtures:
npm run test:e2e
```

Some Playwright suites require specific backend services, credentials, or seeded data; listing tests is not equivalent to passing them. See [`tests/e2e`](tests/e2e) and [`qa`](qa) for the available browser and environment gates.

## Contracts and limitations

- [Frontend API contract](API-CONTRACT.md) and [backend contract](https://github.com/karkandea/backend-pos-neverfade/blob/main/CONTRACT.md).
- Authentication and tenant authorization must be enforced by the API; hiding a menu is not a security boundary.
- Current default-branch behavior should not be confused with features in open draft PRs.
- Payment-provider, device, real-database, and full release acceptance require separate evidence; a successful frontend build alone is insufficient.

This repository is most useful as a case study in **complex API-connected business UI, access-aware navigation, and testable operational flows**.
