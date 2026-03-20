# Components Integration Notes

## Problem Statement

Developers and product teams building on Auth0 face a recurring challenge:
they have a frontend business requirement but don't know whether it conflicts
with NIST 800-63B identity standards, and if not, whether Auth0 supports it
and how to configure it. This requires cross-referencing NIST documentation,
Auth0 docs, and implementation guides — a slow, fragmented process.

## Solution We're Exploring

An AI-powered compliance advisor — **Phoenix** — embedded directly into a
Next.js app behind Auth0 login. A user describes their requirement in plain
English and Phoenix responds in three structured sections:

1. **NIST Assessment** — does it comply, conflict, or fall outside scope?
2. **Auth0 Support** — yes / partially / no, and which feature covers it?
3. **How to Configure in Auth0** — step-by-step guidance

Phase 1 (current): Phoenix answers from training knowledge.
Phase 2 (next): Phoenix fetches live Auth0 changelog and NIST OSCAL data.
Phase 3 (future): Phoenix connects to Auth0 via MCP server and FGA to
actually apply configuration changes on behalf of authorized users.

---

## Overview

This document tracks the UI and component changes made to the Next.js app
after the initial Claude (Phoenix) integration was complete.

---

## Changes Made

### 1. Ask Phoenix Page — `/app/askphoenix/page.jsx`

**What:** Replaced the boilerplate CSR (Client-Side Rendered) page with the Phoenix chat UI.

**Why:** The CSR page was the right home for Phoenix — it's already protected by Auth0,
already client-side, and already in the navbar for logged-in users.

**What it does:**
- Text input for the user to describe a business requirement
- Streams Phoenix's response word by word (like ChatGPT)
- Maintains full conversation history for follow-up questions
- Shows blinking cursor while Phoenix is thinking
- Example prompt shown on first load

**Route:** `/askphoenix` (renamed from `/csr`)

---

### 2. Renamed Route from `/csr` to `/askphoenix`

**What:** Renamed the folder `app/csr/` → `app/askphoenix/`

**Why:** `/csr` is a technical label that means nothing to a user.
`/askphoenix` is self-explanatory.

---

### 3. Navbar — Updated Two Labels

| Before | After | Route |
|--------|-------|-------|
| Client-side rendered page | Ask Phoenix | `/askphoenix` |
| Server-side rendered page | User Profile | `/ssr` |

Both labels now reflect what the page actually does, not how it's rendered.

---

### 4. User Profile Page — `/app/ssr/page.jsx`

**What:** Replaced the boilerplate SSR page (raw JSON dump) with a proper
user profile page that displays Auth0 ID token claims in a clean UI.

**Why SSR is the right choice here:**
The user data lives in the session cookie on the server. `auth0.getSession()`
decodes it server-side — no round trip to Auth0, no loading state, page
arrives fully rendered.

**What it shows:**
- Profile picture (rounded)
- Name, email, email verification badge (green/red)
- ID Token Claims table — every claim including any custom Auth0 claims
- Raw JSON view (collapsed by default, expandable)

**Page copy:**
> *"Your session information and ID token claims are below. Rendered from
> server-side for enhanced security and SEO benefits."*

---

### 5. Chat API Route — `/app/api/chat/route.js`

**Two fixes/upgrades made:**

#### Fix: Auth0 Session Bug
`auth0.getSession()` was incorrectly called with `request` as a parameter.
In Auth0 v4 App Router API routes, `getSession()` uses Next.js cookies()
internally — no argument needed:
```js
// Before (broken — caused 405 Method Not Allowed)
const session = await auth0.getSession(request);

// After (fixed)
const session = await auth0.getSession();
```

#### Upgrade: Live Data via web_fetch Tool
Added Anthropic's server-side `web_fetch` tool so Phoenix can fetch
fresh data instead of relying solely on training knowledge.

Phoenix is instructed to fetch from:
- `https://auth0.com/changelog/atom.xml` — latest Auth0 features and changes
- `https://raw.githubusercontent.com/usnistgov/OSCAL/main/README.md` — current NIST controls

The simple one-shot stream was replaced with an **agentic loop** that handles
`pause_turn` (when a tool fetch needs multiple steps), up to 5 continuations.

---

## Current Navbar Structure (Logged-in Users)

```
[ Yellow Umbrella Logo ]  [ Home ]  [ Ask Phoenix ]  [ User Profile ]  [ External API ]  [ Avatar ▾ ]
```

---

## File Map

| File | Purpose |
|------|---------|
| `app/askphoenix/page.jsx` | Phoenix chat UI (CSR) |
| `app/ssr/page.jsx` | User profile + ID token claims (SSR) |
| `app/api/chat/route.js` | Backend — Auth0 check, Claude API, streaming |
| `components/NavBar.jsx` | Navbar with updated labels |

---

## Debugging Log — Ask Phoenix 500 Errors

