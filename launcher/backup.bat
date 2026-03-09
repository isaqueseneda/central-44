@echo off
chcp 65001 >nul

cd /d "%~dp0.."

echo [BACKUP] Iniciando backup do banco de dados...

:: Create backups directory if it doesn't exist
if not exist "backups" mkdir backups

:: Generate timestamp for filename
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
set "timestamp=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%"

:: Run the Node.js backup script
call npx tsx scripts/backup-db.ts %timestamp%

if %errorlevel% neq 0 (
    echo [BACKUP] ERRO - Backup falhou! Verifique a conexao.
    exit /b 1
)

echo [BACKUP] Backup concluido: %timestamp%

:: Clean up old local backups (keep last 30 days = ~30 files)
forfiles /p "backups" /m "*.sql" /d -30 /c "cmd /c del @file" 2>nul
forfiles /p "backups" /m "*.json" /d -30 /c "cmd /c del @file" 2>nul

exit /b 0
