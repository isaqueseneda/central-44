@echo off
chcp 65001 >nul

cd /d "%~dp0.."

echo [BACKUP] Iniciando backup do banco de dados...

:: Create backups directory if it doesn't exist
if not exist "backups" mkdir backups

:: Generate timestamp using PowerShell (reliable across all Windows versions)
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HH-mm'"`) do set "timestamp=%%I"

:: Fallback: if PowerShell failed, let the Node script generate its own timestamp
if "%timestamp%"=="" (
    echo [BACKUP] Aviso: nao foi possivel gerar timestamp, usando fallback...
    call npx tsx scripts/backup-db.ts
) else (
    call npx tsx scripts/backup-db.ts %timestamp%
)

if %errorlevel% neq 0 (
    echo [BACKUP] ERRO - Backup falhou! Verifique a conexao.
    exit /b 1
)

echo [BACKUP] Backup concluido: %timestamp%

:: Clean up old local backups (keep last 30 days = ~30 files)
forfiles /p "backups" /m "*.sql" /d -30 /c "cmd /c del @file" 2>nul
forfiles /p "backups" /m "*.json" /d -30 /c "cmd /c del @file" 2>nul

exit /b 0
