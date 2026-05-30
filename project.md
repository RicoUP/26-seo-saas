# SEOtool.to — SEO SaaS Project Tracker

> **Last updated:** 2026-05-29 by Rico
> **Status:** Active development — core features functional, content quality & WP OAuth need enhancement

---

## 1. Project Overview

**Stack:**
- **Frontend:** React 19 + Vite + Tailwind CSS 3.4 + React Router + Lucide icons + Recharts
- **Backend:** InsForge BaaS (PostgreSQL, Auth, Edge Functions, Storage)
- **AI:** OpenRouter (GPT-4o-mini) via InsForge-provided key
- **Deployment:** InsForge hosting

**Backend URL:** `https://zchqu92m.eu-central.insforge.app`  
**Repo:** `https://github.com/RicoUP/26-seo-saas.git`

---

## 2. Core Features (Implemented)

| Feature | Status | Details |
|---------|--------|---------|
| Auth (Register/Login/Logout) | ✅ Done | InsForge email/password auth |
| Tiered Plans (Starter/Growth/Pro) | ✅ Schema done | Profiles table with tier & quota enforcement in UI |
| Keyword Research | ✅ Functional | OpenRouter AI generates 8-12 related keywords per seed. Fallback mock generator exists. |
| Content Generator | ✅ Functional | OpenRouter writes 2000+ word SEO blog posts. Fallback mock generator exists. |
| Rank Tracking (manual) | ✅ Done | Manual position logging per keyword in `keyword_rankings` table |
| WordPress Publish | ✅ Functional | Native **Application Passwords** flow — one-click authorization, no plugin needed. Manual entry fallback. |
| Dashboard Stats | ✅ Done | Keywords, content pieces, websites, avg position |
| Usage Quotas | ✅ Done | Per-action logging in `usage_logs` table |
| Stripe Billing | 🟡 Stub | `stripe_customer_id`, `stripe_subscription_id` in schema. Portal button is placeholder. |
| Email Queue | 🟡 Schema only | `email_queue` table exists, no cron/edge function sending emails yet. |
| Content Quality Enhancement | ❌ Not started | Need better prompts, SERP analysis, outline-first generation, internal linking. |

---

## 3. Architecture

### Database Schema
```
profiles          → extends auth.users (tier, stripe ids, subscription_status)
websites          → user-connected domains (wordpress: wp_url, wp_username, wp_app_password)
keywords          → AI-researched keywords (seed_keyword, keyword, difficulty, volume, intent, status)
keyword_rankings  → manually logged Google positions
content_requests  → content generation jobs (title, meta, html, word_count, status, publish_method)
usage_logs        → quota tracking per user/month/action
email_queue       → pending email notifications
```

### Edge Functions
```
keyword-research  → POST {seed_keyword} → OpenRouter → JSON array of keyword objects
content-generator → POST {request_id, keyword} → OpenRouter → writes HTML to DB + optional WP publish
smart-agent       → POST {task} → general OpenRouter chat (unused in UI currently)
```

### Frontend Pages
```
/           → Home (marketing)
/pricing    → Plans
/login      → Auth
/register   → Auth
/dashboard  → Stats + quick actions + recent activity
/keywords   → Research + list + CSV export + rank logging
/content    → Generate + list + download HTML
/settings   → Profile + billing stub + website management
```

---

## 4. Known Issues & Technical Debt

- **WP Auth uses native Application Passwords** — one-click flow, no plugin needed (see section 7)
- **Content is generic** — AI writes good but not *great* content. Needs SERP analysis, competitor outlines.
- **Stripe is stubbed** — Portal button shows `alert()`, no real checkout/session.
- **Email queue not wired** — Schema exists, no sending mechanism.
- **No real SERP data** — Difficulty/volume are AI estimates, not from Ahrefs/Semrush APIs.
- **No content editor** — Generated HTML is read-only; user cannot tweak before publish.

---

## 5. Keyword Research: How It Works

