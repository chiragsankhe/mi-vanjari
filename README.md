# मी वंजारी · Mi Vanjari

> **आपली माणसं, आपलं जग** — *Our people, our world.*
>
> Made by **Chirag Sankhe**.

Mi Vanjari is a community site I have made for our community, where people can find a partner for themselves — and connect with the samaj, its businesses and wedding services.

A community platform for the Vanjari community of Palghar district, Maharashtra. It connects members who now live across cities, states and countries, and brings matrimony, wedding services, a business directory, achievers, astrology tools and our shared history into one trusted, privacy-first place.

| | |
|---|---|
| **Frontend** | React 18, Vite 6, Tailwind CSS v4, Motion (animations), TanStack Query, Zustand, React Router 6, React Hook Form + Zod, Socket.io client |
| **Backend** | Node.js (ESM), Express 4, Prisma 6, PostgreSQL, Socket.io, Zod, JWT, sharp, Multer, Helmet, rate limiting, Pino |
| **Integrations** | Brevo or Gmail (email login codes), Cloudinary (images), Razorpay (payments), optional MSG91 SMS. Without them, development shows codes on screen and uses local disk |

---

## Going live

- **Chosen setup (₹0/month):** [docs/DEPLOY.md](docs/DEPLOY.md) — one Render service in Singapore (website + API + chat) at `mivanjari.com`, Supabase database, Cloudinary photos, Brevo email login codes, UptimeRobot.
- Alternative (paid backend): [docs/DEPLOY-VERCEL-RAILWAY.md](docs/DEPLOY-VERCEL-RAILWAY.md).

## Quick start

**Requirements:** Node 20+ and PostgreSQL 14+.

```bash
npm install                       # installs both workspaces
```

1. **Configure the API:** edit `backend/.env` (copy it from `backend/.env.example`) and set your database name and password:
   ```
   DB_NAME=mivanjari
   DB_PASSWORD=<your postgres password>
   ```
   `DB_USER`, `DB_HOST` and `DB_PORT` are optional (default `postgres`, `localhost`, `5432`). The backend builds Prisma's `DATABASE_URL` from these fields (`src/config/load-env.js`). If you set `DATABASE_URL` directly, as most hosting providers do, it overrides them.
2. **Create the database, tables and demo data:**
   ```bash
   npm run db:setup
   ```
   This creates the `mivanjari` database if it is missing, applies the migrations in `backend/prisma/migrations`, and seeds the demo data.
3. **Run both servers:**
   ```bash
   npm run dev
   ```
   - Web: http://localhost:5173
   - API: http://localhost:4000/api/v1 (Vite proxies `/api`, `/uploads` and `/socket.io` to it, so cookies and websockets work without CORS setup)

### Demo logins (development)
Members log in with a 6-digit code sent to their **email** (free, via Brevo or Gmail). Without email configured, development prints the code in the API log **and** shows it in the login dialog. In development only, you can also type one of the demo mobile numbers below into the login box.

| Mobile | Who |
|---|---|
| 98765 00001 | Aditya Chavan: member with a groom profile, a chat, follow requests and a pending service |
| 98765 00002 to 00011 | Other members (public and private profiles) |
| 99999 99999 | Admin (see `ADMIN_PHONES` in `.env`) |

---

## Project structure

