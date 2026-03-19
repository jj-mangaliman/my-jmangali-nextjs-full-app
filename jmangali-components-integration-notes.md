# Components Integration Notes

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
`auth0.getSession()` was called without the `request` object. In Auth0 v4
App Router, the request must be passed explicitly:
```js
// Before (broken)
const session = await auth0.getSession();

// After (fixed)
const session = await auth0.getSession(request);
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

## Still To Do

| Task | Status |
|------|--------|
| Push all changes to GitHub | ⏳ Pending |
| Add `ANTHROPIC_API_KEY` to Vercel env vars | ⏳ Pending |
| Test Phoenix end-to-end on Vercel | ⏳ Pending |
| Test live data fetch (Auth0 changelog + NIST) | ⏳ Pending |
| Create Monica, Rachel, Phoebe in Auth0 | ⏳ Pending |
| Enable FGA on Auth0 tenant | ⏳ Pending |
