# 🛠 Project Troubleshooting: Corporate & Git Survival Guide

This document summarizes the technical hurdles encountered while setting up an Auth0 Next.js project on a company-managed MacBook with a VPN.

---

### 1. Git & Repository Size Issues
**The Problem:** Fatal disconnect or "Remote end hung up" during `git push` (2.18 GiB).
*   **The Cause:** You accidentally cloned the entire Next.js monorepo history instead of just a starter folder.
*   **The Workaround:** 
    ```bash
    rm -rf .git         # Deletes the massive 2GB history
    git init            # Starts a brand-new, tiny repository
    git branch -M main  # Renames to the modern standard branch
    ```
*   **The Insight:** Deleting the `.git` folder is the "nuclear option" to wipe out bloat that Git can no longer handle over a standard connection.

---

### 2. Authentication & Permissions
**The Problem:** `403 Forbidden` or "Password authentication is not supported."
*   **The Cause:** GitHub stopped accepting account passwords for terminal actions in 2021.
*   **The Workaround:** 
    1. Generate a **Personal Access Token (PAT)** in GitHub Developer Settings.
    2. Use the Token as your "password" when the terminal prompts you.
*   **The Insight:** Tokens are more secure than passwords because they can be scoped (e.g., only allow "repo" access) and revoked easily.

---

### 3. Nested Directory Structure
**The Problem:** "You've added another git repository inside your current repository" or Vercel can't find `package.json`.
*   **The Cause:** Your actual app was buried inside `folder/sample/`, but Git/Vercel expect the app "engine" to be at the front door (the root).
*   **The Workaround:** 
    ```bash
    mv sample/* .       # Pulls files from subfolder to the top
    rm -rf sample       # Deletes the empty shell
    rm -rf .git         # (If nested) Removes the sub-repo "memory"
    ```
*   **The Insight:** Vercel is "blind" to subfolders by default. Your `package.json` **must** be in the top-level directory to trigger a build.

---

### 4. Network & Corporate VPN Conflicts
**The Problem:** `ECONNRESET` or `Error -54` during `npm install`.
*   **The Cause:** Company firewalls often perform "SSL Inspection," which breaks the encrypted handshake between your Mac and the npm registry.
*   **The Workarounds:**
    ```bash
    npm config set strict-ssl false             # Tells npm not to panic over SSL certificates
    npm config set registry http://registry.npmjs.org  # Bypasses HTTPS entirely
    npm config delete proxy                     # Clears old/stale corporate proxy settings
    ```
*   **The Insight:** Switching from `https` to `http` is a common developer "hack" to bypass strict network filters that accidentally kill high-speed data packets.

---

### 5. Package Manager Conflicts
**The Problem:** `yarn install` fails or `E401 Unauthorized`.
*   **The Cause:** `yarn.lock` files from other developers often contain "hard-coded" links to private servers you can't access.
*   **The Workaround:** 
    1. Delete `yarn.lock` and `package-lock.json`.
    2. Run `npm install` (without a lockfile, it defaults to the public registry).
*   **The Insight:** It is best to use **one** package manager per project. Mixing npm and Yarn leads to "version wars" and broken local environments.

---

### 💡 Final Deployment Checklist
1. **Root Check:** Type `ls`. If you don't see `package.json`, move your files up.
2. **Sync Check:** Every time `npm install` works, run `git add package-lock.json && git commit` so Vercel stays in sync.
3. **Secret Check:** Ensure your `.env.local` is in your `.gitignore`. **Never** push your Auth0 Client Secret to GitHub.
