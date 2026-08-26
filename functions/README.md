# Secure backend

This folder contains server-side TypeScript code for Firebase Functions. It is
not deployed yet. M-Pesa and KCB credentials must be stored using Firebase
Secret Manager and must never use a `VITE_` environment variable.

Implemented:

- `runScheduledBillingResets` — runs daily at 00:10 Africa/Nairobi, selects only
  properties due that day, resets each room in a Firestore transaction, resumes
  safely after partial failure, and records one completed reset per property and
  month.
- Unit tests for unpaid rent, credit carry-forward, vacant rooms, and duplicate
  monthly execution.

Still planned:

- `src/integrations/mpesa` — Daraja authorization, STK Push and callbacks.
- `src/integrations/kcb` — Buni authorization and payment notifications.
- `src/users` — administrator-only account creation with a five-user limit.
- `src/reconciliation` — safely match provider transactions to rooms.

Before deployment, confirm that the Functions region matches the Firestore
location. The current code uses `africa-south1` (Johannesburg).

