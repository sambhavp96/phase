# Phase

A private period tracker for one person and, optionally, one partner. Phase predicts the next period from logged history, shows the likely cycle phase, and keeps both partners' phones in sync in real time.

Built with React Native and Expo for Android and iOS.

## Features

- **Home:** next expected period with a likely window, or the current period day; the estimated cycle phase; this month's calendar; average cycle and period length; the previous period.
- **Calendar:** browse any month and year, with phase icons, logged and expected periods, and the fertile window. Tap a past day to log a period or edit one.
- **Previous periods:** every logged period with its length, cycle length and who logged it.
- **Partner sharing:** connect with one partner using a single-use invite code. Changes appear on both phones immediately.
- **Privacy controls:** the person whose cycle is tracked can disconnect their partner or delete all data at any time.

## How predictions work

- The next period is the latest start date plus the average of the last six cycle lengths. Gaps that look like a missed log (far longer than usual) are ignored.
- The likely window is the prediction plus or minus the typical variation between cycles (2 to 7 days).
- Phases use the calendar method: ovulation is estimated 14 days before the next period, and the fertile window is the 5 days before ovulation plus the day after.

Predictions and phases are estimates. They are not medical advice and must not be used as contraception.

## Tech stack

| Area | Choice |
| --- | --- |
| App | React Native, Expo SDK 58, Expo Router, TypeScript |
| Backend | Supabase (Postgres, Auth, Realtime) |
| UI | Jost (Google Fonts), Lucide icons |
| Tests | Jest (`jest-expo`), React Native Testing Library, PGlite for database tests |
| Builds | EAS Build and EAS Submit (no Mac needed for iOS) |

## Getting started

### Prerequisites

- Node.js (LTS)
- A free [Supabase](https://supabase.com) project
- The **Expo Go** app on your phone, or the Android emulator from Android Studio

### 1. Install

```bash
git clone https://github.com/sambhavp96/phase.git
cd phase
npm install
```

### 2. Set up the database

1. In Supabase, open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql). It is safe to run again; it never deletes current data.
2. For local development, go to **Authentication → Sign In / Providers → Email** and turn off **Confirm email** so test accounts work without email links. Turn it back on (with a custom SMTP provider) before release.

### 3. Add your keys

Create `.env.local` in the project root (it is git-ignored):

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Both values are under **Connect** (or **Project Settings → API keys**) in Supabase.

### 4. Run

```bash
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS). If your phone is on a different network, use `npx expo start --tunnel`.

To test syncing on one phone: create an account on your phone, then a second account on the Android emulator, and join with the invite code.

## Testing

Run everything before every release:

```bash
npm run check
```

This runs, in order, and stops at the first failure:

| Command | What it checks |
| --- | --- |
| `npm run typecheck` | TypeScript across the project |
| `npm test` | Date maths, predictions, phase placement, calendar grid, UI components |
| `npm run test:db` | Database security rules from `schema.sql`, against an in-memory Postgres |

## Project structure

```
src/
  app/            Screens (Expo Router: each file is a route)
    index.tsx       Home
    calendar.tsx    Month and year browser with phases
    history.tsx     Previous periods
    log.tsx         Log or edit a period
    menu.tsx        Menu
    settings.tsx    Partner and sharing
    onboarding.tsx  Start tracking or join a partner
    sign-in.tsx     Sign in and sign up
  components/     Shared UI (text styles, buttons, month grid, phase icons)
  constants/      Colours, fonts, spacing
  lib/            Dates, predictions, phases, Supabase client, data provider
supabase/
  schema.sql      Tables, row-level security and server functions
  tests/          Database security tests
```

## Security model

- Anyone can create an account. A **couple** holds one tracked person's data and at most one partner.
- Partners connect with an 8-character, single-use invite code that expires after 7 days.
- Postgres row-level security makes every couple's data invisible to all other accounts. Membership changes only go through server functions (create, join, new code, remove partner, leave).
- If the tracked person leaves or deletes their account, their cycle data is deleted. If the partner leaves, the data stays with the tracked person.

## Roadmap before the first store release

- [ ] Password reset
- [ ] In-app account deletion
- [ ] Forced-update check and over-the-air updates (EAS Update)
- [ ] Privacy policy
- [ ] Production Supabase setup (custom SMTP, email confirmation)
- [ ] App icon, splash screen and store assets
- [ ] TestFlight and Google Play closed testing