```
mi vanjari/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # ← the whole data model, documented by section
│   │   ├── migrations/            # versioned SQL migrations
│   │   └── seed.js                # demo data — wipes the DB first (dev only)
│   ├── scripts/create-db.js       # creates the DB named in DATABASE_URL
│   └── src/
│       ├── server.js              # HTTP + Socket.io bootstrap, graceful shutdown
│       ├── app.js                 # Express app (security, CORS, logging, static uploads)
│       ├── routes.js              # ← API route map: mount new modules here
│       ├── config/env.js          # every env var, validated with Zod
│       ├── lib/                   # prisma, jwt, logger, storage (sharp + Cloudinary/local)
│       ├── middleware/            # auth, privacy gate, validate, rate limits, upload, errors
│       ├── services/              # otp, notifications, privacy rules, astrology engine
│       ├── sockets/               # real-time chat, typing, read receipts, presence
│       └── modules/<feature>/     # one folder per feature: routes (+ service, schema)
│           auth · users · matrimonial · follow · chat · notifications · services
│           business · achievers · astrology · history · community · admin
└── frontend/
    └── src/
        ├── App.jsx                # routes, guards, error boundary, page transitions
        ├── index.css              # design tokens (@theme) + component classes
        ├── i18n/                  # Marathi + English strings, useT()
        ├── lib/                   # axios (auto refresh), socket, query client, utils
        ├── store/                 # Zustand: auth session, UI (language, login dialog)
        ├── hooks/                 # infinite lists, realtime, screenshot guard, debounce
        ├── components/            # ui kit, layout, auth dialog, profile, shared listings
        └── pages/                 # one folder per feature (lazy-loaded)
```

### Making changes
- **Add a database field:** edit `backend/prisma/schema.prisma`, then run `npm run db:migrate`. This creates a migration and updates the client.
- **Add an API feature:** create `backend/src/modules/<name>/<name>.routes.js`, then mount it in `src/routes.js`. Validate input with `validate({ body: zodSchema })`.
- **Add a page:** create `frontend/src/pages/...`, then add a lazy route in `App.jsx`.
- **Change colours or fonts:** edit the `@theme` block in `frontend/src/index.css`. Every component uses these tokens.
- **Add a translation:** add the key to both `en` and `mr` in `frontend/src/i18n/strings.js`.
- **Browse or edit data:** run `npm run db:studio` (Prisma Studio).

---

## Features

**From the brief and the Figma design:**
- Phone OTP login (MSG91), JWT access tokens plus rotating httpOnly refresh cookies, and 5 OTP requests per phone per hour.
- 3-step onboarding: about you, then location and work, then family and preferences.
- Matrimonial browsing with filters, search and infinite scroll.
- **Privacy rules, enforced on the server:**
  - Private profiles show only first name, age range, city, gotra and a **blurred photo** until the owner accepts a follow request.
  - Real photo URLs are never sent to members who aren't allowed to see them.
  - Phone numbers are masked everywhere and revealed only to accepted followers, and only if the owner opts in.
- Follow system: request, accept, decline, cancel, unfollow, remove follower and block. Public accounts accept follows automatically, like Instagram.
- **Real-time chat** (Socket.io):
  - Allowed only after an accepted follow.
  - Typing indicator, read receipts (✓✓), online presence, optimistic sending and a REST fallback.
- **Screenshot deterrence** on chat and profiles: blur on PrintScreen or tab switch, copy and right-click blocked, and a viewer-name watermark on photos. No website can fully block screenshots, so these measures discourage rather than prevent.
- Wedding services: categories, provider pages, reviews and ratings, combo packages, and member listings that go live after admin approval.
- Business directory: categories, search, location filter, and add or edit your own listing.
- Achievers: academic and professional, with nominations verified by an admin.
- Community history timeline, managed by admins. Each entry can have an image and a video (upload in Admin → History).
- **"आपली गाथा" history film**: a 2-minute animated film of the Palghar Vanjari story (Mewar → caravans → Moradi port → 1853 railway → 24 villages → today). It is drawn live in Warli style with a generated raag Bhupali score, and viewers can download it as MP4/WebM.
  - Captions are in `frontend/src/components/history/film/scenes.js`.
  - Timeline text is in `backend/prisma/history-data.js`; apply it with `npm run db:history -w backend`, which replaces only the original placeholder entries.
  - AI image and video prompts plus a narration script are in `docs/history-ai-prompts.md`.
