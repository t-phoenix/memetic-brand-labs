# Resend email setup — Narrative Engine

Narrative Engine sends **transactional email through [Resend](https://resend.com)**. The API key alone is not enough: you must verify a sending domain in the Resend dashboard before any email will deliver.

This guide covers Resend account setup, DNS, environment variables, admin configuration, testing, and troubleshooting.

> **Not Supabase Auth email.** Magic-link verification (unlock flow) uses **Supabase Auth**. Results delivery and internal admin notifications use **Resend**. Configure both separately.

---

## What Resend sends

| Email | Recipient | When | Config |
|-------|-----------|------|--------|
| **Results email** | End user (`contact_email` on the run) | Pipeline completes and user verified email during unlock | `email.results_enabled`, `email.results_from`, … |
| **Admin notification** | Internal ops list | Any **user** run completes (`run_source ≠ admin_test`) | `email.admin_notify_enabled`, `email.admin_notify_recipients` |

Both use the same Resend API key and the same **From** address (`email.results_from` or `RESULTS_EMAIL_FROM` env fallback).

Default From address:

```text
Memetic Brand Labs <results@memetic.adpr.work>
```

The domain in that address (`memetic.adpr.work`) **must be verified in Resend**.

---

## Prerequisites

- Access to DNS for `memetic.adpr.work` (or whichever domain you send from)
- Resend account ([sign up](https://resend.com/signup))
- `RESEND_API_KEY` in `narrative-engine-api/.env` (local) and Render (production)

---

## Step 1 — Create a Resend account and API key

1. Sign in at [resend.com](https://resend.com).
2. Open **API Keys** in the left sidebar.
3. Click **Create API Key**.
   - Name: e.g. `narrative-engine-prod` or `narrative-engine-local`
   - Permission: **Sending access** (full access is fine for a single-service key)
4. Copy the key immediately (`re_…`) — it is shown only once.
5. Add to environment:

**Local** (`narrative-engine-api/.env`):

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
RESULTS_EMAIL_FROM=Memetic Brand Labs <results@memetic.adpr.work>
```

**Production** (Render → `memetic-brand-labs` web service → **Environment**):

| Variable | Value |
|----------|-------|
| `RESEND_API_KEY` | `re_…` |
| `RESULTS_EMAIL_FROM` | `Memetic Brand Labs <results@memetic.adpr.work>` |

Restart the API after changing `.env` locally. Render redeploys automatically when you save env vars.

---

## Step 2 — Add and verify your sending domain

Until this step is complete, Resend will reject sends even with a valid API key.

1. In Resend, go to **Domains** → **Add Domain**.
2. Enter: `memetic.adpr.work` (use your real sending domain if different).
3. Resend shows DNS records to add. Typical set:

| Type | Name / Host | Purpose |
|------|-------------|---------|
| **TXT** | `@` or root | SPF — authorizes Resend to send |
| **CNAME** | `resend._domainkey` (or similar) | DKIM — cryptographic signing |
| **TXT** | `_dmarc` | DMARC policy (recommended) |

4. Add these records in your DNS provider (Cloudflare, Route 53, registrar, etc.).
5. Back in Resend, click **Verify DNS Records**.
6. Wait until status shows **Verified** (can take a few minutes up to 48 hours depending on DNS TTL).

**Common mistakes**

- Adding records on the wrong subdomain (records must be on the domain you added in Resend).
- Using `onboarding@resend.dev` in production — that address only works for Resend’s sandbox/testing and is not for live Narrative Engine sends.
- From address domain does not match the verified domain (e.g. verified `memetic.adpr.work` but sending from `@adpr.work`).

---

## Step 3 — Confirm the From address

The Narrative Engine API sends with:

```text
Memetic Brand Labs <results@memetic.adpr.work>
```

You do **not** need to create a mailbox or “results email” in Resend. Resend sends on behalf of any address at your verified domain. The local part (`results`) is arbitrary as long as the domain is verified.

Configure in one of two places (admin config wins over env):

| Source | Key | Example |
|--------|-----|---------|
| Admin → Configuration → Commerce → **From address** | `email.results_from` | `Memetic Brand Labs <results@memetic.adpr.work>` |
| API env fallback | `RESULTS_EMAIL_FROM` | Same format |

Optional reply-to: `email.results_reply_to` in admin (e.g. `hello@adpr.work`).

---

## Step 4 — Admin dashboard toggles

Open **Admin → Configuration**:

### Commerce → Email

| Setting | Recommended |
|---------|-------------|
| **Send results email** | ON |
| **From address** | `Memetic Brand Labs <results@memetic.adpr.work>` |
| **Reply-to address** | Your support inbox |
| **Include public share link** | ON (optional) |

### Admin notifications

| Setting | Recommended |
|---------|-------------|
| **Send notification emails on run completion** | ON |
| **Notification recipients** | Your team emails (e.g. `you@adpr.work`) |

Recipients can be any inbox — they do **not** need to be on the verified Resend domain.

---

## Step 5 — Test end-to-end

### A. Quick API test (recommended)

Resend does **not** have a “Send” button under **Emails** for transactional/API mail. That UI is only for **Broadcasts** (marketing blasts). Narrative Engine sends via the API, so test the same way.

**1. Domain not verified yet** — use Resend’s sandbox sender to your own inbox:

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "onboarding@resend.dev",
    "to": ["YOUR_EMAIL@example.com"],
    "subject": "Resend API test",
    "html": "<p>If you see this, your API key works.</p>"
  }'
```

**2. Domain verified** — test with your real From address and Resend’s safe test recipient:

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "Memetic Brand Labs <results@memetic.adpr.work>",
    "to": ["delivered@resend.dev"],
    "subject": "Resend domain test",
    "html": "<p>Domain + API key are working.</p>"
  }'
```

Load your key first: `export RESEND_API_KEY=re_...` (from `narrative-engine-api/.env`).

**3. Confirm in the dashboard**

- **Emails → Logs** (not “Send”) — you should see the message with status `delivered`
- A successful API response looks like: `{"id":"..."}`

Resend test addresses (`delivered@resend.dev`, `bounced@resend.dev`, etc.) simulate delivery events without hitting a real inbox. Docs: [resend.com/docs/dashboard/emails/send-test-emails](https://resend.com/docs/dashboard/emails/send-test-emails)

### B. Test via Narrative Engine

1. Use the **public** flow at `/narrative-engine` — **not** Admin Playground.
   - Playground runs use `run_source = admin_test` and **do not** trigger admin notifications.
2. Complete email verification during unlock so `contact_email` is set.
3. Wait for the run to reach `status: completed`.

### C. Verify in the database

```sql
-- Admin notification (internal)
SELECT run_id, status, failure_code, failure_detail, recipients, sent_at, created_at
FROM admin_notification_deliveries
ORDER BY created_at DESC
LIMIT 5;

-- Results email (end user)
SELECT run_id, status, failure_code, failure_detail, sent_at, created_at
FROM result_email_deliveries
ORDER BY created_at DESC
LIMIT 5;
```

| `status` | Meaning |
|----------|---------|
| `sent` | Resend accepted the message — check inbox and Resend **Emails → Logs** |
| `failed` + `resend_not_configured` | `RESEND_API_KEY` missing on the API process that ran the pipeline |
| `failed` + `admin_notify_failed` / results failure | Resend API error — open `failure_detail` and check Resend logs |
| *(no row)* | Notifications disabled, `admin_test` run, no `contact_email`, or pipeline code did not run finalize |

### D. Verify in Resend dashboard

**Emails → Logs** shows every send attempt, delivery status, and bounce/spam reasons.

---

## Environment reference

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes (for email) | From Resend → API Keys |
| `RESULTS_EMAIL_FROM` | Recommended | Default From if `email.results_from` not set in admin |
| `FRONTEND_URL` | Yes | Links in email body (admin dashboard, share URLs) |
| `API_PUBLIC_URL` | Recommended | Graphic image URL in admin notification emails |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| API key set but no emails | Domain not verified in Resend | Complete Step 2; wait for Verified status |
| `resend_not_configured` in DB | Key not on the process that ran the pipeline | Set on Render **and** restart local API; redeploy if needed |
| Admin email missing, results email works | `admin_test` run or notifications off | Use public flow; check admin toggles |
| Results email missing | No `contact_email` on run | User must verify email before/during unlock |
| Emails in Resend logs but not inbox | Spam / corporate filter | Check spam; add SPF/DKIM/DMARC; warm up domain |
| `failure_detail` mentions domain | From address domain ≠ verified domain | Align `email.results_from` with verified domain |
| Worked locally, not on prod | Key only in local `.env` | Add `RESEND_API_KEY` to Render environment |

---

## Local vs production checklist

- [ ] Resend account created
- [ ] Domain `memetic.adpr.work` added and **Verified** in Resend
- [ ] API key created and stored securely
- [ ] `RESEND_API_KEY` in `narrative-engine-api/.env` (local)
- [ ] `RESEND_API_KEY` on Render web service (production)
- [ ] `RESULTS_EMAIL_FROM` matches verified domain
- [ ] Admin → **Send results email** ON
- [ ] Admin → **Send notification emails on run completion** ON
- [ ] Notification recipients configured
- [ ] Test run via `/narrative-engine` (not Playground)
- [ ] Row in `admin_notification_deliveries` with `status = sent`
- [ ] Resend **Emails → Logs** shows delivered

---

## Related

- [agentic-commerce.md](./agentic-commerce.md) — broader launch checklist (x402, Privy, Resend pointer)
- [deployment.md](./deployment.md) — Render / Vercel production deploy
- [environments.md](./environments.md) — local vs prod env vars
- [Supabase Auth redirects](./deployment.md#auth-redirects-when-email-gate-is-live) — magic-link verification (separate from Resend)
