# Central 44 - Windows Launcher

## For Claude Code: Full Setup Instructions

If you're Claude Code running on dad's Windows machine, follow these steps exactly.

### Step 1: Check prerequisites

Run these commands and verify both are installed:
```
node --version
git --version
```

If Node.js is missing, tell the user to install it from https://nodejs.org (LTS version, big green button, all default options during install). Then restart the terminal.

If Git is missing, tell the user to install it from https://git-scm.com (all default options). Then restart the terminal.

### Step 2: Clone the repo (skip if already cloned)

```
cd C:\Users\%USERNAME%\Documents
git clone https://github.com/isaqueseneda/central-44.git
cd central-44
```

### Step 3: Create the .env file

Copy `.env.example` to `.env`:
```
copy .env.example .env
```

Then edit `.env` and fill in these values. Ask the user (Isaque or his dad) for each one:

- `DATABASE_URL` — The Neon PostgreSQL connection string. Looks like: `postgresql://neondb_owner:XXXXX@ep-XXXXX.us-east-1.aws.neon.tech/neondb?sslmode=require`
- `GOOGLE_CLIENT_ID` — From Google Cloud Console (ask Isaque)
- `GOOGLE_CLIENT_SECRET` — From Google Cloud Console (ask Isaque)
- `GOOGLE_PROJECT_ID` — From Google Cloud Console (ask Isaque)
- `GOOGLE_MAPS_API_KEY` — From Google Cloud Console (ask Isaque)
- `OPENROUTER_API_KEY` — From https://openrouter.ai/keys (ask Isaque)
- `TOLLGURU_API_KEY` — Optional, can leave blank

### Step 4: Install dependencies and build

```
npm install
npx prisma generate
npm run build
```

This will take a few minutes. Wait for each command to finish before running the next.

### Step 5: Test that it works

```
npm start
```

Then open http://localhost:3000 in the browser. Verify the app loads and shows data. Stop the server with Ctrl+C.

### Step 6: Create desktop shortcuts

Run this PowerShell command to create the "Central 44" shortcut:
```powershell
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Central 44.lnk'); $s.TargetPath = (Resolve-Path 'launcher\central44.vbs').Path; $s.WorkingDirectory = (Get-Location).Path; $s.Description = 'Iniciar Central 44'; $s.Save()"
```

Run this to create the "Atualizar Central 44" shortcut:
```powershell
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Atualizar Central 44.lnk'); $s.TargetPath = (Resolve-Path 'launcher\update.bat').Path; $s.WorkingDirectory = (Get-Location).Path; $s.Description = 'Atualizar Central 44 do GitHub'; $s.Save()"
```

### Step 7: Schedule daily backups

Register a Windows Task Scheduler task that backs up the database daily at 2 PM:
```
schtasks /create /tn "Central44-Backup" /tr "\"%CD%\launcher\backup.bat\"" /sc daily /st 14:00 /f
```

### Step 8: Enable Google Drive backups

1. Start the app: run `launcher\central44.bat` or double-click the desktop shortcut
2. Open http://localhost:3000/api/google/auth in the browser
3. Sign in with the Google account that should store backups
4. Authorize the app — this only needs to happen once
5. From now on, every backup automatically uploads to a "Central44-Backups" folder on Google Drive

### Done!

Tell the user:
- **To open the app**: Double-click "Central 44" on the desktop
- **To update the app**: Double-click "Atualizar Central 44" on the desktop (Isaque will say when)
- **Backups happen automatically**: On every app startup + daily at 2 PM, saved locally in `backups/` and uploaded to Google Drive

---

## File Reference

| File | Purpose |
|------|---------|
| `central44.bat` | Starts the production server, opens the browser, runs a backup on startup |
| `central44.vbs` | Same as central44.bat but runs the terminal minimized (no scary black window) |
| `update.bat` | Stops server → backs up → `git pull` → `npm install` → rebuild → restart |
| `stop.bat` | Kills the server process on port 3000 |
| `backup.bat` | Triggers `scripts/backup-db.ts` which exports all 17 DB tables as JSON, saves locally, uploads to Google Drive |
| `setup.bat` | Interactive first-time setup wizard (alternative to following the steps above manually) |

## Backup Details

**What gets backed up**: All 17 database tables exported as a single JSON file via Prisma queries against the remote Neon database.

**When**:
- Every time the app starts (non-blocking, runs in background)
- Daily at 2:00 PM via Windows Task Scheduler
- Before every code update (update.bat runs backup first)

**Where**:
- Locally in `backups/central44_backup_YYYY-MM-DD_HH-MM.json` (last 30 days kept, older auto-deleted)
- Google Drive in a folder called "Central44-Backups" (last 30 files kept, older auto-deleted)

**Database architecture**: The primary database is Neon Cloud PostgreSQL (remote). The app connects to it over the internet. Backups are copies/snapshots — they don't replace the primary database. If Neon goes down or data is lost, you can restore from a backup JSON file.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `node` not recognized | Install Node.js LTS from https://nodejs.org, restart terminal |
| `git` not recognized | Install Git from https://git-scm.com, restart terminal |
| `.env` not found | Run `copy .env.example .env` and fill in the credentials |
| Port 3000 already in use | Run `launcher\stop.bat` to kill the old process, then try again |
| Build fails | Delete the `.next` folder (`rmdir /s /q .next`) and run `npm run build` again |
| Google Drive backup fails | Re-authenticate at http://localhost:3000/api/google/auth |
| `npm start` shows errors | Check that `.env` has a valid `DATABASE_URL` and the internet is connected |
| Backup says "0 registros" on all tables | The `DATABASE_URL` in `.env` is wrong or Neon is unreachable |