### Current Flow
1. User enters a **seed keyword** (e.g., "plumber denver")
2. Frontend calls `keyword-research` edge function (or falls back to local mock)
3. Edge function sends a system prompt to **OpenRouter (GPT-4o-mini)**:
   - Role: "expert SEO keyword researcher"
   - Returns: JSON array of 8-12 keyword objects
   - Fields per keyword: `keyword`, `difficulty` (1-100), `search_volume` (100-50K), `intent` (informational/transactional/navigational/commercial)
   - Temperature: 0.3 (low creativity, factual)
4. Results stored in `keywords` table with `user_id`, `seed_keyword`, and metadata

### What It Uses
- **API:** OpenRouter (`openai/gpt-4o-mini`) via InsForge provisioned key
- **No external keyword APIs** (no Ahrefs, Semrush, Google Keyword Planner)
- **Volume/difficulty are AI estimates** — not scraped or real search data

### What Needs Improvement
- [ ] Integrate real keyword API (Ahrefs/SEMrush/SerpApi) for accurate volume/difficulty
- [ ] Add long-tail expansion & clustering
- [ ] Add competitor domain scraping to find keywords they rank for
- [ ] Add SERP feature detection (featured snippets, PAA, local pack)

---

## 6. Content Generation: How It Works

### Current Flow
1. User selects a **target keyword** from `keywords` table (status = 'target')
2. User optionally picks a **website** and publish method (download or WordPress)
3. Frontend creates a `content_requests` row with status `generating`
4. Edge function `content-generator` calls **OpenRouter (GPT-4o-mini)**:
   - Role: "expert SEO blog writer"
   - Prompt: "Write complete original 2000+ word SEO blog post targeting keyword X"
   - Returns JSON: `{title, meta_description, content_html, word_count}`
   - Temperature: 0.6 (creative but structured)
5. Edge function updates DB with generated content
6. If publish_method == 'wordpress' and website has credentials → POST to WP REST API

### Current Prompt Strategy
- System prompt asks for clean HTML with `<h1>`, `<h2>`, `<p>`, `<ul>`, `<li>`
- Requests table of contents, key takeaways, conclusion
- Enforces SEO constraints: title < 60 chars, meta < 160 chars

### What Needs Improvement
- [ ] **SERP Analysis** — scrape top 5 results for keyword, analyze headings, word count, featured snippet format
- [ ] **Competitor Outlines** — extract H2/H3 structures from ranking pages, build superior outline
- [ ] **Internal Linking** — suggest links to existing website pages during generation
- [ ] **E-E-A-T signals** — add author bios, citations, expert quotes, real data
- [ ] **Image prompts** — generate DALL-E/Midjourney prompts for featured images
- [ ] **Two-pass generation** → outline first, then expand each section with more detail
- [ ] **Content scoring** — readability (Flesch-Kincaid), keyword density, heading structure score
- [ ] **Custom writing styles** — tone selector (professional, casual, technical, salesy)
- [ ] **Fact-checking layer** — verify claims with web search or Perplexity API

---

## 7. WordPress Connection: How It Works

### Current Implementation (Native Application Passwords — One-Click)

#### For Users (One-Click Flow)
1. Go to **Settings > Websites > Connect WordPress**
2. Enter your WordPress site URL (e.g., `https://example.com`)
3. Click **Authorize WordPress** → opens WP admin in new tab
4. Log into WordPress (if not already logged in)
5. Click **"Approve"** on the Application Passwords screen
6. Automatically redirected back to SEO Tool — connection is live!

#### Manual Fallback
If the one-click flow doesn't work (e.g., security plugins block REST API):
1. In **Settings > Websites > Add Manual**
2. Enter domain, optional niche
3. Enter WordPress REST URL, username, and Application Password
4. Click **Save Website**

#### How to Get a Manual Application Password
1. Log into your WordPress admin
2. Go to **Users > Your Profile** (or Users > [username])
3. Scroll to **Application Passwords** section
4. Enter "SEO Tool" as the app name
5. Click **Add New Application Password**
6. Copy the generated password (shown once)

#### Content Publishing
When content is generated with `publish_method = 'wordpress'`:
- Edge function POSTs to `{wp_url}/wp/v2/posts` with Basic Auth header
- Body: `{title, content: html, status: "publish", excerpt: meta_description}`
- On success, updates `content_requests.status` to `published`

