# Atheris AI — Complete Build (Phases 1–6)

This is the full, final project — every phase built, cumulative, in one codebase.

Verified at every phase: `npx tsc --noEmit` → 0 errors. `next build` → compiles cleanly,
0 errors. Verified again after Phase 5 with all features together.

## Quickstart

New here? Skip to **Setup** near the bottom — it's one ordered list covering Supabase,
storage, migrations, admin, and API keys end to end.

## Phase 1: Foundation

- **Auth**: Sign Up (Full Name, Gmail, Password, Confirm Password + Google/GitHub OAuth),
  Login (Gmail, Password + Google/GitHub OAuth), forgot-password flow, email verification
- **Minimal UI**: light/dark theme (no flash on load), clean Tailwind design system
- **Chat core**: streaming responses, stop/regenerate, markdown + syntax-highlighted code
  blocks with copy button, model selector (Atheris / Atheris Pro / Atheris Vision)
- **AI router** (`lib/ai-router.ts`): maps public "Atheris" brand names to real free-tier
  providers (Groq, Gemini) with silent fallback — real model/provider names never reach
  the client, logs, or error messages
- **Credit system** (`lib/credits.ts`): per-message credit deduction, monthly reset,
  blocks requests before they hit an upstream provider once a user is out of credits
- **Database schema** (`supabase/migrations/0001_init.sql`): profiles, conversations,
  messages tables with Row Level Security so users can only ever see their own data
- **Middleware**: protects `/dashboard`, `/settings`, `/admin` routes; redirects logged-in
  users away from `/login` and `/signup`

## Phase 2: Conversation History + Settings/Profile

- **Persistent conversation history**: real sidebar wired to Supabase — every chat is
  saved, auto-titled from your first message, searchable, renameable, pinnable, deletable
- **`/api/conversations`**: list + create conversations
- **`/api/conversations/[id]`**: get messages, rename, pin/unpin, delete
- **`/api/chat` updated**: now persists both the user's message and the streamed
  assistant reply to the database as it streams (via a `TransformStream` tap — the
  client still gets the live stream, nothing is delayed)
- **Settings page** (`/settings`), tabbed:
  - **Profile** — edit name, view email, live usage bar (credits used / remaining /
    reset date)
  - **Account Security** — change password, view connected OAuth providers
  - **Preferences** — theme toggle, default model selection (saved to browser)
  - **Privacy & Data** — delete account (permanently removes user + all conversations/
    messages via cascade), with a confirm step
- **`/api/profile`**: get/update profile, delete account (uses a Supabase service-role
  client — see setup step 6 below, required only for account deletion)

## Phase 3: Image Generation + File/Image Upload

- **Atheris Image tab** (`/dashboard/image`): text-to-image generation via Gemini's
  image model, with a history grid of past generations (stored in a new
  `generated_images` table) and one-click download
- **Basic prompt moderation** (`lib/image-router.ts`): blocks obviously disallowed
  prompts (e.g. sexualized content involving minors) before they ever reach the
  provider, plus honors the provider's own safety block if it still refuses. This is
  a first line of defense, not a complete moderation system — see the note in that
  file before a real launch
