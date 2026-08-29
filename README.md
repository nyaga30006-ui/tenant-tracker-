# MyProperty TypeScript rebuild

This folder contains the modular replacement for the original single-file app.

## Required runtime

Firebase Functions and the project Firebase commands are pinned to Node.js 22
through `.node-version` and the package engine setting. On this Windows setup,
the verified portable Node 22 runtime is stored in the ignored `.tools` folder;
`scripts/firebase-cli.mjs` selects it automatically without replacing the
computer's global Node installation.

## Start the app

1. Open this folder in VS Code.
2. Open the integrated terminal (`Terminal` > `New Terminal`).
3. Run `npm run dev`.
4. Open the local address printed in the terminal.

## Folder guide

- `src/app` - application shell, navigation, and the selected property.
- `src/components` - reusable visual building blocks.
- `src/features` - one folder for each business feature.
- `src/hooks` - simple access to rooms, payments, and properties.
- `src/repositories` - the storage layer that can later be swapped to Firebase.
- `src/store` - shared application data and update actions.
- `src/types` - shared TypeScript data definitions.
- `src/data` - starter data for the local test version.
- `src/styles` - shared visual styles.
- `functions` - scheduled billing-reset code plus inactive M-Pesa and KCB integration scaffolding.

## Current local backend

The app currently saves test data in this browser's local storage. Rooms,
payments, maintenance records, and electricity records are stored separately for
each property. The property portfolio, selected property, and user accounts are
also restored after a refresh.

Water is an optional feature for each property. A seller property registers
physical water meters and calculates monthly bills from meter readings. A buyer
property tracks purchased-water bills and supplier payments. Its files live in
`src/features/water` and its storage access is isolated in `src/hooks/useWater.ts`.

Adding a property also provisions the selected number of editable vacant rooms.
For example, a 40-room property starts with `Room 01` through `Room 40`. Local
landlord and caretaker profiles use `assignedPropertyIds`, so each account can
be limited to one property or assigned to several properties.

Settings can download a JSON backup, restore a backup into the selected property,
edit property details, or clear that property's operational data after confirmation.

Local storage remains the default and cannot read or change the live app's
data. The first Firebase integration layer is now present behind
`VITE_DATA_BACKEND=firebase`: email/password authentication, property-scoped
repositories, Firestore Security Rules, emulator configuration, and the
scheduled monthly reset function. Localhost blocks live Firebase access unless
an administrator deliberately enables it.

The Firebase mode must be tested against the Emulator Suite and a separate
staging project before it is pointed at the existing live project. M-Pesa and
KCB clients remain inactive sandbox scaffolding.

For safe local Firebase testing, use `npm run firebase:emulators`, seed the
demo-only records with `npm run firebase:seed`, and start the front end with
`npm run dev:firebase`. Run `npm run firebase:test` for Firestore role-isolation,
payment-reference, property-isolation, and scheduled-reset integration tests.

See `docs/FIREBASE_MIGRATION.md` for the storage contract and the planned
property-scoped Firestore structure. Feature screens use hooks and the shared
data-provider contract rather than reading browser storage directly.

See `docs/FIREBASE_SETUP.md` for the safe setup and verification sequence.