### Known Limitations
- **No media upload** — featured images cannot be pushed to WP
- **No category/tag selection** — posts land in default category
- **No scheduling** — publishes immediately (status always "publish")
- **No draft preview** — cannot save as draft in WP first
- **No error handling UI** — WP publish failures are only logged server-side

### WordPress Connection (Implemented — Native Application Passwords)
- [x] **Edge Function** `wp-auth-start` — discovers WP auth endpoint, validates HTTPS, builds redirect URL
- [x] **Edge Function** `wp-auth-callback` — captures credentials from WP redirect, verifies, saves to DB
- [x] **Edge Function** `wp-verify` — tests stored credentials, marks status paused if invalid
- [x] **Frontend Wizard** — 1-step modal: Enter WP URL → Authorize in new tab → Auto callback
- [x] **Legacy Plugin** (`seotoolto-connector.php`) — kept for reference but no longer required
- [ ] Deploy edge functions to InsForge production
- [ ] Handle WordPress multisite / subdirectory install edge cases
- [ ] Auto-refresh connection status on site list

#### How the One-Click Flow Works
1. **User clicks "Connect WordPress"** and enters their site URL (e.g., `https://example.com`)
2. **Edge function** discovers the WP REST API auth endpoint via `GET /wp-json`
3. **Builds redirect URL** to WordPress `authorize-application.php` with:
   - `app_name=SEO Tool`
   - `success_url=https://[frontend]/settings?wp_callback=1`
   - `reject_url=https://[frontend]/settings?wp_rejected=1`
4. **Opens WP admin** in new tab → user enters login credentials (if needed) → clicks "Approve"
5. **WordPress redirects back** to `?wp_callback=1&site_url=...&user_login=...&password=...`
6. **Settings page detects** callback params on load, calls `wp-auth-callback` edge function
7. **Edge function verifies** credentials via `GET /wp/v2/users/me` with Basic Auth
8. **Credentials saved** to `websites` table with `status = 'active'`
9. **Future publishes** use Basic Auth with the approved application password
10. **Verify button** re-tests credentials; marks `paused` if they fail

#### Why This Beats Plugin + OAuth2
- **No plugin installation** — uses WordPress core's native Application Passwords (WP 5.6+)
- **No OAuth headaches** — no client registration, no redirect URL config, no token refresh
- **One-click** — enter URL → approve in WP → done
- **Secure** — credentials verified before storage, HTTPS enforced, password revocable in WP admin
- **Fallback** — manual entry still available for edge cases

#### Security
- HTTPS-only enforced (WP blocks Application Passwords on non-HTTPS sites)
- Credentials verified via REST API before being stored in DB
- App passwords are revocable via WP admin → Users → Application Passwords
- Callback URL params are cleaned from browser history after processing
- No credentials stored in browser localStorage

---

## 8. Deployment & Dev Commands

```bash
# Dev
npm run dev           # Vite dev server
# Build
npm run build         # tsc + vite build
# Preview
npm run preview       # Preview production build
```

Edge functions deploy via InsForge CLI (see AGENTS.md):
```bash
# Example (requires insforge-cli setup)
insforge functions deploy keyword-research --project-ref zchqu92m
```

---

## 9. Next Priority Tasks

1. ✅ **WordPress One-Click Connection** — Plugin + edge functions + UI wizard (code complete; deploy functions & test)
2. **Content Quality Enhancement** — Implement two-pass generation, SERP analysis, style selection
3. **Stripe Integration** — Real checkout + customer portal sessions
4. **Real Keyword API** — Hook up Ahrefs/Semrush for accurate volume/difficulty data
5. **Email Automation** — Wire up email_queue with edge function + cron trigger
6. **Content Editor** — Allow users to edit generated HTML before publishing
7. **Image Generation** — Integrate DALL-E or Unsplash for featured images

---

## 10. Changelog

| Date | Change | Commit |
|------|--------|--------|
| 2026-05-26 | Initial schema + auth + keyword research + content generator | `bf8438c` |
| 2026-05-29 | One-click WordPress connection wizard + plugin + edge functions | `c79139c` |
| 2026-05-30 | Rebranded all "RankAI" references to "SEOtool.to" across entire codebase | |

