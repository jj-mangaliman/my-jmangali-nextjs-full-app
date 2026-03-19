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

| Character | Email | Auth0 Role | Can Do |
|-----------|-------|-----------|--------|
| Monica | `monica-admin+jm@gmail.com` | Admin | Everything — writes policies, deletes users, reads logs |
| Rachel | `rachel-editor+jm@gmail.com` | Editor | Read + write policies, NO destructive actions |
| Phoebe | `phoebe-viewer+jm@gmail.com` | Viewer | Read only |

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

## Setup Checklist

| Task | Status |
|------|--------|
| Create Monica in Auth0 dashboard | ⏳ Pending |
| Create Rachel in Auth0 dashboard | ⏳ Pending |
| Create Phoebe in Auth0 dashboard | ⏳ Pending |
| Verify emails via Gmail | ⏳ Pending |
| Enable FGA on Auth0 tenant | ⏳ Pending |
| Define FGA authorization model | ⏳ Pending |
| Create FGA tuples for each user | ⏳ Pending |
| Test Phoenix respects FGA decisions | ⏳ Pending |
