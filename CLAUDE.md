# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, port 5173)
npm run build     # Production build to dist/
npm run lint      # ESLint
npm run preview   # Preview production build
```

No test suite is configured. There are no unit or integration tests.

### Firebase Functions (in `functions/`)
```bash
cd functions && npm install
firebase deploy --only functions   # Deploy Cloud Functions
```

## Architecture Overview

This is a **React + Vite SPA** for CPQ (Configure, Price, Quote) — a quoting tool for sales teams. All data lives in Firebase (Firestore + Auth + Storage). There is no React Router; navigation is handled by a `route` state variable in [App.jsx](src/App.jsx) that switches between page components.

### Data Layer: Firestore Schema

All user data is namespaced under `usuarios/{userId}/`:

| Subcollection | Purpose |
|---|---|
| `cotizaciones/` | Quotes |
| `productos/` | Product catalog |
| `clientes/` | Clients |
| `settings/company` | Company branding/settings |
| `configuracion/condiciones` | Quote conditions (payment terms, etc.) |
| `configuracion/impuestos` | Tax definitions |
| `contadores/cotizacion` | Atomic counter for quote numbering |

Quote numbers are generated atomically via Firestore transactions in [firestoreUtils.js](src/utils/firestoreUtils.js) — format: `COT-XXXX`.

### Authentication

Firebase Auth is initialized in two places: [App.jsx](src/App.jsx) and [AuthContext.jsx](src/context/AuthContext.jsx). The `useAuth()` hook (from [context/useAuth.js](src/context/useAuth.js)) is the standard way to access the current user throughout the app. All page-level components receive `db` (Firestore instance) and `navigate` as props.

### Module Structure

```
src/
  componentes/
    catalogo/     — Product catalog (CRUD for productos)
    clientes/     — Client management
    cotizador/    — Quote builder, PDF generation, email sending
    configuracion/ — Settings: conditions, taxes, PDF styles, company info
    dashboard/    — Stats, funnel chart, AI insights panel
    login/        — Firebase Auth login screen
    comunes/      — Shared UI primitives (AlertDialog, Notification, etc.)
  ui/             — shadcn/ui components + custom layout (AppSidebar, DataTable)
  context/        — AuthContext + useAuth hook
  utils/          — firestoreUtils, quoteStates, quoteNumbering, dashboardUtils
  hooks/          — use-mobile, useSelection, useSendQuoteEmail
```

### PDF Generation

Quotes are rendered to PDF using `@react-pdf/renderer`. There are four PDF style templates in [src/componentes/configuracion/estilos/pdf/](src/componentes/configuracion/estilos/pdf/): Bubble, Light, Striped, Wave. The active template is selected via company settings. PDF generation happens in the browser; the PDF blob is passed as base64 to the Cloud Function for email attachment.

### Cloud Functions (`functions/index.js`)

- **`sendQuoteEmail`** (callable): Generates and sends quote emails via Resend. Requires `RESEND_API_KEY`, `FROM_EMAIL`, `FROM_NAME` configured as Firebase Function params. On success, updates the quote's `estado` to `"Enviada"` in Firestore.
- **`getCompanyLogo`** (HTTP): Fetches company logo from Firebase Storage and returns it as base64 to avoid CORS issues in PDF rendering.

### Quote States

Defined in [src/utils/quoteStates.js](src/utils/quoteStates.js): `Borrador` → `Enviada` → `Ganada` / `Perdida`. State transitions are validated; quotes can be reopened from Won/Lost back to Sent.

### Aliases

`@/` maps to `src/` (configured in [vite.config.js](vite.config.js)).

### Environment Variables

Copy `.env.example` to `.env.local` and fill in Firebase config values (`VITE_FIREBASE_*`). All frontend env vars must be prefixed with `VITE_`. Firebase Admin credentials for Cloud Functions go in `functions/.env`.

### Deployment

The frontend deploys to **Vercel** (see [vercel.json](vercel.json) and `.vercel/`). Firebase is used for Firestore, Auth, Storage, and Cloud Functions. The `api/` directory contains a Vercel Edge Function for AI insights generation.
