# ProBall Website — Maintenance Guide

This document explains how the ProBall website works, how to make common changes, and what to do when something goes wrong. You don't need to be a developer to follow most of these steps.

---

## Table of Contents

1. [How the website works](#how-the-website-works)
2. [Accounts & logins](#accounts--logins)
3. [Domain & DNS](#domain--dns)
4. [Managing content via CMS](#managing-content-via-cms)
5. [Publishing a blog post (manually)](#publishing-a-blog-post-manually)
6. [Registration form pipeline](#registration-form-pipeline)
7. [Resend (transactional email)](#resend-transactional-email)
8. [Zapier → OneDrive Excel](#zapier--onedrive-excel)
9. [Analytics & ad tracking](#analytics--ad-tracking)
10. [Google Search Console & SEO](#google-search-console--seo)
11. [Environment variables](#environment-variables)
12. [Adding a URL redirect](#adding-a-url-redirect)
13. [Troubleshooting common issues](#troubleshooting-common-issues)
14. [Running the site locally](#running-the-site-locally)
15. [Key files reference](#key-files-reference)
16. [Outstanding cleanup tasks](#outstanding-cleanup-tasks)

---

## How the website works

The website is a collection of files stored in a GitHub repository. When a change is pushed to GitHub, **Vercel** (the hosting platform) automatically rebuilds and publishes the site within about 30 seconds. There is no database — everything is a file.

**Stack at a glance:**

| Layer | What it does |
|---|---|
| **GitHub** (`proball-cms/proball`) | Stores all code and content. Source of truth. |
| **Sveltia CMS** (`/admin`) | Browser-based editor for blog posts, venues, team — saves changes back to GitHub. |
| **Vercel** | Builds the site from GitHub and serves it on `proball.com`. Auto-deploys on every push. |
| **Resend** | Sends transactional email from the registration form (notifications + confirmations). |
| **Zapier** | Listens for form submissions via a webhook and appends a row to OneDrive Excel for the client's records. |
| **GoDaddy** | Domain registrar for `proball.com` and `proball.com.au`. DNS managed here. |
| **Microsoft 365** | Email host for `info@proball.com` and any other `@proball.com` mailboxes. Completely separate from the website. |

---

## Accounts & logins

> **One login for everything:** Vercel, Resend, and GitHub all use the `proball-cms` GitHub account. Log into GitHub first and the others will follow.

| Service | What it's for | How to log in |
|---|---|---|
| **GitHub** | Stores the code | github.com/proball-cms/proball |
| **Vercel** | Hosts the website | vercel.com — sign in with GitHub (`proball-cms`) |
| **Resend** | Sends transactional emails from the form | resend.com — sign in with GitHub (`proball-cms`) |
| **Zapier** | Captures form submissions to OneDrive Excel | The client's Zapier account |
| **GoDaddy** | Domain registrar / DNS | The client's GoDaddy login (Ben Osborne) |
| **Microsoft 365** | Email for `info@proball.com` | The client's Microsoft 365 login |
| **Google Analytics** | Website traffic | analytics.google.com — Property ID: `G-2QY638K759` |
| **Google Search Console** | SEO health / sitemap status | search.google.com/search-console — property `https://proball.com` |
| **Meta Ads Manager** | Facebook/Instagram ad tracking | facebook.com/adsmanager — Pixel ID: `1842845596071300` |
| **GitHub OAuth App** | Lets the CMS log in via GitHub | github.com — `proball-cms` → Settings → Developer settings → OAuth Apps → "ProBall CMS" |

**Live site:** https://proball.com

**Client CMS login:**

1. Go to `https://proball.com/admin`
2. Click "Sign In with GitHub"
3. GitHub username: `proball-cms`
4. GitHub password: *(stored separately)*

---

## Domain & DNS

The website lives at **`proball.com`**, registered with **GoDaddy**. The client also owns **`proball.com.au`** but it currently has its own DNS records and is not yet redirected (see [Outstanding cleanup tasks](#outstanding-cleanup-tasks)).

### What points where

| Record | Value | Purpose |
|---|---|---|
| `A @` | `216.198.79.1` | Apex (`proball.com`) → Vercel |
| `CNAME www` | `08651427593f1de5.vercel-dns-017.com.` | `www.proball.com` → Vercel (which then 308-redirects to apex) |
| `MX @` | `proball-com.mail.protection.outlook.com.` | Inbound email → Microsoft 365 |
| `CNAME autodiscover` | `autodiscover.outlook.com.` | Microsoft 365 autodiscovery |
| `CNAME msoid`, `sip`, `lyncdiscover` | various Microsoft endpoints | Microsoft Teams / 365 services |
| `TXT @` SPF | `v=spf1 include:secureserver.net -all` | Apex SPF (see "Known SPF issue" below) |
| `TXT _dmarc` | `v=DMARC1; p=none;` | DMARC policy (currently passive) |
| `TXT resend._domainkey` | `p=MIGfMA...QIDAQAB` | DKIM signing key for Resend |
| `MX send` | `feedback-smtp.ap-northeast-1.amazonses.com.` priority 10 | Bounce return-path for Resend |
| `TXT send` | `v=spf1 include:amazonses.com ~all` | SPF for the Resend bounce subdomain |
| `CNAME k2._domainkey`, `k3._domainkey` | Mailchimp DKIM | DKIM for Mailchimp marketing emails |
| `TXT @` google-site-verification (×2) | various | Pre-existing Google Search Console proofs |

### Golden rule

**Never touch MX, autodiscover, msoid, sip, lyncdiscover, SRV `_sip._tls`, SRV `_sipfederationtls._tcp`, or any TXT record with `outlook`/`onmicrosoft` in it.** Those route email through Microsoft 365. Breaking them takes down `info@proball.com` and any other mailbox on the domain.

### Known SPF issue (not yet fixed)

The apex SPF record (`v=spf1 include:secureserver.net -all`) is **misconfigured for Microsoft 365**. It only authorises GoDaddy's mail servers, not Microsoft's. This means outbound emails from `info@proball.com` may fail SPF checks at the recipient and land in spam.

**The fix** (whenever the client is ready): edit that one TXT record to:

```
v=spf1 include:spf.protection.outlook.com -all
```

This authorises Microsoft 365 outbound mail. Test by sending an email from `info@proball.com` to a Gmail address and checking the headers (`spf=pass`). Confirm with the client before making this change — wrong SPF can break outbound mail entirely.

The Resend SPF (at the `send.proball.com` subdomain) is **separate and already correct**; it doesn't conflict with the apex SPF.

---

## Managing content via CMS

This is the method the client uses. No code required.

1. Go to `https://proball.com/admin`
2. Sign in with GitHub using the `proball-cms` account
3. Choose a collection from the left sidebar:
   - **Blog Posts** — articles and news
   - **Locations** — venue pages (one per training location)
   - **Team Members** — coach profiles on the Our Team page

### Blog posts

Click **New Post** and fill in the fields:
- **Title** — the headline
- **Date** — publish date
- **Author / Author Title** — e.g. Ben Osborne / ProBall Founder
- **Category** — choose from: Coaching, Development, Mindset, News, Parenting & Sport, Performance, Training
- **Description** — 1–2 sentence summary (shown on blog cards and in Google)
- **Image** — upload a photo
- **Image Alt** — describe the photo for accessibility
- **Image Position** — controls crop (e.g. `center 30%` focuses on the top third)
- **CTA Heading / CTA Body** — the call-to-action box at the bottom of the post
- **Body** — the post content

### Locations

Each venue has its own page (e.g. `/locations/leichhardt.html`). The page URL is generated automatically from the venue title — no need to set a permalink.

Click **New Location** and fill in the fields. Key fields:
- **Title** — venue name shown as the page heading (e.g. `Leichhardt`)
- **Order** — controls where this venue appears in listings (lower = first)
- **Programs** — select `Miniball`, `Academy`, or both — determines which tabs this venue appears in on the Locations page
- **Region / Venue Address / Venue City** — displayed on listing and venue cards
- **Google Maps URL** — the "Map" button link
- **Hero Image** — upload a venue photo; leave blank for a plain gradient background
- **About Paragraphs** — 2–3 paragraphs about the venue (supports **bold** and *italic*)
- **Why Choose** — 4–6 bullet points
- **Nearby Suburbs** — list of suburb names for the "Serving the…" section

To **remove** a venue, open it in the CMS and click **Delete**.

### Team members

Each coach has a card on the Our Team page. Click **New Team Member** and fill in:
- **Name** — full name
- **Role** — e.g. `Coaching Director`
- **Order** — controls display order (lower = first)
- **Role Colour / Credential Colour** — Red or Blue
- **Photo** — upload a headshot
- **Photo Background / Opacity / Position** — controls how the photo looks in the card
- **LinkedIn URL** — optional; leave blank to hide the LinkedIn link
- **Credentials** — 3–5 short credential lines (e.g. `NCAS Level 3`)
- **Bio (Main) / Bio (Secondary)** — two bio paragraphs; supports **bold**

Click **Publish** on any item — the site rebuilds automatically and is live within 30 seconds.

### ⚠️ CMS won't load — YAML config gotcha

If the CMS shows *"There is an error in the CMS configuration. The configuration file could not be parsed,"* the most common cause is an unquoted Tailwind arbitrary value containing `#` in `admin/config.yml`. YAML treats `#` as a comment marker.

Example bad value:
```yaml
- { label: Brand blue, value: bg-[#004aad] }   # breaks the CMS
```

Fix: wrap the value in quotes.
```yaml
- { label: Brand blue, value: "bg-[#004aad]" }   # OK
```

The same applies to team member frontmatter — any `photoBg: bg-[#...]` value must be quoted.

---

## Publishing a blog post (manually)

Use this method if the CMS is unavailable or you need more control.

1. Add the post image to the `images/` folder
2. Create a new file in `blog/posts/` named `your-post-slug.md`
3. Use this structure at the top of the file:

```markdown
---
title: "Post title here"
date: 2026-04-25
author: Ignacio Miranda
authorTitle: Head Coach, ProBall Academy
category: Coaching
description: "Short summary shown on blog cards and in search results."
image: filename.jpeg
imageAlt: Alt text for the image
imagePosition: center 30%
ctaHeading: Your call-to-action heading
ctaBody: Your call-to-action body text.
---

<p>Post content goes here as HTML paragraphs.</p>
```

4. Commit and push to `master` — Vercel deploys automatically

**Note:** The filename becomes the URL slug. `my-post.md` → `/blog/my-post.html`

---

## Registration form pipeline

When a parent submits the form at `https://proball.com/how-to-join.html#register`, the following happens automatically:

```
Browser form submit
        │
        ▼
POST /api/register   (Vercel serverless function — api/register.js)
        │
        ├─► Resend: send admin notification to info@proball.com
        │       (always — required field)
        │
        ├─► Resend: send parent confirmation to the submitted email
        │       (best-effort — non-fatal if Resend rejects)
        │
        └─► Zapier webhook: POST the form payload as JSON
                │
                ▼
        Zapier captures the run, runs the "Add Row to Table" action
                │
                ▼
        OneDrive Excel workbook gets a new row
```

### Fields collected

| Form field | API key | Notes |
|---|---|---|
| Athlete First Name | `first_name` | Optional |
| Athlete Last Name | `last_name` | Optional |
| Date of Birth | `dob` | Optional, HTML5 date input |
| Gender | `gender` | Optional, dropdown |
| Parent / Guardian Name | `parent_name` | Optional |
| Parent / Guardian Email | `parent_email` | **Required.** Must look like an email — regex validated server-side. |
| Parent / Guardian Phone | `parent_phone` | Optional |
| Interested Program | `program` | Optional (Miniball / Academy / Teams / Not sure) |
| Suburb | `suburb` | Optional |
| How did you hear about us? | `hear_about` | Optional |
| Additional Notes | `notes` | Optional |

### Validation rules

- Email is the **only required field**.
- The form has a red `*` next to the Email label.
- The browser uses `required` for native validation.
- The server (`api/register.js`) also runs a regex check (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`). If it fails, the API returns a 400 and the user sees: *"Please enter a valid email address so we can get back to you."*
- Any other validation failure on the front end shows the same email-focused message.

### Booking modal

There is also a quick-book modal (`booking-modal.js`) that opens over any page when someone clicks a "Book a Free Trial" link from a non-Join page. It uses the same `/api/register` endpoint and follows the same rules.

---

## Resend (transactional email)

The website uses **Resend** to send two types of email from the registration form:

1. **Admin notification** to `info@proball.com` — formatted summary of the submission
2. **Parent confirmation** to the submitted email — "Thanks for registering!" template

### Domain status

`proball.com` is **verified in Resend** (DKIM + SPF + return-path MX, all on subdomains so M365 inbound mail is untouched). This means Resend can send from `noreply@proball.com` to **any** recipient.

### Configured sender

Set in Vercel as the `FROM_EMAIL` environment variable:

```
ProBall <noreply@proball.com>
```

You don't need to actually create a mailbox at `noreply@proball.com` — emails are sent FROM this address, but replies routed via the `replyTo` header (which is set to `info@proball.com` or the parent's email).

### Where to view sent emails

Resend dashboard → **Emails** tab. Filter by status (Delivered / Bounced / Complained), recipient, or subject. Default retention on the free tier is ~30 days.

### Why the parent confirmation is "best-effort"

In `api/register.js`, the parent confirmation send is wrapped in its own `try/catch`. If Resend rejects the recipient (e.g. typo'd email), the admin notification still goes through and the API returns success to the user. The catch logs the error to Vercel's runtime logs.

### Changing the sender

To change `noreply@proball.com` to something else (e.g. `bookings@proball.com`):

1. Vercel → Settings → Environment Variables → edit `FROM_EMAIL` → set new value (any address `@proball.com` works)
2. Redeploy
3. The new sender activates immediately

No DNS change needed — the entire domain is verified.

---

## Zapier → OneDrive Excel

Every successful registration is also POSTed to a Zapier webhook, which appends a new row to a Microsoft Excel workbook stored in the client's OneDrive. This gives the client a spreadsheet of every submission with timestamps.

### Wiring

| Piece | Where |
|---|---|
| Webhook URL | Stored in Vercel env var `ZAPIER_WEBHOOK_URL` |
| Code call | `api/register.js` — fire-and-forget `fetch()` with the form payload as JSON. If Zapier is down or env var is missing, registration still succeeds (errors are logged but non-fatal). |
| Zap trigger | "Webhooks by Zapier" → "Catch Hook" — captures the JSON |
| Zap action | "Microsoft Excel" → "Add Row to Worksheet" — writes one row to the configured workbook |

### JSON payload Zapier receives

```json
{
  "submitted_at": "2026-05-14T03:22:15.408Z",
  "first_name": "...",
  "last_name": "...",
  "athlete_name": "First Last",
  "dob": "...",
  "gender": "...",
  "parent_name": "...",
  "parent_email": "...",
  "parent_phone": "...",
  "program": "...",
  "suburb": "...",
  "hear_about": "...",
  "notes": "..."
}
```

### Excel workbook

The workbook lives in the client's OneDrive. Column headers in row 1 map to the JSON fields above. To see the Zap (or modify which workbook receives rows), log into Zapier with the client's credentials.

### Replacing the webhook URL

If the Zap is rebuilt:

1. Get the new webhook URL from Zapier
2. Update `ZAPIER_WEBHOOK_URL` in Vercel env vars
3. Redeploy

If `ZAPIER_WEBHOOK_URL` is absent or empty, `api/register.js` silently skips the Zapier call — emails still go out as normal.

---

## Analytics & ad tracking

Both Google Analytics and the Meta (Facebook) Pixel are installed on every page of the site.

| Tool | ID | What it tracks |
|---|---|---|
| **Google Analytics (GA4)** | `G-2QY638K759` | Page views, traffic sources, user behaviour |
| **Meta Pixel** | `1842845596071300` | Facebook/Instagram ad conversions and retargeting audiences |

The tracking codes are embedded directly in the `<head>` of every HTML page and the blog post layout (`_layouts/post.njk`). No third-party plugin or tag manager.

**Every page load** automatically fires:
- Google Analytics `page_view` event
- Meta Pixel `PageView` event

**Form conversion tracking** (when a registration completes successfully):
- Google Analytics `generate_lead` event (visible under Reports → Events)
- Meta Pixel `Lead` event (visible in Events Manager)

This allows ad campaigns to optimise toward registrations, not just page visits.

**To update or replace a pixel ID**, search for the old ID across all `.html` files and `_layouts/post.njk` and replace it with the new one, then commit and push.

---

## Google Search Console & SEO

### GSC

The property `https://proball.com` is verified via the HTML meta tag method. The verification tag is in `index.html`:

```html
<meta name="google-site-verification" content="cXe6qh4ACLX85tHAoFWNJhyYu5oeFOEbmCFwog0jmLA" />
```

**Do not remove this tag** — losing it would un-verify the property.

The sitemap (`sitemap.xml`) has been submitted and Google has begun crawling all 24 indexed URLs.

To check ranking, traffic, or crawl errors, log into search.google.com/search-console and select the property.

### What protects SEO rankings

- **32 × 301 redirects** in `vercel.json` covering every legacy URL from the old WordPress site. Adding new ones: see [Adding a URL redirect](#adding-a-url-redirect) below.
- **Canonical tags** on every page point to the `proball.com` version.
- **Schema markup** — SportsClub + FAQPage on the homepage, LocalBusiness on each location page, BlogPosting on each blog post.
- **Sitemap** at `https://proball.com/sitemap.xml` (regenerated automatically by Eleventy on every build).

### Highest-impact remaining SEO work

Create a **Google Business Profile** for each of the 7 venues. Highest-impact task that's still outstanding. Free, ~15 min per venue. Each profile should reference the venue's location page on proball.com.

See `SEO-SUMMARY.md` and `SEO-PLAN.md` in the repo root for the full SEO context.

---

## Environment variables

Environment variables are secret settings stored in Vercel (not in the code). They include API keys and configuration values. Never put these in the code files directly.

**Current variables:**

| Variable | What it does |
|---|---|
| `RESEND_API_KEY` | Authenticates with Resend to send emails |
| `NOTIFY_EMAIL` | The email address that receives form submissions (default: `info@proball.com`) |
| `FROM_EMAIL` | The sender address on outgoing emails (currently `ProBall <noreply@proball.com>`) |
| `ZAPIER_WEBHOOK_URL` | Endpoint Zapier listens on for new form submissions |
| `GITHUB_CLIENT_ID` | Allows the CMS to authenticate via GitHub |
| `GITHUB_CLIENT_SECRET` | Secret key for the CMS GitHub authentication |

**To update a variable:**
1. Vercel → ProBall project → **Settings → Environment Variables**
2. Click the variable → edit the value → Save
3. Redeploy for changes to take effect (Deployments → ⋯ → Redeploy)

---

## Adding a URL redirect

If a page moves or an old URL needs to point somewhere new, add a redirect in `vercel.json`:

```json
{ "source": "/old-url", "destination": "/new-page.html", "permanent": true }
```

Add it inside the `"redirects": [ ... ]` array. Commit and push — takes effect on next deploy.

**Always use `"permanent": true`** (a 301 redirect). This tells search engines that ranking signals should transfer to the new URL. Use `false` (302) only for genuinely temporary redirects.

---

## Troubleshooting common issues

### "CMS won't load" — config error
See the YAML gotcha note under [Managing content via CMS](#managing-content-via-cms). Any unquoted Tailwind value with `#` in it (e.g. `bg-[#004aad]`) breaks YAML parsing.

### "Form submission fails with a generic error"
- Check Vercel → Deployments → latest → Function Logs. Look at `/api/register` invocations.
- Common cause: a Resend API key change or expiry. Confirm `RESEND_API_KEY` is still valid.
- Less common: Resend rejected the parent confirmation email. That's intentionally non-fatal, so it shouldn't affect the user's experience — but if you see frequent confirmation failures, check Resend's dashboard.

### "Confirmation email never arrives"
- Verify the recipient checked spam.
- Check Resend → Emails → filter by recipient. If the email shows "Delivered" but didn't arrive, it's a recipient mail-server issue, not ours.
- If the email shows "Bounced," the address was invalid.

### "Zapier didn't capture a submission"
- Check `ZAPIER_WEBHOOK_URL` is set in Vercel and matches the current Zap's URL.
- Check Zapier's task history for failed runs.
- The webhook call is fire-and-forget — if Zapier is down, the form submission still succeeds; the row just won't appear.

### "Vercel says SSL not provisioned"
- Confirm DNS records still point at the values listed under [Domain & DNS](#domain--dns).
- Refresh the Vercel Domains page. Vercel will retry provisioning automatically.

### "Outbound `info@proball.com` emails landing in spam"
See the [Known SPF issue](#known-spf-issue-not-yet-fixed) note under Domain & DNS. The apex SPF record needs updating to include Microsoft 365.

### "I broke the live site with a bad commit"
- Vercel → Deployments → find the last good deployment → click ⋯ → **Promote to Production**. This rolls back live traffic instantly without needing a git revert.
- Then fix the bad commit at your leisure and push.

---

## Running the site locally

To preview the site on your own machine before pushing changes:

```bash
npm install
npx @11ty/eleventy --serve
```

The site will be available at `http://localhost:8080`. It will reload automatically when you save a file.

To build without serving:

```bash
npx @11ty/eleventy
```

The build output is generated into `_site/` and is gitignored. Vercel runs the same build command on every push.

---

## Key files reference

| File / Folder | What it does |
|---|---|
| `index.html` | Homepage |
| `how-to-join.html` | How to Join page, including the registration form |
| `schedule.html` | Schedule page |
| `terms.html` | Terms & Conditions |
| `locations.njk` | Programs & Locations page template (generated from `_locations/`) |
| `team.njk` | Our Team page template (generated from `_team/`) |
| `blog/index.njk` | Blog index page template |
| `_locations/` | One `.md` file per venue — edit content here or via CMS |
| `_locations/_locations.json` | Sets automatic permalink pattern for all venue pages |
| `_team/` | One `.md` file per team member — edit content here or via CMS |
| `_team/_team.json` | Prevents team member files from generating their own pages |
| `_layouts/location.njk` | HTML template for individual venue pages |
| `_layouts/post.njk` | HTML template for blog posts |
| `blog/posts/` | All blog post content files |
| `images/` | All uploaded image files |
| `booking-modal.js` | The quick-book modal that opens over any page |
| `sitemap.xml` | Sitemap submitted to Google Search Console |
| `robots.txt` | Allows all crawlers; points at the sitemap; disallows `/admin/` and `/api/` |
| `admin/config.yml` | CMS field definitions — edit to add/remove fields or categories |
| `admin/index.html` | CMS entry point — Sveltia CMS loads here |
| `vercel.json` | Hosting config — build command, output folder, URL redirects |
| `api/auth.js` | Handles CMS GitHub login (step 1) |
| `api/callback.js` | Handles CMS GitHub login (step 2) |
| `api/register.js` | Handles registration form submissions — sends emails + Zapier webhook |
| `.eleventy.js` | Build config — collections, filters, passthrough files |
| `SEO-PLAN.md` / `SEO-SUMMARY.md` | SEO strategy & ongoing recommendations |

---

## Outstanding cleanup tasks

These are non-urgent items that can be done at the client's discretion:

1. **Cancel old WordPress hosting** — the previous proball.com WordPress site still exists on its old host. DNS no longer points there, but the files and database are still being paid for. Recommend cancelling 30+ days after launch once the new site is confirmed stable. Export a final WordPress backup before cancellation.

2. **Decide on proball.com.au** — the client owns this domain but it has its own DNS (currently still pointing at the old AWS hosting). Recommended: point it at Vercel and add a redirect at the Vercel layer so `proball.com.au → proball.com`. Without this, search engines may see them as separate sites with duplicate content.

3. **Fix the apex SPF record** — see the [Known SPF issue](#known-spf-issue-not-yet-fixed) section. Update `v=spf1 include:secureserver.net -all` to `v=spf1 include:spf.protection.outlook.com -all`.

4. **Clean up unused DNS records** — `A admin`, `A mail`, `CNAME cpanel`, `CNAME whm`, `CNAME webdisk`, `CNAME webdisk.admin`, `CNAME www.admin` are all leftovers from the old GoDaddy WordPress hosting. They point at a dead IP now and can be safely deleted at GoDaddy.

5. **Create Google Business Profiles** for each of the 7 venues — biggest remaining SEO win.

6. **Lower the apex A record TTL** at GoDaddy from 10800s (3 hours) to 600s (10 min). Currently any future DNS change takes up to 3 hours to fully propagate. A shorter TTL means cleaner cutovers next time.
