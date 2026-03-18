# Claude (Phoenix) Integration — Build Notes

## The Big Picture

We are building an **AI-powered compliance advisor** for developers and product teams.

A user logs into the app, then interacts with **Phoenix** (Claude) to answer one core question:

> *"I have this frontend requirement — does it conflict with NIST standards,
> is it supported in Auth0, and if so, how do I configure it?"*

Think of it as a **smart checklist tool** that sits between your business idea
and your Auth0 dashboard — it tells you if what you want to build is:

1. **NIST compliant** (does it meet federal identity & access management standards?)
2. **Available in Auth0** (does Auth0 have a feature that covers this?)
3. **Configurable** (here's exactly how to set it up)

### Example User Journey

1. User logs in via Auth0
2. They land on the Phoenix chat page
3. They type something like:
   > *"We want users to stay logged in for 30 days without re-authenticating"*
4. Phoenix responds with:
   - Whether that conflicts with NIST 800-63B session guidelines
   - Whether Auth0 supports it (yes — via session lifetime settings)
   - How to configure it in the Auth0 dashboard

---

## Where This Task Fits

```
[ User logs in ]
      ↓
[ Lands on /chat page ]       ← we are building this
      ↓
[ Types a business requirement ]
      ↓
[ Phoenix checks it against:
    - NIST standards knowledge
    - Auth0 feature knowledge  ]  ← Phoenix's system prompt will encode this
      ↓
[ Streams back a structured answer ]
```

This Claude integration is the **core feature** of the app.
Everything else (login, layout, navbar) is infrastructure that supports it.

---

## What Was Done — Play by Play

### Step 1: Explored the Project

Before touching anything, I read through the codebase to understand:

- App uses **Next.js 15 with App Router** (newer folder-based routing)
- **Auth0 v4** is already fully wired up — login, logout, session, middleware
- Middleware already **blocks unauthenticated users** from all routes
- There's an existing protected API route (`/api/shows`) we can model the chat route after

---

### Step 2: Installed the Anthropic SDK

```bash
npm install @anthropic-ai/sdk
```

This is the official package that lets your Next.js app talk to Claude.
Think of it as the phone line between your app and Claude's brain.

---

### Step 3: Added the API Key Placeholder to `.env.local`

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

`.env.local` is a **secret config file** — your app reads it at startup but it
never gets pushed to GitHub. The API key is your credential to use Claude.

> ⚠️ **Replace `your_anthropic_api_key_here` with your real key.**
> Get it from: https://console.anthropic.com
> Never commit this key to GitHub.

---

### Step 4: Create the Chat API Route — `/app/api/chat/route.js`

This is the **backend endpoint** that:

1. Checks the user is logged in (via Auth0 session)
2. Receives the conversation messages from the frontend
3. Calls Claude's API with a custom **system prompt** that tells Phoenix to:
   - Evaluate requirements against NIST standards
   - Check Auth0 feature availability
   - Explain how to configure it
4. **Streams** the response back token by token (so the answer appears live, not all at once)

**What was built:**

- File: `/app/api/chat/route.js`
- Auth guard using `auth0.getSession()` — same pattern as `/api/shows`
- Uses `claude-opus-4-6` model with streaming via `client.messages.stream()`
- Phoenix's system prompt is baked directly into this file (see Step 4a below)
- Returns a `ReadableStream` so the browser receives text as it's generated

#### Step 4a: Phoenix's System Prompt

The system prompt is what gives Phoenix its expertise. It instructs Phoenix to always respond in **three structured sections**:

```
### NIST Assessment
Is the requirement compliant, conflicting, or out of scope for NIST 800-63B?
Cite specific guidelines where applicable.

### Auth0 Support
Yes / Partially / No — what Auth0 feature covers this?

### How to Configure in Auth0
Step-by-step: dashboard paths, setting names, or code snippets.
```

*Status: ✅ Done*

---

### Step 5: Create the Chat UI — `/app/chat/page.jsx`

This is the **frontend page** the user interacts with after login:

- Text input to describe their business requirement
- Streaming response display (answer appears word by word, like ChatGPT)
- Conversation history maintained — users can ask follow-up questions
- Blinking cursor shown while Phoenix is thinking
- Example prompt shown on load to guide first-time users
- Styled using existing Bootstrap/reactstrap classes already in the project

**How streaming works on the frontend:**

1. User submits a message
2. A `POST` request is sent to `/api/chat` with the full conversation history
3. The response body is read as a **stream** (chunk by chunk)
4. Each chunk is decoded and appended to the assistant message in real time
5. React re-renders on every chunk — so the answer appears live

*Status: ✅ Done*

---

## Current Status

| Task | Status |
|------|--------|
| Explore project structure | ✅ Done |
| Install `@anthropic-ai/sdk` | ✅ Done |
| Add `ANTHROPIC_API_KEY` to `.env.local` | ✅ Done (needs real key) |
| Create `/app/api/chat/route.js` | ✅ Done |
| Craft Phoenix system prompt (NIST + Auth0 knowledge) | ✅ Done |
| Create `/app/chat/page.jsx` | ✅ Done |

## One Thing Left To Do

Replace the placeholder in `.env.local` with your real Anthropic API key:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here  ← replace this
```

Get your key from: https://console.anthropic.com

Then run:

```bash
npm run dev
```

And visit: `http://localhost:3000/chat`
