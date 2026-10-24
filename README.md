# Hedgerow

A cosy pixel-countryside ledger for your **money**, **miles**, **spending** and **what you owe**.
Everything is keyed in by you, nothing connects to your bank, and your data lives in your own
Firebase project. Bramble the hedgehog keeps count with you.

Built with Expo (SDK 57, React Native 0.86), Expo Router and the Firebase JS SDK, so it runs on
Android, iPhone and the web from one codebase, and works in **Expo Go**.

## What's inside

- **Home**: net worth on a wooden plank (with the change since the 1st), Bramble's daily note, four
  summary tiles, this month's budget trail and what's coming up (due dates, expiring miles).
- **Money**: your accounts as jars on a shelf (bank, investments, cash), a "count due" reminder for
  jars you haven't checked lately, and an **Update balances** walk-through.
- **Miles**: airline miles plus card and hotel points (converted at your own rate), expiry
  reminders, a trip goal with a little plane flying towards it, and a flight log. Log earned,
  redeemed or transferred points.
- **Expenses**: spending pouches with monthly budgets, a daily allowance, month by month history,
  and search.
- **Liabilities**: credit cards, loans and money you owe people, with due dates, "Mark as paid",
  and loan progress (payments made, end date).
- **New entry**: one keypad for expenses, balance counts, miles and payments/charges. Entries move
  the right balances (an expense from an account lowers it, on a card raises what you owe, a card
  payment lowers both). Edit or delete an entry and the balances follow.
- Day and **night** scenes (automatic at 7pm, or pick), a **privacy eye** that hides amounts,
  rounded or all-pixel text, and an animations switch (it also follows "Reduce motion").

---

## 1. Before you start

- **Node.js 22 or 24** (22.13 or newer): <https://nodejs.org>
- A free **Firebase** account (your Google account): <https://console.firebase.google.com>
- A free **Expo** account for Expo Go, updates and Android builds: <https://expo.dev/signup>

## 2. Install

```sh
cd hedgerow
npm install
npx expo install --fix
```

The second command lines every Expo package up with the exact versions SDK 57 expects.

## 3. Set up Firebase (about 10 minutes)

