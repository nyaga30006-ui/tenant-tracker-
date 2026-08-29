# Safe Firebase setup

The app remains on local storage until `VITE_DATA_BACKEND=firebase` is set. Do
not point localhost at the existing live project while developing.

## Safety switches

```env
VITE_DATA_BACKEND=local
VITE_FIREBASE_USE_EMULATORS=false
VITE_FIREBASE_ALLOW_LIVE=false
```

If Firebase mode is selected on localhost without the emulators, the app throws
a safety error before initializing Firebase. `VITE_FIREBASE_ALLOW_LIVE=true`
must only be used after the project ID and staging plan have been reviewed.

## Local emulator workflow

The repository includes a project-local Firebase CLI and a
`.env.firebase-emulator` file containing fake `demo-myproperty` credentials.
The `demo-` prefix is deliberate: Firebase blocks attempts to reach
non-emulated services for demo project IDs.

In the first VS Code terminal, start Auth, Firestore, Functions, Pub/Sub, and
the Emulator UI:

```powershell
npm run firebase:emulators
```

In a second terminal, load test-only accounts and sample property data, then
start the Firebase-mode front end:

```powershell
npm run firebase:seed
npm run dev:firebase
```

If the normal local-storage app already occupies port 5173, use:

```powershell
npm run dev:firebase -- --port 5175
```

The Emulator UI is at `http://127.0.0.1:4000/`. The seeded sign-ins are:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@myproperty.test` | `DemoAdmin123!` |
| Caretaker | `caretaker@myproperty.test` | `DemoCare123!` |
| Viewing landlord | `landlord-view@myproperty.test` | `DemoView123!` |
| Full-access landlord | `landlord-full@myproperty.test` | `DemoFull123!` |

These credentials exist only in the local Auth emulator. Restarting the
emulators without an export removes them.

For the reconciled Version 1 migration preview, use these local-only accounts:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `preview-admin@myproperty.test` | `PreviewOnly123!` |
| Caretaker | `preview-caretaker@myproperty.test` | `PreviewCare123!` |
| Viewing landlord | `preview-landlord@myproperty.test` | `PreviewLand123!` |

Run the automated Security Rules and scheduled-reset integration checks while
the long-running emulators are stopped:

```powershell
npm run firebase:test
```

This command starts a clean demo emulator, runs the tests, and shuts it down.

## Current staging project

The isolated `myproperty-v2-staging` project now has an empty Firestore database
in `africa-south1`, the strict Version 2 security rules and indexes, and
Email/Password Authentication enabled. Cloud Functions are intentionally not
deployed while the project remains on the no-cost Spark plan.

`.env.staging.local` contains the public web-app configuration and is ignored by
Git. Use `npm run build:staging` to verify it. Do not deploy the staging hosting
target until the backend functions and acceptance data are ready.

When Cloud Functions deployment is approved later, create the first staging
administrator Auth account. Then create `users/{uid}` using that exact Auth uid:

```json
{
  "assignedPropertyIds": [],
  "disabled": false,
  "email": "admin@example.com",
  "landlordAccess": "full",
  "role": "admin",
  "username": "Property Admin"
}
```

Do not create this profile in the existing live project during emulator work.

## Staging before production

Keep staging separate from the live project. The next paid-plan checkpoint is
deploying the included Functions to staging. Until that is approved, exercise
the same Functions locally with `npm run firebase:test` or the emulator workflow
above.

Only after the staging totals, permissions, reports, backups, and scheduled
reset have been verified should the existing live project be considered. The
first production migration must write to the new `properties/{propertyId}` tree
without overwriting the old collections.

## Current intentional limits

- Local storage is still the normal development backend; Firebase mode defaults
  to the isolated local emulators.
- Staging Functions and Hosting are not deployed while staging remains on Spark.
- Firebase property clearing and backup restore are disabled until audited admin
  workflows are added.
- Creating Firebase Authentication users is disabled in the interface until the
  administrator-only server function is implemented.
- M-Pesa and KCB remain disconnected.
