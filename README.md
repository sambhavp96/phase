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
3. Sign-up confirmation and password reset use one-time codes instead of links. In **Authentication → Emails**, make both templates show the code:

   **Confirm signup**

   ```html
   <h2>Welcome to Phase</h2>
   <p>Enter this code in the app to confirm your email:</p>
   <p style="font-size:28px;letter-spacing:4px"><strong>{{ .Token }}</strong></p>
   <p>If you didn't create an account, you can ignore this email.</p>
   ```

   **Reset password**

   ```html
   <h2>Reset your Phase password</h2>
   <p>Enter this code in the app:</p>
   <p style="font-size:28px;letter-spacing:4px"><strong>{{ .Token }}</strong></p>
   <p>If you didn't ask for this, you can ignore this email.</p>
   ```

### Going live

- **Email sender (required):** Supabase's built-in email only reaches members of your Supabase team and sends 2 per hour, so real users never get their codes. Add a provider in **Authentication → Emails → SMTP Settings** (Resend, Brevo, Postmark and others work), then turn on **Confirm email**.
- **Password length:** in **Authentication → Sign In / Providers**, set the minimum password length to 8 so the server enforces what the app asks for.
- **Staying awake:** free projects pause after about a week without activity. [`.github/workflows/keep-supabase-awake.yml`](.github/workflows/keep-supabase-awake.yml) reads the database every 3 days. Add the `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` repository secrets for it to work. GitHub turns off scheduled workflows in repositories with no commits for 60 days, so re-enable it in the Actions tab if that happens.

### Forcing an update

The app checks `public.app_versions` on launch and whenever it returns to the foreground. If the installed version (from `app.json`) is lower than `min_version` for its platform, only an "Update required" screen is shown. To force everyone onto a new release, in the SQL Editor:

```sql
update public.app_versions set min_version = '1.1.0' where platform in ('ios', 'android');
update public.app_versions set store_url = 'https://apps.apple.com/app/idYOUR_APP_ID' where platform = 'ios';
update public.app_versions set store_url = 'https://play.google.com/store/apps/details?id=YOUR.PACKAGE' where platform = 'android';
```

If the check can't run (no connection), the app is never blocked.

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
    forgot-password.tsx  Reset a password with an emailed code
    update-required.tsx  Shown when the installed version is too old
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
- Accounts can be deleted in the app (Menu → Delete account), which removes the sign-in and everything attached to it.

See [PRIVACY.md](PRIVACY.md) for the privacy policy.

## Roadmap before the first store release

- [x] Password reset
- [x] In-app account deletion
- [x] Forced-update check
- [ ] Over-the-air updates (EAS Update, set up with the first EAS build)
- [x] Privacy policy (fill in contact email and data region)
- [ ] Production Supabase setup: email sender (SMTP), confirmation on, keep-awake secrets
- [ ] App icon, splash screen and store assets
- [ ] TestFlight and Google Play closed testing
