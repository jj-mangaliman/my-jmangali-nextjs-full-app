# Commands Inventory — jmangali project

A running reference of commands executed across this project, organized by category.
Update this file after each session.

---

## Git Commits

### my-jmangali-nextjs-full-app

| Hash | Date | Description |
|------|------|-------------|
| `1c75285` | 2026-03-23 | feat: nav profile link, tenant name + FGA links on My Permissions page |
| `eeb0763` | 2026-03-23 | docs: update project notes with Task 3 results, bugs found, UI improvements |
| `302d0bf` | 2026-03-23 | feat: make Ask Phoenix chat full-width and responsive across breakpoints |
| `ad0f8af` | 2026-03-23 | fix: greeting is name-only — tenant tools only surfaced when question is tenant-related |
| `103aac8` | 2026-03-23 | fix: stop Phoenix hallucinating tools — explicit rules + named greeting on first message |
| `6a9bd3d` | 2026-03-24 | fix: add missing web-fetch beta flag to Anthropic API call |
| `3242c4c` | 2026-03-24 | fix: remove web_fetch tool to isolate FUNCTION_INVOCATION_FAILED |
| `fc7bed6` | 2026-03-24 | fix: handle stream errors gracefully instead of crashing function |
| `67e3b1c` | 2026-03-24 | fix: only send mcp-client beta flag when MCP server is present |
| `fc8afc6` | 2026-03-24 | test: disable MCP temporarily to isolate Anthropic 500 |
| `ea92d62` | 2026-03-24 | docs: add commands inventory |
| `1405f52` | 2026-03-24 | fix: iterate stream events directly to close response immediately after end_turn |
| `c19fb6b` | 2026-03-24 | feat: nav profile link, tenant name + FGA links on My Permissions page |
| `f90a41c` | 2026-03-24 | feat: Ask Phoenix CTA + one-tool-per-turn rule + loading indicator (3-change commit) |

### auth0-fastmcp-fga

| Hash | Date | Description |
|------|------|-------------|
| `1a4260e` | 2026-03-23 | feat: structured audit logging on all 4 MCP tools |
| `c6ae679` | 2026-03-23 | docs+fix: Issues 5-8, tuple fix, batchCheck replacement, hallucination fix |
| `d163994` | 2026-03-23 | fix: use correlationId to match batchCheck results — stops role swapping bug |
| `e27e4ab` | 2026-03-24 | fix: upgrade fastmcp 3.32 to 3.34 to fix client capabilities handshake |
| `8fb70ff` | 2026-03-24 | fix: switch to stateful HTTP Stream mode — Anthropic remote MCP requires session handshake |
| `65bcdab` | 2026-03-24 | docs: add Issue 9 — FastMCP stateless mode incompatible with Anthropic remote MCP handshake |

> ⚠️ **Important lesson learned 2026-03-24:** Creating a new Azure revision does NOT automatically pick up code changes. You must run `az acr build` first to bake the new code into the image, THEN create the revision. If you create a revision before rebuilding, it pulls the old `latest` tag.

---

## Azure CLI Commands

### Container App — jmangali-auth0-mcp-server

```bash
# List all container apps and their resource groups
az containerapp list --query "[].{name:name, rg:resourceGroup}" -o table

# View live container logs (last 30 lines)
az containerapp logs show \
  --name jmangali-auth0-mcp-server \
  --resource-group cloud-shell-storage-eastus \
  --tail 30

# List revisions with active status and image
az containerapp revision list \
  --name jmangali-auth0-mcp-server \
  --resource-group cloud-shell-storage-eastus \
  --query "[].{name:name, active:properties.active, created:properties.createdTime, image:properties.template.containers[0].image}" \
  -o table

# Update container app to new image
az containerapp update \
  --name jmangali-auth0-mcp-server \
  --resource-group cloud-shell-storage-eastus \
  --image jmangaliacr.azurecr.io/auth0-fastmcp-fga:latest
```

### Azure Container Registry — jmangaliacr

```bash
# Build image from source and push to ACR (run from auth0-fastmcp-fga directory)
az acr build --registry jmangaliacr --image auth0-fastmcp-fga:latest .
```

**Revisions created 2026-03-24:**

| Revision Name | Image rebuilt? | Change | Notes |
|---|---|---|---|
| `jmangali-auth0-mcp-server--fastmcpupgrade` | ✅ Yes | FastMCP 3.32 → 3.34 | Image built before revision — correct |
| `jmangali-auth0-mcp-server--statelessfalsechange` | ❌ No | stateless: true → false | Revision created before image rebuild — old code ran |
| _(pending)_ | ✅ Yes | stateless: false (corrected) | `az acr build` run after discovering the gap |

---

## npm Commands

```bash
# Check latest available version of a package
npm show fastmcp version

# Upgrade FastMCP to latest
cd /path/to/auth0-fastmcp-fga
npm install fastmcp@latest
```

---

## Mac Disk Cleanup Commands

