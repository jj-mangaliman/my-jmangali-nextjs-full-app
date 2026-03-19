# Architecture Decisions & Rationale

## The App in One Sentence

An AI-powered compliance advisor where users log in, describe a frontend authentication requirement,
and Phoenix (Claude) tells them if it conflicts with NIST standards, whether Auth0 supports it,
and how to configure it — and eventually, just does it for them.

---

## The Stack & Why

### Next.js (Fullstack Framework)
- Handles both frontend (pages) and backend (API routes) in one codebase
- No separate Express server needed
- Single deployment to Vercel
- Auth0 v4 SDK integrates natively via middleware

### Auth0 (Identity Provider)
- Handles all authentication — login, logout, session management
- Two types of cookies in play:
  - **IdP session cookie** — lives on `auth0.com`, enables SSO across apps
  - **App session cookie** — lives on `yourapp.com`, set by Auth0 SDK, read by `auth0.getSession(request)`
- App session cookie is `HttpOnly` + `Secure` by default — NIST aligned out of the box

### Claude / Phoenix (AI Advisor)
- Accessed via `@anthropic-ai/sdk`
- API key stored in `.env.local` (never committed to GitHub)
- System prompt baked into `/app/api/chat/route.js` — instructs Phoenix to always respond in three sections:
  - NIST Assessment
  - Auth0 Support
  - How to Configure in Auth0
- Responses streamed token by token (like ChatGPT) via `ReadableStream`

---

## The Three Auth0 Tooling Repos & When to Use Each

| Repo | What it does | When to use |
|------|-------------|-------------|
| `terraform-provider-auth0` | Manages Auth0 config via Terraform HCL | When Auth0 is part of a larger infra (AWS, GCP, DNS) — enterprise DevOps |
| `auth0-deploy-cli` | Manages Auth0 config via JSON/YAML files | Auth0-only CI/CD pipelines — Auth0-focused teams |
| `auth0-mcp-server` | Lets AI (Phoenix) call Auth0 Management API directly | AI-assisted config — no files, live API calls |

All three talk to the same Auth0 Management API. Different hands, same wall.

---

## Why auth0-fastmcp-fga Over auth0-mcp-server Alone

`auth0-mcp-server` gives Phoenix a master key — anyone who can talk to Phoenix
can do anything to any tenant. No user-level restrictions.

`auth0-fastmcp-fga` adds FGA (Fine-Grained Authorization) as a security gate
before any action is executed. Phoenix must ask "am I allowed?" first.

### The Scenario That Made This Decision Clear

```
Dick  → writer → tenant:1  ✅
Dick  → writer → tenant:2  ✅
Tom   → writer → tenant:1  ✅
Tom   → writer → tenant:2  ❌
Harry → reader → tenant:1  ✅
Harry → reader → tenant:2  ✅
```

- Dick says "apply NIST session timeout to tenant 2" → FGA says ✅ → Phoenix does it
- Tom says "apply NIST session timeout to tenant 2" → FGA says ❌ → Phoenix refuses

Phoenix doesn't make the access decision — **FGA does**.
This means:
- Phoenix can't be tricked into bypassing permissions
- Access rules can change without touching Phoenix's code
- Every action is auditable

---

## What is FGA (Fine-Grained Authorization)

FGA is Auth0's relationship-based access control system (based on Google Zanzibar / OpenFGA).

Every permission is a **tuple**:
> **who** can do **what** to **which thing**

Think of it like Google Docs sharing — but instead of documents, the objects are Auth0 tenants.
You can change who has access to what without touching application code.

---

## Full Target Architecture

```
User (Tom / Dick / Harry)
        │
        ▼
Next.js app — Phoenix chat UI (/askphoenix)
        │
        ▼
Phoenix (Claude — NIST + Auth0 knowledge)
        │
        ▼
auth0-fastmcp-fga
(MCP server built with FastMCP + protected by Auth0 FGA)
        │                    │
        ▼                    ▼
Auth0 Management API    FGA policy check
(executes the change)   (approves the change)
```

---

## Current Build Status

| Component | Status |
|-----------|--------|
| Next.js app with Auth0 login | ✅ Done |
| Phoenix chat UI at `/askphoenix` | ✅ Done |
| `/api/chat` route with streaming | ✅ Done |
| NIST + Auth0 system prompt | ✅ Done |
| Navbar link "Ask Phoenix" | ✅ Done |
| Push to GitHub + Vercel deploy | ⏳ Pending |
| Wire in `auth0-fastmcp-fga` | ⏳ Next phase |
| Define FGA policy model (tenants) | ⏳ Next phase |
| Connect FGA to user sessions | ⏳ Next phase |
