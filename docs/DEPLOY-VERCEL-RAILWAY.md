# Going live: Vercel + Railway + Supabase + mivanjari.com

| Part | Service | Address | Cost (approx., check when signing up) |
|---|---|---|---|
| Website (React) | Vercel | `https://mivanjari.com` | Free (Hobby) — see note on payments below |
| Backend (API + live chat) | Railway | `https://api.mivanjari.com` | Hobby plan **$5/month** (≈ ₹430), usage included |
| Database (PostgreSQL) | Supabase | — | Free (500 MB) |
| Photos | Cloudinary | — | Free |
| Login-code emails | Brevo | — | Free (300/day) |
| Domain | Namecheap | `mivanjari.com` | ~$10–15/year |

Why `api.mivanjari.com`: website and backend on the **same domain** keeps login working on every browser
(including iPhone Safari). Don't use the `vercel.app` / `railway.app` addresses for real users.

**Payments note:** Vercel's free Hobby plan is for non-commercial use. Once you take ₹501 payments, either upgrade
Vercel to Pro (~$20/month) or move the website to Cloudflare Pages (free, commercial use allowed) — ask and it can be switched.

The code is already prepared: `railway.json` (backend), `vercel.json` (website + security headers), Supabase
connection support (`DIRECT_URL`). Every `git push` redeploys both automatically.

Keep a Notepad file open and collect each value below. **Never send keys/passwords to anyone or commit them.**

---

## 1. Supabase — database

1. supabase.com → **Start your project** → sign in with GitHub.
2. **New project**: name `mi-vanjari`, a **strong database password** (save it), region **Southeast Asia (Singapore)**
   (same region as the backend = fast). Create and wait ~2 minutes.
3. Click **Connect** (top) → **ORMs** tab → **Prisma**. It shows two lines:
   - `DATABASE_URL="postgresql://…:6543/postgres?pgbouncer=true"` → copy as **DATABASE_URL**
   - `DIRECT_URL="postgresql://…:5432/postgres"` → copy as **DIRECT_URL**
   Replace `[YOUR-PASSWORD]` in both with the password from step 2.

The free plan pauses a database after a week without activity; the UptimeRobot check (step 8) prevents that.

## 2. Cloudinary — photos

cloudinary.com → sign up → Dashboard → **Product environment credentials** → copy **Cloud name**, **API key**, **API secret**.

## 3. Brevo — login-code emails

1. brevo.com → sign up (free).
2. **Senders, domains → Senders → Add a sender**: `Mi Vanjari`, `mivanjari1111@gmail.com` → click the link Brevo emails you.
3. **SMTP & API → API keys → Generate** → copy as **BREVO_API_KEY**.
(Step 9 upgrades this to `noreply@mivanjari.com` for better delivery.)

## 4. Two login security keys

In the project folder run this **twice** and copy each result (JWT_ACCESS_SECRET, JWT_REFRESH_SECRET):
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 5. Railway — backend

1. railway.com → sign in with GitHub → choose the **Hobby** plan.
2. **New Project → Deploy from GitHub repo → `chiragsankhe/mi-vanjari`**. Railway reads `railway.json`.
3. Open the service → **Settings**:
   - **Region**: Southeast Asia (Singapore).
   - **Networking → Generate Domain** (a test address like `mi-vanjari-production.up.railway.app`).
4. **Variables → Raw Editor**, paste and fill in:
   ```
   NODE_ENV=production
   DATABASE_URL=<from Supabase, port 6543>
   DIRECT_URL=<from Supabase, port 5432>
   JWT_ACCESS_SECRET=<key 1 from step 4>
   JWT_REFRESH_SECRET=<key 2 from step 4>
   COOKIE_SAMESITE=lax
   CORS_ORIGIN=https://mivanjari.com,https://www.mivanjari.com
   PUBLIC_API_URL=https://api.mivanjari.com
   ADMIN_EMAILS=mivanjari1111@gmail.com
   BREVO_API_KEY=<from Brevo>
   MAIL_FROM=Mi Vanjari <mivanjari1111@gmail.com>
   CLOUDINARY_CLOUD_NAME=<from Cloudinary>
   CLOUDINARY_API_KEY=<from Cloudinary>
   CLOUDINARY_API_SECRET=<from Cloudinary>
   TRUST_PROXY=1
   ```
   Save → Railway deploys. Before starting, it creates the database tables and adds the starter content
   (service categories, history, muhurat dates). No demo accounts.
