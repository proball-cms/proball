# ProBall Website — Maintenance Guide

This document explains how the ProBall website works, how to make common changes, and what to do when something goes wrong. You don't need to be a developer to follow most of these steps.

---

## Table of Contents

1. [How the website works](#how-the-website-works)
2. [Accounts & logins](#accounts--logins)
3. [Publishing a blog post (via CMS)](#publishing-a-blog-post-via-cms)
4. [Publishing a blog post (manually)](#publishing-a-blog-post-manually)
5. [Registration form & email notifications](#registration-form--email-notifications)
6. [Analytics & ad tracking](#analytics--ad-tracking)
7. [Changing environment variables](#changing-environment-variables)
8. [Adding a URL redirect](#adding-a-url-redirect)
9. [Switching to the proball.com domain](#switching-to-the-proballcom-domain)
10. [Running the site locally](#running-the-site-locally)
11. [Key files reference](#key-files-reference)

---

## How the website works

The website is a collection of HTML files stored in a GitHub repository. When a change is pushed to GitHub, **Vercel** (the hosting platform) automatically rebuilds and publishes the site within about 30 seconds. There is no database — everything is a file.

**The blog** is the only part that changes regularly. Blog posts are written as simple text files. The client can write and publish posts themselves through a browser-based editor called **Sveltia CMS** — they never need to touch code.

**The registration form** on the How to Join page sends an email to `info@proball.com` every time someone submits their details.

---

## Accounts & logins

| Service | What it's for | How to log in |
|---|---|---|
| **Vercel** | Hosts the website | vercel.com — proball-cms account |
| **GitHub** | Stores the code | github.com/proball-cms/proball |
| **Resend** | Sends emails from the registration form | resend.com — sign in with GitHub |
| **Google Analytics** | Tracks website traffic and user behaviour | analytics.google.com — Property ID: `G-2QY638K759` |
| **Meta Ads Manager** | Tracks Facebook/Instagram ad performance | facebook.com/adsmanager — Pixel ID: `1842845596071300` |
| **GitHub OAuth App** | Allows the CMS to log in via GitHub | github.com — proball-cms account → Settings → Developer settings → OAuth Apps → "ProBall CMS" |

**Client CMS login:**
- URL: `proball.com/admin` (or `proball-green.vercel.app/admin` in dev)
- Click "Sign In with GitHub"
- GitHub username: `proball-cms`
- GitHub password: *(saved separately)*

---

## Publishing a blog post (via CMS)

This is the method the client uses. No code required.

1. Go to `proball.com/admin`
2. Sign in with GitHub using the `proball-cms` account
3. Click **New Post** and fill in the fields:
   - **Title** — the headline
   - **Date** — publish date
   - **Author / Author Title** — e.g. Ignacio Miranda / Head Coach
   - **Category** — choose from: Coaching, Development, Mindset, News, Parenting & Sport, Performance, Training
   - **Description** — 1–2 sentence summary (shown on blog cards and in Google)
   - **Image** — upload a photo
   - **Image Alt** — describe the photo for accessibility (e.g. "Coach demonstrating ball handling drill")
   - **Image Position** — controls where the image is cropped (e.g. `center 30%` focuses on the top third)
   - **CTA Heading / CTA Body** — the call-to-action box at the bottom of the post
   - **Body** — the post content
4. Click **Publish** — the site rebuilds automatically and the post is live within 30 seconds

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

## Registration form & email notifications

The **How to Join** page has a registration form. When someone submits it, two emails are sent automatically:

- **Notification email** → sent to `info@proball.com` with all the form details (athlete name, age, program, parent contact, etc.)
- **Confirmation email** → sent to the parent/guardian who submitted, confirming their registration was received

This is handled by `api/register.js` (a serverless function on Vercel) using **Resend** to send the emails.

### Changing where notification emails go

If you need to change the email address that receives form submissions:

1. Log in to Vercel → select the ProBall project
2. Go to **Settings → Environment Variables**
3. Find `NOTIFY_EMAIL` and update the value
4. Click **Save**, then go to **Deployments** and click **Redeploy** on the latest deployment

### Current limitation (dev only)

Until `proball.com` is verified in Resend, confirmation emails to parents will not send. This is a restriction of Resend's free plan — it can only send to `info@proball.com` while using a test sender address. This will be resolved when the domain goes live (see [Switching to the proball.com domain](#switching-to-the-proballcom-domain)).

The notification email to `info@proball.com` works now.

---

## Analytics & ad tracking

Both Google Analytics and the Meta (Facebook) Pixel are installed on every page of the site. They were migrated directly from the existing proball.com website so ad audiences and historical data carry over when the domain switches.

| Tool | ID | What it tracks |
|---|---|---|
| **Google Analytics (GA4)** | `G-2QY638K759` | Page views, traffic sources, user behaviour |
| **Meta Pixel** | `1842845596071300` | Facebook/Instagram ad conversions and retargeting audiences |

The tracking codes are embedded directly in the `<head>` of every HTML page and the blog post layout (`_layouts/post.njk`). No third-party plugin or tag manager is used — they fire on every page load automatically.

**To view analytics:**
- Google: go to analytics.google.com and select the ProBall property
- Meta: go to facebook.com/adsmanager → Events Manager → find Pixel `1842845596071300`

**Every page load** automatically fires:
- Google Analytics `page_view` event
- Meta Pixel `PageView` event

No extra code is needed for this — it happens by default when the pixel scripts load.

**Form conversion tracking** is also set up. When someone successfully submits the registration form, two conversion events fire automatically:
- Google Analytics records a `generate_lead` event (visible under Reports → Events)
- Meta records a `Lead` event (visible in Events Manager)

This allows ad campaigns to optimise toward registrations, not just page visits.

**To update or replace a pixel ID**, search for the old ID across all `.html` files and `_layouts/post.njk` and replace it with the new one, then commit and push.

---

## Changing environment variables

Environment variables are secret settings stored in Vercel (not in the code). They include API keys and configuration values. Never put these in the code files directly.

**Current variables:**

| Variable | What it does |
|---|---|
| `RESEND_API_KEY` | Authenticates with Resend to send emails |
| `NOTIFY_EMAIL` | The email address that receives form submissions |
| `FROM_EMAIL` | The sender address on outgoing emails (set to `noreply@proball.com` once domain is live) |
| `GITHUB_CLIENT_ID` | Allows the CMS to authenticate via GitHub |
| `GITHUB_CLIENT_SECRET` | Secret key for the CMS GitHub authentication |

**To update a variable:**
1. Vercel → ProBall project → **Settings → Environment Variables**
2. Click the variable → edit the value → Save
3. Redeploy for changes to take effect

---

## Adding a URL redirect

If a page moves or an old URL needs to point somewhere new, add a redirect in `vercel.json`:

```json
{ "source": "/old-url", "destination": "/new-page.html", "permanent": true }
```

Add it inside the `"redirects": [ ... ]` array. Commit and push — takes effect on next deploy.

---

## Switching to the proball.com domain

When the client is ready to go live on `proball.com`, follow these steps in order:

1. **Add the domain in Vercel** → Project → Settings → Domains → Add `proball.com`
2. **Update DNS records** at the domain registrar as instructed by Vercel
3. **Update the GitHub OAuth App** so the CMS login still works:
   - Log into github.com as `proball-cms` → Settings → Developer settings → OAuth Apps → ProBall CMS
   - Homepage URL → `https://proball.com`
   - Callback URL → `https://proball.com/api/callback`
4. **Update the CMS config** → open `admin/config.yml` and change `base_url` to `https://proball.com`
5. **Verify proball.com in Resend** so confirmation emails work:
   - Log in to resend.com → Domains → Add Domain → enter `proball.com`
   - Add the DNS records Resend provides (at the domain registrar)
   - Wait for verification (usually a few minutes)
6. **Add the FROM_EMAIL variable in Vercel** → set `FROM_EMAIL` to `noreply@proball.com`
7. **Commit and push** the `admin/config.yml` change

Once complete, both the notification and confirmation emails will work for all recipients.

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

---

## Key files reference

| File | What it does |
|---|---|
| `how-to-join.html` | The How to Join page, including the registration form |
| `index.html` | Homepage |
| `locations.html` | Programs & Locations page |
| `schedule.html` | Schedule page |
| `team.html` | Our Team page |
| `vercel.json` | Hosting config — build command, output folder, URL redirects |
| `admin/config.yml` | CMS field definitions — edit to add/remove form fields or categories |
| `_layouts/post.njk` | The HTML template used for every blog post |
| `blog/index.njk` | The blog index page template |
| `blog/posts/` | All blog post content files |
| `images/` | All image files |
| `api/auth.js` | Handles the CMS GitHub login (step 1) |
| `api/callback.js` | Handles the CMS GitHub login (step 2) |
| `api/register.js` | Handles registration form submissions and sends emails |
| `.eleventy.js` | Build configuration for the static site generator |
