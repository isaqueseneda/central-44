@echo off
chcp 65001 >nul
title Central 44 - Configuracao Inicial

echo ============================================
echo    Central 44 - Configuracao Inicial
echo ============================================
echo.
echo Este script configura tudo que o Central 44
echo precisa para funcionar neste computador.
echo.
pause

cd /d "%~dp0.."

:: ---- Step 1: Check Node.js ----
echo.
echo [1/8] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Node.js NAO esta instalado!
    echo.
    echo Abra o navegador e instale:
    echo   https://nodejs.org
    echo.
    echo Baixe a versao LTS (botao verde grande).
    echo Instale com todas as opcoes padrao.
    echo Depois, feche e abra este script novamente.
    echo.
    start https://nodejs.org
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%v in ('node --version') do echo   Node.js %%v encontrado.
)

:: ---- Step 2: Check Git ----
echo.
echo [2/8] Verificando Git...
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Git NAO esta instalado!
    echo.
    echo Abra o navegador e instale:
    echo   https://git-scm.com
    echo.
    echo Instale com todas as opcoes padrao.
    echo Depois, feche e abra este script novamente.
    echo.
    start https://git-scm.com
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%v in ('git --version') do echo   %%v encontrado.
)

:: ---- Step 3: Check .env ----
echo.
echo [3/8] Verificando arquivo de configuracao (.env)...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo   Arquivo .env criado a partir do exemplo.
        echo.
        echo   IMPORTANTE: Voce precisa editar o arquivo .env
        echo   com as credenciais corretas (DATABASE_URL, etc).
        echo   Chame o Isaque para ajudar com isso.
        echo.
        notepad ".env"
        pause
    ) else (
        echo [ERRO] Arquivo .env.example nao encontrado!
        pause
        exit /b 1
    )
) else (
    echo   Arquivo .env encontrado.
)

:: ---- Step 4: Install dependencies ----
echo.
echo [4/8] Instalando dependencias (npm install)...
echo   Isso pode demorar alguns minutos na primeira vez...
call npm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias!
    pause
    exit /b 1
)
echo   Dependencias instaladas.

:: ---- Step 5: Generate Prisma client ----
echo.
echo [5/8] Gerando cliente do banco de dados...
call npx prisma generate
echo   Cliente gerado.

:: ---- Step 6: Build the app ----
echo.
echo [6/8] Compilando o aplicativo...
echo   Isso pode demorar alguns minutos...
call npm run build
if %errorlevel% neq 0 (
    echo [ERRO] Falha na compilacao!
    pause
    exit /b 1
)
echo   Aplicativo compilado.

:: ---- Step 7: Create desktop shortcuts ----
echo.
echo [7/8] Criando atalhos na area de trabalho...

:: Get desktop path
set "DESKTOP=%USERPROFILE%\Desktop"

:: Create "Central 44" shortcut
set "SCRIPT_DIR=%~dp0"
set "VBS_PATH=%SCRIPT_DIR%central44.vbs"
set "UPDATE_PATH=%SCRIPT_DIR%update.bat"

:: Create shortcut using PowerShell
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP%\Central 44.lnk'); $s.TargetPath = '%VBS_PATH%'; $s.WorkingDirectory = '%~dp0..'; $s.Description = 'Iniciar Central 44'; $s.Save()"
echo   Atalho "Central 44" criado.

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP%\Atualizar Central 44.lnk'); $s.TargetPath = '%UPDATE_PATH%'; $s.WorkingDirectory = '%~dp0..'; $s.Description = 'Atualizar Central 44 do GitHub'; $s.Save()"
echo   Atalho "Atualizar Central 44" criado.

:: ---- Step 8: Schedule daily backup ----
echo.
echo [8/8] Configurando backup automatico diario...

:: Create a scheduled task for daily backup at 14:00 (2 PM, likely when PC is on)
set "BACKUP_PATH=%SCRIPT_DIR%backup.bat"
schtasks /create /tn "Central44-Backup" /tr "\"%BACKUP_PATH%\"" /sc daily /st 14:00 /f >nul 2>&1
if %errorlevel% equ 0 (
    echo   Backup diario configurado para 14:00.
) else (
    echo   [AVISO] Nao foi possivel criar tarefa agendada.
    echo   O backup sera feito toda vez que o app iniciar.
)

:: ---- Done ----
echo.
echo ============================================
echo   Configuracao concluida com sucesso!
echo.
echo   Atalhos criados na area de trabalho:
echo     - "Central 44" = Abrir o sistema
echo     - "Atualizar Central 44" = Baixar atualizacoes
echo.
echo   O backup do banco e feito automaticamente
echo   todos os dias as 14:00.
echo ============================================
echo.
echo Deseja iniciar o Central 44 agora? (S/N)
set /p "START_NOW="
if /i "%START_NOW%"=="S" (
    call launcher\central44.bat
)
