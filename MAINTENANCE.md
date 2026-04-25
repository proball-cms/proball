# ProBall Website — Maintenance Guide

## Overview

Static site built with **Eleventy (11ty)**. Source files live in this repo. Every push to `master` triggers an automatic build and deploy on **Vercel**. The client publishes blog posts through **Sveltia CMS** at `/admin`.

---

## Hosting & Services

| Service | Purpose | Login |
|---|---|---|
| **Vercel** | Hosting + serverless functions | vercel.com — mcastino account |
| **GitHub** | Source code + CMS backend | github.com/mcastino/proball |
| **GitHub OAuth App** | CMS authentication | github.com → Settings → Developer settings → OAuth Apps → "ProBall CMS" |
| **Resend** | Transactional email (form notifications) | resend.com — signed in via GitHub |

---

## How the Build Works

Eleventy reads source files and outputs everything to `_site/`. Vercel serves from `_site/`.

- **Blog posts** — Markdown files in `blog/posts/*.md` → output to `_site/blog/*.html`
- **Blog index** — `blog/index.njk` → output to `_site/blog/index.html`
- **Post layout** — `_layouts/post.njk` (shared template for all posts)
- **Static pages** — `index.html`, `locations.html`, etc. — copied through unchanged
- **Images** — `images/` — copied through unchanged

To build locally:
```bash
npm install
npx @11ty/eleventy
```

To run a local dev server with live reload:
```bash
npx @11ty/eleventy --serve
```

---

## Blog Post Structure

Each post is a Markdown file in `blog/posts/` with YAML frontmatter:

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

<p>Post content as HTML...</p>
```

**Categories:** Coaching, Development, Mindset, News, Parenting & Sport, Performance, Training

**Image filenames** — store only the filename (e.g. `abc123.jpeg`), not the full path. Images are served from `/images/`.

**Permalinks** are set automatically by `blog/posts/posts.json` — the slug matches the filename (e.g. `my-post.md` → `/blog/my-post.html`).

---

## Adding a Blog Post Manually (without CMS)

1. Add the image file to `images/`
2. Create a new `.md` file in `blog/posts/` following the structure above
3. Commit and push to `master` — Vercel deploys automatically

---

## CMS (Sveltia CMS)

**URL:** `proball.vercel.app/admin` (or `proball.com/admin` once live)

**Login:** Click "Sign In with GitHub" → use the `proball-cms` GitHub account

**How it works:**
- The client fills in the fields and writes the post in the editor
- Clicking Publish creates a commit on `master` in GitHub
- Vercel detects the commit and rebuilds the site automatically (~30 seconds)
- The post is live

**CMS config file:** `admin/config.yml` — edit this to add/remove fields or change categories

---

## CMS Authentication (how it actually works)

The CMS uses a serverless OAuth proxy hosted on Vercel:

1. User clicks "Sign In with GitHub" on the CMS
2. Request goes to `/api/auth` (Vercel serverless function) → redirects to GitHub
3. GitHub redirects back to `/api/callback` with an auth code
4. `/api/callback` exchanges the code for a token using the stored client secret
5. Token is passed back to the CMS and the user is logged in

**Serverless functions:** `api/auth.js` and `api/callback.js`

**Environment variables in Vercel** (Settings → Environment Variables):
- `GITHUB_CLIENT_ID` — the GitHub OAuth App client ID
- `GITHUB_CLIENT_SECRET` — the GitHub OAuth App client secret

**GitHub OAuth App settings** (github.com → Settings → Developer settings → OAuth Apps → ProBall CMS):
- Homepage URL: `https://proball.vercel.app` (update to `https://proball.com` when live)
- Callback URL: `https://proball.vercel.app/api/callback` (update to `https://proball.com/api/callback` when live)

---

## Redirects

All URL redirects are managed in `vercel.json`. To add a new redirect:

```json
{ "source": "/old-url", "destination": "/new-url.html", "permanent": true }
```

---

## Registration Form

The How to Join page (`how-to-join.html`) has a live registration form that submits to `api/register.js`.

On submission it sends two emails via Resend:
- **Notification** to `info@proball.com` with all form fields
- **Confirmation** to the parent/guardian who submitted

**Environment variables in Vercel** (Settings → Environment Variables):
- `RESEND_API_KEY` — Resend API key (from resend.com → API Keys)
- `NOTIFY_EMAIL` — email that receives form submissions (currently `info@proball.com`)
- `FROM_EMAIL` — the from address on outgoing emails (see domain note below)

**Dev limitation:** Until `proball.com` is verified in Resend, the `FROM_EMAIL` defaults to `onboarding@resend.dev` which can only send to the Resend account email (`info@proball.com`). This means parent confirmation emails won't work until the domain is live.

---

## Moving to the Real Domain (proball.com)

When pointing `proball.com` to Vercel:

1. Add the domain in Vercel → Project → Settings → Domains
2. Update DNS records as instructed by Vercel
3. Update the GitHub OAuth App:
   - Homepage URL → `https://proball.com`
   - Callback URL → `https://proball.com/api/callback`
4. Update `admin/config.yml` line `base_url` → `https://proball.com`
5. Verify `proball.com` in Resend → Domains → Add Domain → add the DNS records they provide
6. Add `FROM_EMAIL` env var in Vercel → `noreply@proball.com`
7. Commit and push

---

## Handing Over the CMS to the Client

The client needs:
- URL: `proball.com/admin`
- GitHub username: `proball-cms`
- GitHub password: *(saved separately)*

They never need to touch code, GitHub, or Vercel. Everything happens through the CMS editor.

---

## Key Files

| File | Purpose |
|---|---|
| `.eleventy.js` | Eleventy config — filters, collections, passthrough copies |
| `vercel.json` | Build command, output directory, redirects |
| `admin/config.yml` | CMS field definitions and backend config |
| `_layouts/post.njk` | Blog post HTML template |
| `blog/index.njk` | Blog index page template |
| `blog/posts/posts.json` | Sets layout and permalink for all posts |
| `api/auth.js` | OAuth proxy — starts GitHub login |
| `api/callback.js` | OAuth proxy — completes GitHub login |
| `api/register.js` | Registration form handler — sends emails via Resend |