5. Check: open `https://<your-test-address>.up.railway.app/api/v1/health` → `{"ok":true,"db":true,…}`.
   If the deploy fails, **Deployments → View logs**: the server lists exactly which setting is missing.
6. **Settings → Networking → Custom Domain** → `api.mivanjari.com`. Railway shows a **CNAME target**
   (e.g. `abc123.up.railway.app`) — copy it for step 7.

## 6. Vercel — website

1. vercel.com → sign up with GitHub (Hobby).
2. **Add New → Project → import `mi-vanjari`**. Leave **Root Directory** as the repository root and
   **Framework Preset** as "Other" — `vercel.json` already has the build settings. **Deploy**.
3. **Settings → Domains** → add `mivanjari.com` and `www.mivanjari.com` (choose "redirect www to mivanjari.com").
   Vercel shows the DNS records to add — copy them for step 7.

## 7. Namecheap — connect the domain

Namecheap → **Domain List → mivanjari.com → Manage → Advanced DNS**.
1. Delete the default parking records (the `CNAME www → parkingpage…` and `URL Redirect @`).
2. Add (use the exact values Vercel and Railway show you):

| Type | Host | Value |
|---|---|---|
| A Record | `@` | the IP Vercel shows (usually `76.76.21.21`) |
| CNAME | `www` | the value Vercel shows (usually `cname.vercel-dns.com.`) |
| CNAME | `api` | the CNAME target Railway showed in step 5.6 |
| TXT | (if Railway or Vercel asks for one) | the value they show |

3. Wait 10 minutes – a few hours. Vercel and Railway show ✔ and set up HTTPS automatically.

## 8. First checks + UptimeRobot

1. `https://api.mivanjari.com/api/v1/health` → `"ok":true`. The `"ip"` must be your own IP (search "what is my ip");
   if not, Railway → Variables → `TRUST_PROXY=2`.
2. `https://mivanjari.com` → **Join** → your email → code arrives (check Spam once, mark "Not spam") → create your profile.
3. Admin: `https://mivanjari.com/admin/login` → `mivanjari1111@gmail.com` → code → **create your admin password**.
4. Upload a profile photo; send a chat message between two accounts.
5. Admin → History: upload the history images/videos again (videos under 100 MB).
6. uptimerobot.com (free) → **New monitor** → HTTP(s) → `https://api.mivanjari.com/api/v1/health` → every 5 minutes.
   It emails you if the site goes down and keeps the Supabase database awake.

## 9. Better email delivery (recommended, free)

Brevo → **Senders, domains → Domains → Add a domain** → `mivanjari.com` → Brevo shows 3–4 DNS records →
add them in Namecheap Advanced DNS → **Authenticate**. Then Railway → Variables:
`MAIL_FROM=Mi Vanjari <noreply@mivanjari.com>` (add `noreply@mivanjari.com` as a sender in Brevo first).

## 10. Payments (before 1 December)

Razorpay → KYC → **API keys** → copy Key ID + Secret. **Webhooks → Add**: URL
`https://api.mivanjari.com/api/v1/payments/webhook`, a secret you choose, events `payment.captured`,
`payment.failed`, `refund.processed`. Railway → Variables: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`. (Remember the Vercel payments note at the top.)

---

## Later

- **Update the site:** `git add . && git commit -m "…" && git push` → Vercel and Railway redeploy (~3–5 min).
  Database changes are applied automatically before the new backend starts.
- **Never** run `npm run db:seed` / `db:setup` against Supabase — they wipe data (the seed refuses in production).
- **Backups:** Supabase free keeps daily backups for a short time only. Monthly:
  `pg_dump "<DIRECT_URL>" --no-owner -Fc -f mivanjari-backup.dump` and keep the file safe.
- If the API address ever changes, update `connect-src` in `vercel.json` and the two `VITE_…` defaults in its `buildCommand`.