### What We Saw
`POST /api/chat` returning 500 errors on Vercel with the message:
```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```
The frontend was receiving an HTML error page instead of a stream.

### What We Ruled Out
| Suspect | How we ruled it out |
|---------|-------------------|
| Missing API key | Added a `GET` debug endpoint — confirmed key present with prefix `sk-ant-api` |
| Auth0 session bug | Fixed early — `auth0.getSession(request)` needs `request` passed explicitly in Auth0 v4 |
| Wrong code deployed | Confirmed via Vercel deployment logs that latest commits were live |
| Timeout | Added `export const maxDuration = 60` to extend function limit from 10s to 60s |
| web_fetch tool error | Temporarily removed tool — error persisted, ruled out |

### Root Cause
Added `console.log` step markers to the POST handler. Vercel logs revealed:
```
[chat] stream error: 400 {"type":"error","error":{"type":"invalid_request_error",
"message":"Your credit balance is too low to access the Anthropic API."}}
```
**Phoenix was broke.** Zero Anthropic API credits. The SDK threw a 400 error
inside the `ReadableStream` which Vercel surfaced as a generic 500.

### Solution
Top up credits at **console.anthropic.com → Plans & Billing**.

### Code State After Debugging
All diagnostic code removed. Route restored to full production state:
- `export const maxDuration = 60` — kept (correct for streaming AI responses)
- `web_fetch` tool — restored
- Agentic loop — restored
- System prompt — restored

---

### 7. UI Copy + Responsiveness — `/app/askphoenix/page.jsx`

**What:** Updated the page copy and made the chat UI responsive.

**Copy changes:** Heading updated to "Got a question for Phoenix?", paragraph replaced with a friendlier, security-focused description, and the input placeholder updated to "Type something. We'll try our best to guess what you mean."

**Responsiveness:** Swapped fixed pixel heights on the chat box for viewport-relative units (`50vh`/`65vh`), added a `<style>` block with media queries so the form stacks vertically on mobile (`≤576px`), and ensured the outer wrapper fills narrower screens with `width: 100%`.

**GFM Tables:** Installed `remark-gfm` and passed it as a plugin to `<ReactMarkdown>` so tables, strikethrough, and other GitHub Flavored Markdown elements render properly instead of appearing as raw symbols.

---

### 6. Markdown Rendering — `/app/askphoenix/page.jsx`

**What:** Installed `react-markdown` and replaced raw text rendering of
Phoenix's responses with proper markdown rendering.

**Why:** Phoenix structures every response with `###` headings and `**bold**`
text. Without a renderer, these appear as raw symbols — ugly and hard to read.

**What changed:**
- `npm install react-markdown`
- Imported `ReactMarkdown` into the chat page
- User messages render as plain text (correct — they're just questions)
- Assistant messages render via `<ReactMarkdown>` (headings, bold, lists all work)
- Removed `whiteSpace: 'pre-wrap'` from assistant bubbles (no longer needed)
- Cleaned up unused `user` variable from `useUser()` destructuring

---

---

## How to Write a Good Commit Message

Good commits answer three questions — in this order:

**WHY** (the problem) → **WHAT** (what you changed) → **HOW** (the detail)

The *why* is the most important and the most skipped. The diff already shows what changed — only the commit message can explain why you changed it.

| Part | Question it answers | Example |
|---|---|---|
| **WHY** | What was broken or needed? | Auth0 atom.xml feed was blocked by their servers |
| **WHAT** | What did you change? | Switched changelog URL to /changelog page |
| **HOW** | Where/how specifically? | Updated system prompt in route.js |

Rolled into one line:
```
fix Auth0 changelog URL — atom.xml blocked, switched to /changelog
```

For bigger changes, use the headline + body format:
```
fix Auth0 changelog URL — atom.xml blocked, switched to /changelog

- atom.xml was returning 403 for programmatic requests
- /changelog page is publicly accessible and returns full content
- Updated system prompt in app/api/chat/route.js
```

**The rule:** the code shows *what* changed. The commit message must explain *why you changed it*. Future you at 11pm will thank present you.

---

## Still To Do

| Task | Status |
|------|--------|
| Push all changes to GitHub | ⏳ Pending |
| Add `ANTHROPIC_API_KEY` to Vercel env vars | ✅ Done |
| Test Phoenix end-to-end on Vercel | ✅ Working |
| Add Anthropic API credits | ✅ Done |
| Markdown rendering for Phoenix responses | ✅ Done |
| GFM table rendering (`remark-gfm`) | ✅ Done |
| Responsive chat UI (viewport-relative heights, mobile form stack) | ✅ Done |
| Updated Ask Phoenix page copy | ✅ Done |
| Test live data fetch (Auth0 changelog + NIST) | ⏳ Pending |
| Create Monica, Rachel, Phoebe in Auth0 | ⏳ Pending |
| Enable FGA on Auth0 tenant | ⏳ Pending |
