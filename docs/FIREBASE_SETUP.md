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

Run the automated Security Rules and scheduled-reset integration checks while
the long-running emulators are stopped:

```powershell
npm run firebase:test
```

This command starts a clean demo emulator, runs the tests, and shuts it down.

## First staging administrator

In a future empty staging project, create the first administrator Auth account.
Then create `users/{uid}` using that exact Auth uid:

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

Create or select a Firebase staging project that contains no live landlord data.
Enable Email/Password Authentication and Firestore, then deploy the included
rules and Functions to staging. Confirm the Firestore location before deploying
the function region.

Only after the staging totals, permissions, reports, backups, and scheduled
reset have been verified should the existing live project be considered. The
first production migration must write to the new `properties/{propertyId}` tree
without overwriting the old collections.

## Current intentional limits

- Local storage is still the normal development backend.
- Firebase property clearing and backup restore are disabled until audited admin
  workflows are added.
- Creating Firebase Authentication users is disabled in the interface until the
  administrator-only server function is implemented.
- M-Pesa and KCB remain disconnected.