```bash
# Check size of main user folders
du -sh ~/Desktop ~/Downloads ~/Documents ~/Movies ~/Music ~/Pictures

# Check Library folders
du -sh ~/Library/Caches "~/Library/Application Support"

# Top 15 largest items in Application Support
find "~/Library/Application Support/" -maxdepth 1 -type d -exec du -sh {} \; | sort -rh | head -15

# Check overall disk usage
df -h /

# Delete iMazing backups (24GB recovered)
rm -rf "~/Library/Application Support/iMazing/Backups"

# Delete Claude VM bundles and caches (~10GB recovered)
rm -rf \
  "~/Library/Application Support/Claude/vm_bundles" \
  "~/Library/Application Support/Claude/Cache" \
  "~/Library/Application Support/Claude/Code Cache" \
  "~/Library/Application Support/Claude/GPUCache" \
  "~/Library/Application Support/Claude/DawnGraphiteCache" \
  "~/Library/Application Support/Claude/DawnWebGPUCache"

# Delete Chrome AI model and service worker caches (~8GB recovered)
rm -rf \
  "~/Library/Application Support/Google/Chrome/OptGuideOnDeviceModel" \
  "~/Library/Application Support/Google/Chrome/Default/Service Worker" \
  "~/Library/Application Support/Google/Chrome/Profile 1/Service Worker" \
  "~/Library/Application Support/Google/Chrome/Profile 2/Service Worker"

# Delete Library Caches (~4GB recovered)
rm -rf \
  ~/Library/Caches/com.spotify.client \
  ~/Library/Caches/Cypress \
  "~/Library/Caches/@webcatalogdesktop-updater" \
  ~/Library/Caches/com.operasoftware.OperaAir \
  ~/Library/Caches/Homebrew \
  ~/Library/Caches/webcatalog \
  "~/Library/Caches/Sublime Text" \
  ~/Library/Caches/node-gyp \
  ~/Library/Caches/pip
```

**Disk cleanup results 2026-03-24:**

| Item | Before | After | Recovered |
|------|--------|-------|-----------|
| iMazing backups | 24 GB | 101 MB | ~24 GB |
| Claude (vm_bundles + cache) | 10 GB | 221 MB | ~10 GB |
| Chrome (AI model + SW cache) | 9.8 GB | 1.5 GB | ~8 GB |
| Library Caches | 4.4 GB | 575 MB | ~4 GB |
| **Total** | | | **~46 GB** |
| **Disk free** | 135 GB (71%) | 179 GB (34%) | |

---

## HAR Diagnostic Files

Saved under `jmangali-diagnostics/` in each repo. Naming convention:
```
MM.DD.YYYY - <context> - <deployment-url>.har
```

| File | Date | Context | Key Finding |
|------|------|---------|-------------|
| `03.24.2026 - my-jmangali-nextjs-full-app-4g3f.vercel.app.har` | 2026-03-24 | Pre-fix baseline | `/api/chat` returning HTML 500, 26s timeout |
| `03.24.2026 - post commit fc7bed6 - my-jmangali-nextjs-full-app-4g3f.vercel.app.har` | 2026-03-24 | After graceful error handling | Anthropic 500 now visible in chat UI |
| `03.24.2026 - post commit 67e3b1c - my-jmangali-nextjs-full-app-4g3f.vercel.app.har` | 2026-03-24 | After beta flag fix | Anthropic still 500, `/api/shows` MCP error -32601 |
| `03.24.2026 - post statelessfalsechange my-jmangali-nextjs-full-app-.har` | 2026-03-24 | After stateless: false (bad revision) | Anthropic still 500 — image hadn't been rebuilt yet |
| `03.24.2026 - post commitea92d62 my-jmangali-nextjs-full-app-.har` | 2026-03-24 | MCP disabled (isolation test) | Chat works! 200 response but 60s hang — `finalMessage()` issue |

---

## Python Utility Scripts

### Parse HAR file for errors
```python
import json
path = 'path/to/file.har'
with open(path) as f:
    har = json.load(f)

for entry in har['log']['entries']:
    url = entry['request']['url']
    status = entry['response']['status']
    method = entry['request']['method']
    timing = entry['time']
    if status >= 400:
        print(f'{method} {status} {timing:.0f}ms {url}')
        body = entry['response'].get('content', {}).get('text', '')
        if body:
            print(f'  Response: {body[:500]}')
```

### Inspect Excel workbook headers
```python
import openpyxl
wb = openpyxl.load_workbook('file.xlsx', read_only=True, data_only=True)
ws = wb['SheetName']
for i, row in enumerate(ws.iter_rows(min_row=1, max_row=3, values_only=True)):
    print(f'Row {i+1}:', row)
```

---

## Environment Variables Reference

### my-jmangali-nextjs-full-app (Vercel + .env.local)

| Variable | Value | Where set |
|----------|-------|-----------|
| `APP_BASE_URL` | `https://my-jmangali-nextjs-full-app-4g3f.vercel.app` | Vercel (since 2026-03-18) |
| `MCP_SERVER_URL` | `https://jmangali-auth0-mcp-server.gentlesmoke-6c607e25.westus2.azurecontainerapps.io/mcp` | Vercel + `.env.local` |
| `ANTHROPIC_API_KEY` | `<secret>` | Vercel |
| `AUTH0_DOMAIN` | `<secret>` | Vercel + `.env.local` |
| `AUTH0_CLIENT_ID` | `<secret>` | Vercel + `.env.local` |
| `AUTH0_CLIENT_SECRET` | `<secret>` | Vercel + `.env.local` |
| `AUTH0_SECRET` | `<secret>` | Vercel + `.env.local` |
| `AUTH0_AUDIENCE` | `<secret>` | Vercel + `.env.local` |
| `AUTH0_SCOPE` | `<secret>` | Vercel + `.env.local` |

### auth0-fastmcp-fga (Azure Container App)

| Variable | Notes |
|----------|-------|
| `AUTH0_DOMAIN` | Auth0 tenant domain |
| `AUTH0_AUDIENCE` | Must match what Next.js app requests |
| `AUTH0_M2M_CLIENT_ID` | M2M app for Auth0 Management API |
| `AUTH0_M2M_CLIENT_SECRET` | M2M app secret |
| `FGA_STORE_ID` | OpenFGA store ID |
| `FGA_CLIENT_ID` | FGA client credentials |
| `FGA_CLIENT_SECRET` | FGA client secret |
| `PORT` | `3001` |
