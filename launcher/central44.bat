@echo off
chcp 65001 >nul
title Central 44

:: Navigate to project root (one level up from launcher/)
cd /d "%~dp0.."

echo ============================================
echo          Central 44 - Iniciando...
echo ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Instale em: https://nodejs.org
    echo Baixe a versao LTS e instale.
    pause
    exit /b 1
)

:: Check Git
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Git nao encontrado!
    echo Instale em: https://git-scm.com
    pause
    exit /b 1
)

:: Check .env
if not exist ".env" (
    echo [ERRO] Arquivo .env nao encontrado!
    echo Copie o arquivo .env.example para .env e preencha as credenciais.
    echo Chame o Isaque para ajudar.
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules" (
    echo [INFO] Instalando dependencias... isso pode demorar uns minutos.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependencias!
        pause
        exit /b 1
    )
)

:: Generate Prisma client if needed
if not exist "node_modules\.prisma\client" (
    echo [INFO] Gerando cliente Prisma...
    call npx prisma generate
)

:: Build if needed
if not exist ".next" (
    echo [INFO] Compilando o app... isso pode demorar uns minutos.
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERRO] Falha na compilacao!
        pause
        exit /b 1
    )
)

:: Kill any existing process on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo [INFO] Parando servidor anterior [PID: %%a]...
    taskkill /PID %%a /F >nul 2>&1
)

:: Run backup on startup (non-blocking)
echo [INFO] Executando backup do banco de dados...
start /b "" cmd /c "call launcher\backup.bat >backups\last-startup-backup.log 2>&1"

:: Start the production server
echo.
echo ============================================
echo   Central 44 esta rodando!
echo   Acesse: http://localhost:3000
echo.
echo   NAO FECHE ESTA JANELA enquanto estiver
echo   usando o sistema.
echo ============================================
echo.

:: Open browser after 3 seconds
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Run the server (this blocks — closing the window stops it)
call npm start
