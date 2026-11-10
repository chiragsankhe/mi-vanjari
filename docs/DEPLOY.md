# Putting Mi Vanjari online — free setup

One free **Render** service runs everything (website + API + live chat) at one address.
Around it: free **Neon** database, free **Brevo** email (login codes), free **Cloudinary** photos,
free **UptimeRobot** ping so the site never sleeps. Cost: **₹0 / month**. Razorpay only takes ~2% when someone pays.

| Service | Used for | Free limit (approx., check when you sign up) |
|---|---|---|
| GitHub | stores the code, Render deploys from it | free private repos |
| Render (web service, Singapore) | website + API + chat | 750 hours/month = one site all month |
| Neon (Postgres, Singapore) | database | 0.5 GB |
| Brevo | login-code emails | 300 emails/day |
| Cloudinary | photos & videos | ~25 GB storage+traffic / month, videos up to 100 MB |
| UptimeRobot | keeps the site awake | 50 monitors, every 5 min |

Do the steps in order. Keep every key/password private — paste them only into the Render dashboard.

---

## 1. GitHub — put the code online

1. Create an account at github.com and a **new private repository** named `mi-vanjari` (no README).
2. In the project folder (`D:\mi vanjari`):
   ```bash
   git init
   git add .
   git commit -m "Mi Vanjari"
   git branch -M main
   git remote add origin https://github.com/<your-username>/mi-vanjari.git
   git push -u origin main
   ```
   `backend/.env` (your passwords) is in `.gitignore` and is **not** uploaded. Check with `git status` before the first commit.

## 2. Neon — the database

1. Sign up at neon.tech → **Create project** → name `mi-vanjari`, region **Asia Pacific (Singapore)**, Postgres 16 or newer.
2. Dashboard → **Connect** → copy the connection string (starts with `postgresql://`, ends with `?sslmode=require`).
   Use the normal (not "pooled") string. This is your `DATABASE_URL`.

## 3. Brevo — login-code emails

1. Sign up at brevo.com (free plan).
2. **Senders, domains & dedicated IPs → Senders → Add a sender**: name `Mi Vanjari`, email `mivanjari1111@gmail.com`. Brevo emails a confirmation link — click it.
3. **SMTP & API → API keys → Generate a new API key** → copy it. This is your `BREVO_API_KEY`.

Tip: ask the first members to check their **Spam** folder once and mark the email "Not spam". A custom domain (step 9) improves delivery later.

## 4. Cloudinary — photos

1. Sign up at cloudinary.com (free).
2. Dashboard → **Product environment credentials**: copy **Cloud name**, **API key**, **API secret**.

## 5. Render — put the site online

1. Sign up at render.com with your GitHub account.
2. **New → Blueprint** → choose the `mi-vanjari` repository. Render reads `render.yaml`.
3. Fill in the values it asks for:
   - `DATABASE_URL` → from step 2
   - `BREVO_API_KEY` → from step 3
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` → from step 4
   - `RAZORPAY_*` → leave empty for now (step 8)
4. **Apply**. The first build takes ~5–8 minutes. It builds the website, creates the database tables and adds the
   starter content (wedding-service categories, history, muhurat dates). No demo accounts are created.
5. Your site is at `https://mi-vanjari.onrender.com` (or a similar name Render shows).

If the server stops with "Production setup incomplete", the log lists exactly which value is missing.

## 6. First checks

1. Open `https://<your-site>/api/v1/health` on your phone. `"ip"` must match your phone's IP
   (search "what is my ip"). If it shows a different address, Render → Environment → add `TRUST_PROXY` = `2` → save.
2. Open the site → **Login** → enter your email → the code arrives by email → create your profile.
3. Admin: open `https://<your-site>/admin/login` → `mivanjari1111@gmail.com` → code by email → create the admin password (10+ characters with letters and numbers). Keep it safe.
4. Upload a profile photo and check it appears (it is stored in Cloudinary).
5. Admin → History: upload the history images/videos again (they were only on your computer). Videos must be under 100 MB on Cloudinary's free plan.

## 7. UptimeRobot — keep the site awake

Render's free plan sleeps after 15 minutes without visitors (the next visitor waits ~1 minute, live chat drops).
1. Sign up at uptimerobot.com (free) → **New monitor** → type **HTTP(s)**.
2. URL: `https://<your-site>/api/v1/health`, interval **5 minutes** → Create.
It also emails you if the site ever goes down.

## 8. Razorpay — payments (before 1 December)

1. Sign up at razorpay.com, complete KYC (PAN, bank account).
2. **Account & Settings → API keys** → generate → copy Key ID and Key Secret.
3. **Webhooks → Add**: URL `https://<your-site>/api/v1/payments/webhook`, a secret of your choice,
   events `payment.captured`, `payment.failed`, `refund.processed`.
4. Render → Environment → set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` → save (it redeploys).
   Test with `rzp_test_` keys first, then switch to the live keys.

## 9. Optional — your own domain (~₹500–900/year)

Buy `mivanjari.in` (or similar) → Render service → **Settings → Custom domains → Add** → add the DNS records it shows
at your domain seller. HTTPS is automatic. Then, in Brevo, authenticate the domain and change `MAIL_FROM` to
`Mi Vanjari <noreply@mivanjari.in>` for better email delivery.

---

## Updating the site later

Change code → `git add . && git commit -m "…" && git push`. Render rebuilds and redeploys automatically (~5 min).
Database changes (migrations) are applied during the build. **Never** run `npm run db:seed` or `db:setup` against the
live database — they wipe it. (The seed refuses to run in production.)

## Backups (once a month)

Install PostgreSQL tools on your computer, then:
```bash
pg_dump "<DATABASE_URL from Neon>" --no-owner -Fc -f mivanjari-backup.dump
```
Keep the file somewhere safe (Google Drive). Photos are already safe in Cloudinary.

## What the free plan can't do

- One small server (512 MB memory). Fine for a few hundred members; upgrade Render to Starter (~$7/month) if it gets slow.
- Brevo: 300 emails a day — about 300 logins a day. Members stay logged in for 30 days, so this is plenty.
- If Neon's free 0.5 GB ever fills up (very unlikely: photos are not stored there), upgrade Neon.
