# Putting Mi Vanjari online — the chosen setup (₹0 / month)

**https://mivanjari.com** → one **Render** service (Singapore) runs the website, the API and live chat together.
Database **Supabase** (Singapore) · photos **Cloudinary** · login-code emails **Brevo** · **UptimeRobot** keeps it awake.
Domain bought at **Hostinger**. Monthly cost **₹0**; Razorpay only takes ~2% when someone pays.

| Service | Used for | Free limit (approx.) |
|---|---|---|
| GitHub (`chiragsankhe/mi-vanjari`) | the code; Render deploys from it | free |
| Render (free web service, Singapore) | website + API + chat | 750 h/month = one site all month · 0.1 CPU · 512 MB |
| Supabase (Singapore) | database | 500 MB |
| Cloudinary | photos & videos | 25 credits/month (~25 GB), videos up to 100 MB |
| Brevo | login-code emails | 300 emails/day |
| UptimeRobot | keeps the site awake, alerts you | free |

**Want more speed later?** Render dashboard → the service → **Upgrade to Starter** (~$7/month): 5× CPU, never sleeps.
Same code, same address, nothing to move.

Collect every value in one Notepad file. **Never send keys or passwords to anyone, never commit them.**

---

## 1. Supabase — database ✅ (done)

Project `mi-vanjari`, Singapore, **Data API off**. From **Connect → ORMs → Prisma** you have:
- `DATABASE_URL` — the port **6543** line ending in `?pgbouncer=true`
- `DIRECT_URL` — the port **5432** line
with your database password in place of `[YOUR-PASSWORD]` in both.

## 2. Cloudinary — photos ✅ (cloud name `dcmyvkpl5`)

Settings → **API Keys** → copy the **API Key** and **API Secret**.

## 3. Brevo — login-code emails

1. brevo.com → sign up (free). Website: `https://mivanjari.com`.
2. **Senders, domains & dedicated IPs → Senders → Add a sender**: `Mi Vanjari`, `mivanjari1111@gmail.com` →
   click the confirmation link in that Gmail.
3. **SMTP & API → API keys → Generate a new API key** → copy it (shown once). This is `BREVO_API_KEY`.

## 4. Render — put the site online

1. render.com → **Sign up with GitHub** → allow access to `mi-vanjari`.
2. **New + → Blueprint** → choose `chiragsankhe/mi-vanjari` → Render reads `render.yaml`.
3. Fill in what it asks for:
   | Setting | Value |
   |---|---|
   | `DATABASE_URL` | Supabase port 6543 line (with password) |
   | `DIRECT_URL` | Supabase port 5432 line (with password) |
   | `BREVO_API_KEY` | from step 3 |
   | `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from step 2 |
   | `RAZORPAY_…` (3) | leave empty for now |
   Paste values **without** the surrounding quotes.
4. **Apply** → the first build takes ~5–10 minutes (installs, builds the website, creates the database tables,
   adds the starter content — categories, history, muhurat dates; no demo accounts).
5. When it shows **Live**, open the address at the top (`https://mi-vanjari….onrender.com`) — the site works.
   If it fails, **Logs** list exactly which setting is missing.

## 5. Connect mivanjari.com (Hostinger)

1. Render → your service → **Settings → Custom Domains → Add** `mivanjari.com`, then also `www.mivanjari.com`.
   Render shows the DNS records for each (an **A** record for `mivanjari.com`, a **CNAME** for `www`).
2. Hostinger → **Domains → mivanjari.com → DNS / Nameservers → DNS records**:
   - Delete any existing **A** record for `@` and any **CNAME** for `www` (Hostinger's parking defaults).
   - Add **A** · Name `@` · Points to: the IP Render shows · TTL default.
   - Add **CNAME** · Name `www` · Target: the value Render shows (e.g. `mi-vanjari.onrender.com`).
3. Back in Render press **Verify** next to each domain. Usually ready in 10–60 minutes; HTTPS 🔒 is automatic.

## 6. First checks

1. `https://mivanjari.com/api/v1/health` on your phone → `"ok":true,"db":true`.
   `"ip"` should be your phone's IP (search "what is my ip"); if not, Render → Environment → `TRUST_PROXY` = `2`.
2. `https://mivanjari.com` → **Join** → your email → the code arrives (check Spam once → "Not spam") → create your profile.
3. `https://mivanjari.com/admin/login` → `mivanjari1111@gmail.com` → emailed code → **create the admin password**
   (10+ characters, letters and numbers). Keep it safe.
4. Upload a photo; send a chat message between two accounts.
5. Admin → History: upload the history images/videos again (under 100 MB each).

## 7. UptimeRobot — keep it awake

uptimerobot.com → **New monitor** → **HTTP(s)** → URL `https://mivanjari.com/api/v1/health` → interval **5 minutes**.
Render's free plan sleeps after 15 idle minutes; this stops that, keeps the Supabase database active,
and emails you if the site ever goes down.

## 8. Better email delivery (recommended)

Brevo → **Senders, domains → Domains → Add a domain** → `mivanjari.com` → add the records it shows in
Hostinger DNS → **Authenticate**. Add sender `noreply@mivanjari.com`, then Render → Environment →
`MAIL_FROM` = `Mi Vanjari <noreply@mivanjari.com>`.

## 9. Payments (before 1 January 2027)

Razorpay → KYC (1–3 days) → **API keys** → Key ID + Secret. **Webhooks → Add**:
`https://mivanjari.com/api/v1/payments/webhook`, a secret you choose, events `payment.captured`, `payment.failed`,
`refund.processed`. Render → Environment → set the three `RAZORPAY_…` values.

---

## 10. "Continue with Google" and mobile-number login (optional)

The login window always offers **email code**. Two more options switch on by themselves once their keys exist in Render (Environment tab) — until then they are simply hidden.

**Google** (free)
1. console.cloud.google.com → create a project → *APIs & Services → OAuth consent screen* (External, app name "Mi Vanjari", your support email, publish).
2. *Credentials → Create credentials → OAuth client ID → Web application*. Under **Authorised JavaScript origins** add `https://mivanjari.com` (and `https://www.mivanjari.com`). No redirect URI is needed.
3. Copy the **Client ID** (ends in `.apps.googleusercontent.com`; it is not a secret) into Render as `GOOGLE_CLIENT_ID`.

**Mobile number (SMS OTP)** — MSG91, paid per SMS (about ₹0.2–0.25)
1. msg91.com → sign up → complete DLT registration for your business (required by Indian law for any SMS).
2. Create an **OTP template** and get it approved. Put the *Auth key* in Render as `MSG91_AUTH_KEY` and the template id as `MSG91_TEMPLATE_ID`.

## Later

- **Update the site:** `git add . && git commit -m "…" && git push` → Render rebuilds and redeploys (~5 min).
  Database changes are applied during the build.
- **Never** run `npm run db:seed` / `db:setup` against Supabase — they wipe data (the seed refuses in production).
- **Backups (monthly):** `pg_dump "<DIRECT_URL>" --no-owner -Fc -f mivanjari-backup.dump` → keep it safe.
- Free-plan limits: 300 login emails/day (members stay logged in 30 days), 500 MB database, small server.
  If pages or photo uploads feel slow as members grow → upgrade Render to Starter.

*Alternative setup (paid backend): [DEPLOY-VERCEL-RAILWAY.md](DEPLOY-VERCEL-RAILWAY.md) — Vercel + Railway.*
