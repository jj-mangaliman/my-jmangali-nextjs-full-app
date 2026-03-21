# The One About Friends
## Test User Strategy & FGA Role Mapping

---

## Why Friends?

We needed test users with distinct permission levels to validate the FGA role-based
access control story. The Friends cast mapped perfectly to Auth0 roles — and everyone
knows who they are.

---

## The Constraint

Auth0 free tier = 1 tenant only.

Original plan was multi-tenant (who can touch which tenant).
Pivoted to **role-based** (who can do what action within the same tenant).
Actually a richer demo — more granular, more realistic.

---

## The Cast & Their Access

| Character | Email | FGA Role | Can Do |
|-----------|-------|-----------|--------|
| Jennifer (you) | `jennifer.mangaliman@torontomu.ca` | Godmode | Everything, no restrictions |
| Monica | `monica-admin+jm@gmail.com` | Admin | Most things — blocked from users, Universal Login, encryption keys |
| Rachel | `rachel-editor+jm@gmail.com` | Editor | Universal Login R/W only |
| Phoebe | `phoebe-viewer+jm@gmail.com` | Viewer | Logs read only |

---

## FGA Tuples

```
monica → can:write_policies    → tenant:1  ✅
monica → can:delete_users      → tenant:1  ✅
monica → can:read_logs         → tenant:1  ✅

rachel → can:write_policies    → tenant:1  ✅
rachel → can:delete_users      → tenant:1  ❌
rachel → can:read_logs         → tenant:1  ✅

phoebe → can:write_policies    → tenant:1  ❌
phoebe → can:delete_users      → tenant:1  ❌
phoebe → can:read_logs         → tenant:1  ✅
```

---

## The Phoenix Test Scenarios

- Monica says "delete all inactive users" → FGA ✅ → Phoenix does it
- Rachel says "delete all inactive users" → FGA ❌ → Phoenix refuses
- Phoebe says "show me the login failure logs" → FGA ✅ → Phoenix shows her
- Phoebe says "update the session timeout policy" → FGA ❌ → Phoenix refuses

---

## The Gmail Alias Setup

All three emails route to jennifer.mangaliman@gmail.com via Gmail subaddressing.
The `+jm` tag ensures delivery to the right inbox. No new accounts needed.

To find emails in Gmail, search:
```
to:monica-admin+jm
to:rachel-editor+jm
to:phoebe-viewer+jm
```

---

## Bench (Available if needed)

| Character | Suggested Role | Notes |
|-----------|---------------|-------|
| Chandler | Editor | Reliable, gets the job done |
| Joey | Viewer | Has no idea what he's looking at |
| Ross | Admin | Would send 47 page memo demanding access |

---

## Test Cases for Phoenix — Questions to Ask

These questions are designed to verify Phoenix is reading live NIST standards and not just answering from training data. Each one is meant to cross multiple standards so the response should cite specific control IDs.

| # | Question | Standards It Should Hit |
|---|----------|------------------------|
| 1 | "Do we need to enforce MFA for all users in our Auth0 tenant, and is there a compliance reason for it?" | 800-63B (AALs), 800-53 IA family, CSF Protect |
| 2 | "We want to let users stay logged in for 90 days without re-authenticating — is that allowed?" | 800-63B (session/reauthentication), 800-53 AC family |
| 3 | "Our dev team wants to skip MFA in the staging environment — is that a security risk and what does NIST say?" | 800-63B (AAL requirements), 800-218 (SSDF), CSF Protect |
| 4 | "What controls do we need in Auth0 to meet a MODERATE baseline?" | 800-53 MODERATE catalog, CSF — should cite specific control IDs like IA-2, AC-17 |

**Question 4 is the best smoke test.** It's the most explicit multi-standard ask and will immediately reveal whether Phoenix is reading the live 800-53 MODERATE catalog or guessing from training data.

---

## Setup Checklist

| Task | Status |
|------|--------|
| Create Monica in Auth0 dashboard | ✅ Done |
| Create Rachel in Auth0 dashboard | ✅ Done  |
| Create Phoebe in Auth0 dashboard | ✅ Done  |
| Verify emails via Gmail | ✅ Done |
| Enable FGA on Auth0 tenant | ✅ Done |
| Define FGA authorization model | ⏳ Pending |
| Create FGA tuples for each user | ⏳ Pending |
| Test Phoenix respects FGA decisions | ⏳ Pending |