1. In the [Firebase console](https://console.firebase.google.com) choose **Create a project**.
   Google Analytics is not needed.
2. **Build → Authentication → Get started → Sign-in method**: turn on **Email/Password** and
   **Anonymous** (Anonymous powers "Try it without an account").
3. **Build → Firestore Database → Create database**: pick the **Standard** edition if asked,
   **production mode**, and a location near you (for Singapore: `asia-southeast1`).
4. Still in Firestore, open the **Rules** tab, replace everything with the contents of
   [`firestore.rules`](firestore.rules) and press **Publish**. These rules let each signed-in person
   read and write only their own farm.
5. **Project settings (gear icon) → General → Your apps → Web `</>`**: register an app called
   Hedgerow (no hosting tick needed), then copy the values from `firebaseConfig` into
   [`src/config/firebase.ts`](src/config/firebase.ts).
6. Optional, for deploying from the command line: put your project id in `.firebaserc`.

The free Spark plan is plenty for personal use.

> The web config is not a secret: it only says which Firebase project to talk to. The security
> rules are what keep your data private.

## 4. Run it on your computer

```sh
npx expo start
```

- Press **w** to open it in your browser.
- Or scan the QR code with **Expo Go** on your phone (same Wi-Fi). On iPhone, sign in to Expo Go
  with the same Expo account the CLI uses (`npx expo login`, check with `npx expo whoami`).

The first time you sign in, Hedgerow asks for your currency and lets you either **start fresh**
(with ready-made spending pouches) or **explore the sample farm** from the design.

## 5. Put it on your iPhone (no Apple Developer account needed)

### Option A: install it as a Home Screen web app (recommended)

This works for you and anyone you share the link with, and needs no Expo account.

```sh
npm install -g firebase-tools
firebase login
firebase use --add          # pick your Firebase project
npm run deploy:web
```

Open `https://YOUR-PROJECT-ID.web.app` in **Safari** → **Share** → **Add to Home Screen**. It opens
full screen with its own Bramble icon. Run `npm run deploy:web` again whenever you change something.

### Option B: Expo Go

```sh
npx eas-cli login
npx eas-cli init            # creates the project on expo.dev and links it
npm run publish:go
```

If `eas init` says it can't write to the config, copy the project id it prints into `app.json` under
`expo.extra.eas.projectId`.

Then install **Expo Go** from the App Store, sign in with the same Expo account, open your project
on [expo.dev](https://expo.dev) → **Updates** → the newest update → **Preview**, and scan the QR code
with the iPhone camera. Only your Expo account (and members of your Expo organisation) can open it.
To publish changes later, run `npm run publish:go` again, optionally with a message:
`npm run publish:go -- "New pouch icons"`.

> **About SDK versions.** Hedgerow uses Expo SDK 57, the current stable SDK and the one the App
> Store and Play Store versions of Expo Go run. SDK 58 has been in beta since 15 September 2026;
> Expo says the store versions of Expo Go move to SDK 58 shortly after its stable release, with
> some time to upgrade before they drop SDK 57. When Expo Go asks for the newer SDK, upgrade with
> `npx expo install expo@^58.0.0 --fix`, check the app with `npx expo start`, then
> `npm run publish:go`. The web app (Option A) and an installed APK are not affected.

## 6. Android

- **Expo Go** from the Play Store works the same way as Option B above.
- Or build a real app you can install directly (no Play Store account):

  ```sh
  npm run build:apk
  ```

  EAS builds it in the cloud (free tier) and gives you a link; open it on your phone and install
  the APK. Send later changes to it with `npm run publish:apk`.

## 7. A quick tour

| To do this | Go here |
| --- | --- |
| Log spending | The green **+** on Home or Expenses. Pick a pouch, where it was paid from, key in the amount. |
| Recount your accounts | Money → **Update balances**, or tap an account → **Update balance**. |
| Add an account, program or liability | The small **+** at the top of Money, Miles or Liabilities. |
| Earn, redeem or transfer miles | The green **+** on Miles. "Transfer in" converts points at the source program's rate. |
| Pay a card or loan | Liabilities → **Mark as paid** (pays what's due and moves the due date on), or **Log a payment** for any amount. |
| Set budgets | Expenses → **Edit budgets**. Leave a pouch empty to track it without a limit. |
| Set a miles goal | Miles → **Set a goal**, or tap the goal card. |
| Edit or delete anything you keyed in | Tap it in any list. Deleting puts balances back. |
| Hide amounts | The eye on Home (also in Settings). |
| Look and feel, currency, sign out | The gear on Home. |

## 8. How your data is stored

Each person's farm lives under `users/{uid}` in Firestore, readable and writable only by them:

| Path | What |
| --- | --- |
| `users/{uid}` | Settings: currency, recount reminder, miles goal |
| `…/accounts` | Money you have (balance, type, last counted) |
| `…/programs` | Miles and points programs (balance, points-per-mile rate, expiry) |
| `…/liabilities` | Cards, loans, IOUs (owed, due date, instalment, payments made) |
| `…/categories` | Spending pouches and their monthly budgets |
| `…/entries` | Everything you key in: expenses, balance counts, miles, payments and charges |
| `…/snapshots` | Net worth on the 1st of each month (for "since 1 Oct") |

Amounts are stored as whole cents, so totals never drift. Each entry and the balances it changes are
written in one batch, so they always stay in step. If you lose signal, new entries still show up
straight away and sync once you're back online, as long as the app stays open until then.

## 9. Project map

```
src/app/          Screens (Expo Router): the five tabs, the entry keypad, editors, settings
src/ui/           The pixel UI kit: frames, planks, buttons, keypad, sheets, Bramble
src/scenes/       The illustrated headers, converted from the approved design, and their animations
src/sprites/      Item and icon sprites
src/data/         Firebase (auth, live data, writes) and the pure logic (totals, effects, the entry form)
src/lib/          Money, dates, the shared animation clock, Firebase setup
src/theme/        Day and night colours, fonts, preferences
tests/            Unit tests for the money maths, dates, balance effects and summaries
public/           Web app shell, manifest and icons
```

## 10. Checks

```sh
npm test            # unit tests (money, dates, balance effects, totals, the entry form)
npm run typecheck   # TypeScript
```

## 11. Troubleshooting

- **"Almost there!" screen**: `src/config/firebase.ts` still has the placeholder values.
- **"Firestore refused access (permission-denied)"**: publish the rules from step 3.4.
- **"Firestore is not ready yet"**: create the Firestore database (step 3.3).
- **"This sign-in method is switched off"**: enable Email/Password and Anonymous (step 3.2).
- **Expo Go says the project is incompatible**: see the SDK note under Option B.
- **The first launch in Expo Go takes a moment**: the rounded font also covers Japanese, so it is a
  few megabytes. It downloads once.
- **Guest farms**: "Try it without an account" works straight away, but save it to an email in
  Settings before signing out, or it can't be opened again.

## Credits

Pixel art, the scenes and Bramble were drawn for Hedgerow. Fonts: [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans)
and [Zen Maru Gothic](https://fonts.google.com/specimen/Zen+Maru+Gothic), both under the SIL Open Font License.
