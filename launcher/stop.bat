@echo off
chcp 65001 >nul
title Central 44 - Parar

echo ============================================
echo     Central 44 - Parando Servidor
echo ============================================
echo.

:: Kill process on port 3000
set "found=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo Parando processo [PID: %%a]...
    taskkill /PID %%a /F >nul 2>&1
    set "found=1"
)

if "%found%"=="0" (
    echo Nenhum servidor rodando na porta 3000.
) else (
    echo Servidor parado com sucesso.
)

echo.
timeout /t 3 /nobreak >nul
