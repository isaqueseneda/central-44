@echo off
chcp 65001 >nul
title Central 44 - Atualizacao

cd /d "%~dp0.."

echo ============================================
echo     Central 44 - Atualizando Sistema
echo ============================================
echo.

:: Check Git
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Git nao encontrado!
    pause
    exit /b 1
)

:: Stop any running server on port 3000
echo [1/6] Parando servidor...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 2 /nobreak >nul

:: Run backup before updating
echo [2/6] Fazendo backup antes de atualizar...
call launcher\backup.bat
echo.

:: Pull latest code
echo [3/6] Baixando atualizacoes do GitHub...
git pull origin main
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao baixar atualizacoes!
    echo Verifique sua conexao com a internet.
    pause
    exit /b 1
)

:: Install dependencies (in case they changed)
echo [4/6] Atualizando dependencias...
call npm install

:: Regenerate Prisma client (in case schema changed)
echo [5/6] Atualizando banco de dados...
call npx prisma generate

:: Rebuild
echo [6/6] Recompilando o app...
:: Remove old build to force fresh build
if exist ".next" rmdir /s /q ".next"
call npm run build
if %errorlevel% neq 0 (
    echo [ERRO] Falha na compilacao!
    echo Chame o Isaque para ajudar.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Atualizacao concluida com sucesso!
echo   Iniciando o Central 44...
echo ============================================
echo.
timeout /t 3 /nobreak >nul

:: Restart the app
call launcher\central44.bat