- Rashi calculator, Kundali (Guna Milan) matching and a Muhurat calendar.
- Notifications (live and stored) and unread badges.
- Marathi / English switch.
- Mobile bottom navigation and a fully responsive layout.
- **Admin panel** at **`/admin/login`** (e.g. http://localhost:5173/admin/login):
  - **Sign-in:** a 6-digit code **emailed** to the admin address **plus** an admin password. The admin creates the password on their first admin login. Admin sessions last 12 hours, and each sign-in sends a security-alert email.
  - **Admin emails** are listed in `ADMIN_EMAILS` in `backend/.env` (currently `mivanjari1111@gmail.com`). Email is sent through Gmail: `SMTP_USER` is the address, `SMTP_PASS` is a Gmail **App Password**. Admins can give moderators an admin-login email in Admin → Members.
  - **Members:** search and filter; view details; verify; ban; change role; grant or revoke membership; reset an admin's password; **delete any account**.
  - **₹ Payments:** every transaction, revenue totals, filters, CSV export and refunds.
  - **Settings:** fee, validity and start date.
  - **🛡 Security:** blocked attempts, admin logins and a full audit log of admin actions.
  - Members who open `/admin` see a warning, and the attempt is logged.
  - Admin numbers are set in `ADMIN_PHONES` in `backend/.env`.
- **Matrimony membership: ₹501 per year, from 1 December 2026.** The fee, validity and start date can be changed in Admin → Settings.
  - **Locked without membership:** browsing matches, family contacts, partner preferences, Kundali match, shortlist and "who viewed me". Unpaid members are also not listed in search.
  - **Paying early:** the year starts on the start date, so no free days are lost.
  - **Payments** go through **Razorpay**:
    - The server sets the amount.
    - The checkout signature is verified with HMAC, and the payment is re-checked with Razorpay.
    - A signed webhook confirms payments if the member closes the browser early.
    - Duplicate or replayed payments are ignored.
  - **Without Razorpay keys:** development shows a clearly-labelled test checkout, and production refuses payments.

**Additions beyond the documents (and why):**

| Addition | Why |
|---|---|
| **Built-in astronomical engine** for Rashi/Nakshatra (Meeus lunar theory + Lahiri ayanamsa) and full **Ashtakoota 36-guna** matching | It needs no paid or unstable third-party API. It calculates the Moon sign (*Chandra Rashi*), which Marathi panchang uses, not a sun-sign lookup. It matches the reference example in Meeus's book exactly. |
| **Match %** on profiles (your partner preferences + Guna score) | Matches the design's "92% match" badges with a real calculation |
| **Kundali match with any profile** in one click (from saved birth details) | Families ask about this first |
| **Shortlist (♥)** and **"Who viewed me"** | Shown in the design ("Saved profiles", "Profile views") |
| **Community updates** feed: posts with photo, likes and report | The design's "Create a post / My posts" |
| **Member directory** search (by name, city, native village, profession) | Helps people find family friends from home, not only for marriage |
| **Report and Block** on profiles, posts and listings, plus a moderation queue | Essential for safety on a matrimonial platform |
| **Server-side photo processing**: EXIF/GPS removed, resized, and a blurred copy made | Privacy, and it keeps real photos away from locked viewers |
| **Profile-completion meter**, **"Show my phone" toggle**, **hide profile**, **log out of all devices**, **delete account** | Members control their own data |
| **Refresh-token reuse detection** (with a short grace period for multiple tabs) | Protects against stolen sessions |
| **Matrimonial opt-in** (`isMatrimonial`) | Not every member is looking for marriage; this keeps them out of matrimonial search |
| **Admin moderators** role | Lets you hand off moderation without full admin rights |

---

## Production notes
- Follow [docs/DEPLOY.md](docs/DEPLOY.md). The backend serves the built website itself (`npm run build`), so site, API and chat share one address — no CORS or cross-site cookie setup.
- In production the server refuses to start without email (`BREVO_API_KEY` or SMTP) and Cloudinary, or with `ADMIN_PHONES` set.
- Deploys run `npm run db:deploy` (tables) and `npm run db:starter` (categories, history, muhurat; never deletes data). Never run the seed on the live database.
- The seeded muhurat dates are **indicative**. Check them against a trusted panchang every year (Admin → Muhurat).
- Replace the placeholder contact details in `frontend/src/pages/misc/Info.jsx`.
