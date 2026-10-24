# Hedgerow

A cosy pixel-countryside ledger for your **money**, **miles**, **spending** and **what you owe**.
Everything is keyed in by you, nothing connects to your bank, and **your data stays on your
phone**. Bramble the hedgehog keeps count with you.

Built with Expo (SDK 57, React Native 0.86) and Expo Router. On iPhone it runs as a Home Screen
web app served from GitHub Pages, and it works offline. No App Store, no Apple Developer
account and no server needed.

## What's inside

- **Home**: net worth on a wooden plank (with the change since the 1st), Bramble's daily note, four
  summary tiles, this month's budget trail and what's coming up (due dates, expiring miles).
- **Money**: your accounts as jars on a shelf (bank, investments, cash), a "count due" reminder for
  jars you haven't checked lately, and an **Update balances** walk-through.
- **Miles**: airline miles plus card and hotel points (converted at your own rate), expiry
  reminders, a trip goal with a little plane flying towards it, and a flight log.
- **Expenses**: spending pouches with monthly budgets, a daily allowance, month by month history,
  and search.
- **Liabilities**: credit cards, loans and money you owe people, with due dates, "Mark as paid",
  and loan progress.
- **New entry**: one keypad for expenses, balance counts, miles and payments/charges. Entries move
  the right balances, and editing or deleting an entry puts them back.
- **Settings**: day and night scenes, a privacy eye that hides amounts, rounded or all-pixel text,
  and **backups** of your data.

## Where your data lives

Everything is saved on the phone you use, in the app's own storage. Nothing is sent anywhere:
GitHub Pages only serves the app itself. That also means:

- **Export a backup now and then** (Settings → Your data → Export backup) and keep the file in
  iCloud Drive or Files. **Restore from a backup** brings it back, on the same phone or a new one.
- Removing Hedgerow from your Home Screen deletes its data with it.
- The Home Screen app and Safari keep separate storage. Always open Hedgerow from its icon.

---

## Put it on your iPhone

The repository deploys itself: every push to `main` builds the app with GitHub Actions and
publishes it to GitHub Pages.

1. On GitHub, open the repository → **Settings → Pages** and set **Source** to **GitHub Actions**
   (once).
2. Wait for the **Deploy to GitHub Pages** run under the **Actions** tab to finish (about 3 minutes).
3. On your iPhone, open `https://<your-username>.github.io/hedgerow/` in **Safari**.
4. Tap **Share → Add to Home Screen**, then open Hedgerow from its new icon.
5. Pick your currency and start fresh, or explore the sample farm first.

After the first open it works without an internet connection. When a new version is pushed, the
app picks it up the next time it's opened with a connection.

## Work on it on your computer

You need **Node.js 22 or 24** (22.13 or newer) from <https://nodejs.org>.

```sh
npm install
npx expo start
```

Press **w** to open it in your browser. Push to `main` and GitHub publishes the new version.

### Checks

```sh
npm test            # unit tests (money, dates, balance effects, totals, the entry form, backups)
npm run typecheck   # TypeScript
```

GitHub Actions runs both before every deploy.

### Android, or Expo Go

The same code runs as a native app. On Android you can use Expo Go, or build an APK you install
directly with `npm run build:apk` (EAS, free tier). In those, backups are shared as text and
restored by pasting the text into Settings.

## A quick tour

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
| Back up or restore | Settings → **Your data**. |

## How it works

- Amounts are stored as whole cents, so totals never drift.
- The whole farm (settings, accounts, programs, liabilities, pouches, entries and monthly
  snapshots) is one record in the app's storage (`src/data/store.ts`), saved after every change.
  An entry and the balances it moves are changed together, so they always stay in step.
- A backup is that record as a JSON file.
- The web build adds a service worker (`scripts/build-pages.mjs`) that stores the app's files, so it
  opens offline.

## Project map

```
src/app/          Screens (Expo Router): the five tabs, the entry keypad, editors, settings
src/ui/           The pixel UI kit: frames, planks, buttons, keypad, sheets, Bramble
src/scenes/       The illustrated headers and their animations
src/sprites/      Item and icon sprites
src/data/         The farm: storage, changes, backups, and the pure logic (totals, effects, entry form)
src/lib/          Money, dates, backup files, the shared animation clock
src/theme/        Day and night colours, fonts, preferences
tests/            Unit tests
scripts/          Pages build (base path, offline service worker) and Expo publishing helpers
.github/          The GitHub Pages workflow
public/           Web app shell, manifest and icons
```

## Troubleshooting

- **The page is a 404**: check Settings → Pages uses **GitHub Actions**, and that the latest run
  under Actions succeeded.
- **"Can't open the farm"**: the phone's storage couldn't be read. Tap **Try again**, or close and
  reopen the app. Nothing is deleted.
- **My data is gone after reinstalling**: the Home Screen app's storage goes with it. Restore your
  latest backup from Settings.

## History

The first commit in this repository is the earlier Firebase version (cloud sync with sign-in).

## Credits

Pixel art, the scenes and Bramble were drawn for Hedgerow. Fonts: [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans)
and [Zen Maru Gothic](https://fonts.google.com/specimen/Zen+Maru+Gothic), both under the SIL Open Font License.