- **Image upload in chat**: paperclip button in the composer, image previews before
  sending, 4MB size limit client-side validation, images/*-only filter
- **Auto vision routing**: if any message in a request carries an image, the backend
  silently routes through Atheris Vision (the only chain that can actually see images)
  regardless of which model tile was selected — so uploads never silently fail against
  a model that can't read them
- **Images now persist** with their message (new `images` jsonb column on `messages`,
  migration `0002_images.sql`) — reopening a past conversation shows attached images
- Credit cost for image generation: 5 credits per image (`lib/credits.ts`)

## Phase 4: Admin Panel + Document Generation

**Admin Panel** (`/admin`), tabbed:
- **Overview** — total users, conversations, messages, images generated, total credits
  remaining across all users (watch this against your free-tier API limits)
- **Users** — search, view credit balance and join date, manually adjust a user's
  credits, suspend/reinstate an account (suspended users are blocked at the same
  chokepoint that enforces credit limits, so it applies everywhere immediately)
- **Moderation** — flagged image generations awaiting review, mark-reviewed action
- **Announcements** — post a banner all signed-in users see (e.g. "Atheris Pro
  temporarily limited"), deactivate when resolved

Admin routes are gated two ways: the page itself checks `profiles.is_admin` and shows
an "Access required" screen if false, and every `/api/admin/*` route independently
re-checks admin status server-side before touching data — so it's not just a hidden
UI link. **You need to manually make your first admin** — see setup step 3 below.

**Atheris Documents** (`/dashboard/documents`): describe what you need, pick a format
(Word / PowerPoint / Excel / PDF), and Atheris drafts real, structured content and
renders it into an actual downloadable file — not just text pasted into a template.
Word and PDF get proper headings/bullets; PowerPoint gets a title slide plus one slide
per section; Excel gets a two-column structured table. Cost: 8 credits per document.

## Phase 5: Final Feature Set

- **Avatar upload** — Settings › Profile, click the camera icon on your avatar. Requires
  a Supabase Storage bucket named `avatars` (public) — see setup step 3 below
- **Voice input** — mic button in the composer, using the browser's native
  SpeechRecognition API (Chrome/Edge/Safari support it; no API key, no cost, fully free)
- **Text-to-speech** — "Listen" button under any assistant reply, using the browser's
  native SpeechSynthesis API (same: free, no backend call)
- **Saved prompt templates** — bookmark icon in the composer: save your current input
  as a reusable template, or pick a saved one to insert
- **Referral system** — Settings › Referrals shows your personal invite link; when
  someone signs up through it, you both get +30 credits automatically (enforced in the
  signup DB trigger, not just client-side)
- **Shareable chat links** — "Share" in a conversation's ⋯ menu generates a public,
  read-only link and copies it to your clipboard; anyone with the link can view that
  conversation without signing in (`/share/[slug]`)
- **Export chat** — download icon in the chat header exports the current conversation
  as a clean Markdown file
- **Folders/projects** — folder-plus icon next to "New chat" to create a folder; move
  any conversation into one via its ⋯ menu

**Deliberately not built: image editing (inpainting/background removal).** Free-tier
Gemini and Groq don't expose that capability — the models available for free either
generate a whole new image from a prompt or don't touch image editing at all. Building
a fake version that silently produces poor results would be worse than not having the
feature. If you want real inpainting/background removal later, that needs either a paid
API (e.g. Stability AI, Replicate) or a self-hosted model — worth a dedicated
conversation when you're ready for that cost trade-off.

## Phase 6: Bug Fixes + New Sections + Contact/Docs

**Bug fixes:**
- **Fixed intermittent login/chat failures** ("works 1 in 3 times", "hi → please sign up
  again"): the middleware was only saving refreshed sessions to the outgoing response,
  not to the request continuing on to API routes — so routes occasionally saw a stale,
  expired session. This was very likely your root cause. Fixed in `middleware.ts`, and
  it now also covers all API routes (chat, conversations, images, documents, profile,
  folders, templates), not just page routes.
- **Admin panel is now hidden from non-admins** — the sidebar only shows the Admin link
  if your account's `is_admin` flag is true. The admin API routes still independently
  verify admin status server-side regardless (defense in depth).
- **Fixed a real breaking bug in the old 3-model system**: Google removed Gemini Pro
  from its free tier in April 2026; the old code still pointed "Atheris Pro" at it,
  which would have failed for you. Replaced entirely — see below.

**Dynamic model catalog** (replaces the old hardcoded 3-model list):
- The app now fetches the **live** model list from Groq and Gemini at runtime,
  classifies each by real capability (lite/balanced/pro/coder/vision — inferred from
  size, context, and naming), and assigns an Atheris-branded name automatically
- You get the **full current free lineup** from both providers, not just 2-3 fixed
  options — model names/IDs are never exposed to the client, only the Atheris brand
  name (`lib/model-catalog.ts`)
- If one provider errors, requests automatically fall back to the other provider's
  balanced-tier model
- Credit cost per message now scales with tier (lite/balanced = 1, coder/vision = 2,
  pro = 3) instead of a fixed per-model cost

**Three new sections** — Coding, Daily Life, Business — each with its own system
prompt and its own separate conversation history (new `section` column on
`conversations`, migration `0005_sections.sql`). All six sections (Chat, Image,
Documents, Coding, Daily Life, Business) now share one consistent tab bar
(`components/SectionTabs.tsx`).

**Landing page** — expanded with a features grid, a "why Atheris" section, and a
footer linking to Docs, Contact, Login, and Sign up.

**Docs page** (`/docs`) — explains every section and answers common questions.

**Contact page** (`/contact`) — icon-only official-style brand links (WhatsApp,
Instagram, GitHub, Email — no text, click to open) plus a contact form (First Name,
Last Name, Phone, Email, Message) that emails your inbox via Resend (`/api/contact`).

## Fixing your two remaining issues — dashboard configuration only, no code

These two are **not fixed by code** — they're Supabase dashboard settings that need
to match your real deployed URL, and an email provider swap. Both are one-time setup:

**1. "Verification link goes to localhost"**
- Supabase Dashboard → **Authentication → URL Configuration**
- Set **Site URL** to your real deployed URL (e.g. `https://atheris-ai-yourname.vercel.app`)
- Add the same URL + `/**` under **Redirect URLs**
- Save. New confirmation emails will now link to your real site.

**2. "Confirmation email never arrives"** — Supabase's built-in email sender is
rate-limited and unreliable at any real usage. Fix: connect Resend (same free service
used for the Contact form) as your custom SMTP provider:
- Supabase Dashboard → **Project Settings → Auth → SMTP Settings** → enable
  **Custom SMTP**
- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: your Resend API key (same one in `RESEND_API_KEY`)
- Sender email: `onboarding@resend.dev` (works without owning a domain — fine for
  this scale; if you later buy a custom domain, verify it in Resend for a branded
  sender address)
- Sender name: `Atheris AI`
- Save, then test by signing up with a new email

## Known security notes (be aware before a real launch)

`npm audit` flags a few transitive advisories that I'm surfacing rather than silently
ignoring:
- **Next.js 14.2.35** (the latest 14.x release) still carries a handful of disclosed
  advisories whose fixes require jumping to Next.js 15/16 — a breaking major-version
  upgrade I haven't tested against this codebase. Worth doing deliberately, with
  testing, before a public launch rather than blindly forcing it now.
- **`uuid@8.3.2`** (pulled in transitively by `exceljs`) has a moderate advisory in its
  `v3/v5/v6` functions when called with a user-supplied buffer — `exceljs` doesn't use
  that code path internally, so exposure here is low, but it's worth re-checking with
  `npm audit` periodically as both packages update.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Supabase project** (free) at https://supabase.com
   - Go to Project Settings → API, copy the URL and anon key into `.env.local`
     (copy `.env.example` to `.env.local` first)
   - Go to SQL Editor, paste and run `supabase/migrations/0001_init.sql`, then
     `0002_images.sql`, then `0003_admin.sql`, then `0004_phase5.sql`, then
     `0005_sections.sql`, in that order
   - Go to Authentication → Providers, enable Google and GitHub, and enter the
     Client ID/Secret you generate from:
     - Google: https://console.cloud.google.com/apis/credentials
     - GitHub: https://github.com/settings/developers
   - Set the OAuth redirect URL (both providers) to:
     `https://<your-supabase-project>.supabase.co/auth/v1/callback`
   - Go to Authentication → URL Configuration → set **Site URL** to your real deployed
     URL (not localhost) and add it + `/**` under Redirect URLs

3. **Create the avatar storage bucket**
   - Supabase Dashboard → Storage → New bucket
   - Name: `avatars`, Public bucket: **on**
   - Needed for Settings → Profile avatar upload; without it, avatar upload shows a
     clear error instead of failing silently

4. **(Optional but recommended) Enable account deletion**
   - Supabase Dashboard → Project Settings → API → copy the `service_role` key
   - Add it to `.env.local` as `SUPABASE_SERVICE_ROLE_KEY` — **never expose this to the
     client or commit it**; it's only read server-side in `/api/profile`'s DELETE handler
   - Without it, "Delete account" in Settings will return a clear error instead of
     silently failing

5. **Make yourself an admin**
   - Sign up in the app once, then in Supabase's SQL Editor run:
     `update profiles set is_admin = true where id = '<your-user-uuid>';`
     (find your user id in Supabase Dashboard → Authentication → Users)
   - You'll then see the Admin link in the sidebar (hidden for everyone else)

6. **Get free AI API keys**
   - Groq (free tier, fast): https://console.groq.com → API Keys
   - Gemini (free tier): https://aistudio.google.com/app/apikey
   - Paste both into `.env.local`

7. **Set up Resend** (free, powers the Contact form and, optionally, reliable auth
   emails — see "Fixing your two remaining issues" above)
   - Sign up free at https://resend.com → API Keys → create one → paste into
     `.env.local` as `RESEND_API_KEY`
   - Also add it to your Vercel environment variables when you deploy

8. **Run locally**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000

9. **Deploy** (Railway or Vercel both work — Vercel has the smoothest Next.js free tier)
   - Push this repo to GitHub
   - Connect it in Railway/Vercel, add the same 4 environment variables from
     `.env.local` in the dashboard's environment settings
   - Deploy

## Logo

Your logo is integrated. The icon mark (book + code brackets + infinity coil) was
extracted from your uploaded logo with the background removed and placed in a
circular badge — it's live in `/public/logo-icon.png` and used across the landing
page, login, signup, verify-email, chat empty state, sidebar, share page, and as the
browser favicon (`/public/favicon.ico`, `icon-192.png`, `icon-512.png`). The full
lockup (icon + "ATHERIS AI" wordmark), also background-removed, sits at
`/public/logo-full.png` if you want it for a marketing page or loading screen later —
it isn't wired into any UI yet since the small badge slots only fit the icon mark.

## Notes on free-tier reliability

Free API tiers (Groq, Gemini) enforce rate limits that can change without notice. The
router already falls back between providers automatically, and the credit system stops
requests before they hit those limits — but "zero errors" long-term also depends on
providers not changing their free-tier terms. Worth monitoring once live.
