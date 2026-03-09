# Central 44 — Dad's Desktop Deployment Plan

## Reality Check on Previous Plan

The old plan had 6 phases including testing infrastructure, documentation, tech debt cleanup, Electron vs Tauri debate, etc. Most of that is overkill for the actual goal: **give dad a clickable thing on Windows that runs the app, updates it, and backs up the database.**

Here's what actually matters, cut to the bone.

---

## Architecture (What We're Working With)

- **38 API routes** with server-side Prisma queries → the app NEEDS a Node.js server running
- **Database on Neon** (remote PostgreSQL) → no local DB install needed, dad just needs internet
- **Google Drive OAuth** already wired up → we can reuse this for backups
- Production build (`npm run build && npm start`) uses ~60-80% less RAM than `npm run dev`

**Key insight**: This is a web app that happens to run locally. Don't fight that — embrace it. No Electron, no Tauri. Just a smart launcher script that manages the server and opens the browser.

---

## The Plan: 4 Steps

### Step 1: Make the App Production-Ready

Before packaging anything, the app needs to build and run cleanly in production mode.

- [ ] **1.1** Run `npm run build` and fix any build errors
  - Prisma 7 + `force-dynamic` on all API routes should handle most issues
  - Fix any client/server boundary issues that only surface in production builds
- [ ] **1.2** Test `npm start` (production server on port 3000)
  - Verify all pages load, API routes work, PDFs generate, maps render
- [ ] **1.3** Commit all 30+ uncommitted files (clean working tree)
- [ ] **1.4** Ensure `.env` is in `.gitignore` (it should be, but verify)

### Step 2: Create the Windows Launcher (`central44.bat` / `central44.vbs`)

One script that does everything. Dad double-clicks it, the app starts, browser opens.

**File: `launcher/central44.vbs`** (VBScript wrapper to hide the terminal window)
- Runs the .bat file silently (no black CMD window scaring dad)

**File: `launcher/central44.bat`** (the actual logic)
```
1. Check if Node.js is installed → if not, show friendly error message
2. Check if node_modules exists → if not, run `npm install`
3. Check if .next/ build exists → if not, run `npm run build`
4. Kill any existing process on port 3000 (in case of stale server)
5. Run `npm start` in the background
6. Wait 3 seconds, then open http://localhost:3000 in default browser
7. Keep running (closing the window = stopping the server)
```

**File: `launcher/update.bat`** (the "deploy" button)
```
1. Stop the running server (kill port 3000)
2. Run `git pull origin main`
3. Run `npm install` (in case dependencies changed)
4. Run `npx prisma generate` (in case schema changed)
5. Run `npm run build`
6. Start the server again (call central44.bat)
```

**File: `launcher/stop.bat`**
```
1. Kill the process on port 3000
2. Show "Server stopped" message
```

### Step 3: Automated Database Backups

Two backup mechanisms, both handled by a single backup script.

**File: `launcher/backup.bat`**
```
1. Run `pg_dump` against the Neon DATABASE_URL
2. Save to `backups/central44_YYYY-MM-DD_HH-MM.sql` (local)
3. Upload to Google Drive via the existing OAuth integration
4. Delete local backups older than 30 days
5. Log the result to `backups/backup.log`
```

**Implementation options for scheduling:**
- **Option A**: Windows Task Scheduler task (created by a setup script)
  - Run backup daily at 2 AM (or whenever dad's PC is on)
  - Run backup on every Windows startup
- **Option B**: Built into the launcher — backup runs every time the app starts
- **Option C (recommended)**: Both — backup on app start + daily via Task Scheduler

**For Google Drive uploads**, we already have `src/lib/google-auth.ts` with OAuth2. We need to:
- [ ] **3.1** Expand Google Drive scope from `drive.readonly` to `drive.file` (allows creating files)
- [ ] **3.2** Create a `scripts/backup-db.ts` script that:
  - Runs `pg_dump` via child_process
  - Uploads the .sql file to a "Central44-Backups" folder on Drive
  - Can be called from the .bat launcher
- [ ] **3.3** Create a Windows Task Scheduler XML template for daily backups

**Prerequisite**: `pg_dump` needs to be available on dad's machine.
- Easiest: install just the PostgreSQL client tools (not the full server)
- Or: use a Node.js pg_dump alternative (like `node-pg-dump`)
- Or: write a custom backup script that dumps via Prisma queries (slower but zero deps)

### Step 4: First-Time Setup Script

When you're at dad's computer for the first time:

**File: `launcher/setup.bat`**
```
1. Check/install Node.js (or prompt to install)
2. Check/install Git (or prompt to install)
3. Clone the repo (if not already cloned)
4. Copy .env.template to .env and prompt for DATABASE_URL
5. Run `npm install`
6. Run `npx prisma generate`
7. Run `npm run build`
8. Create desktop shortcut to central44.vbs
9. Create desktop shortcut to update.bat (labeled "Atualizar Central 44")
10. Register backup task in Windows Task Scheduler
11. Run initial backup
12. Open the app
```

This is the ONE thing you run manually on dad's machine. After that, he only uses the desktop shortcuts.

---

## What We're NOT Doing (and Why)

| Skipping | Why |
|---|---|
| Electron/Tauri | Massive complexity for zero benefit. The browser IS the UI. |
| Testing infrastructure | Nice to have, not needed for deployment. Do it later. |
| CI/CD pipeline | Dad is the only user. Manual `update.bat` is fine. |
| Tech debt cleanup | The app works. Ship first, clean later. |
| API deduplication | Doesn't affect the user experience at all. |
| Documentation | Dad won't read docs. The launcher IS the docs. |

---

## Implementation Order

```
1. npm run build — fix all build errors          (do now)
2. Commit everything, clean working tree          (do now)
3. Create launcher scripts (bat/vbs)              (do now)
4. Create backup script                           (do now)
5. Create setup script                            (do now)
6. Test on your Mac (adapt paths)                 (do now)
7. Go to dad's computer, run setup.bat            (in person)
8. Test everything works                          (in person)
9. Create desktop shortcuts                       (in person)
```

---

## Files to Create

```
launcher/
  central44.vbs          # Silent launcher (double-click to start)
  central44.bat          # Start server + open browser
  update.bat             # Pull from GitHub + rebuild
  stop.bat               # Stop the server
  backup.bat             # Run database backup
  setup.bat              # First-time setup on dad's machine

scripts/
  backup-db.ts           # Node script: pg_dump + upload to Google Drive

backups/                 # Local backup storage (gitignored)
  .gitkeep
```

---

## Prerequisites on Dad's Machine

1. **Node.js 20+** (LTS) — install from nodejs.org
2. **Git** — install from git-scm.com
3. **PostgreSQL client tools** (for pg_dump) — OR we skip this and do backup via Node.js
4. **Internet connection** (for Neon database access)
5. **`.env` file** with DATABASE_URL and API keys (you'll set this up in person)

---

## Decision Points

1. **pg_dump vs Node.js backup**: pg_dump is faster and more reliable, but requires installing PostgreSQL client tools. A pure Node.js backup (query all tables, export as JSON/SQL) has zero extra deps but is slower and less standard. **Recommendation: pg_dump** — it's a one-time install.

2. **Google Drive backup scope**: Currently `drive.readonly`. Need to change to `drive.file` to upload backups. This means re-authenticating once on dad's machine.

3. **Auto-start on boot?**: Should the app start automatically when Windows boots? Easy to add via Task Scheduler or Startup folder. **Recommendation: yes** — dad won't remember to start it.
